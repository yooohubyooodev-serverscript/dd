(function () {
  'use strict';

  const LURAPH_HEADER = /This file was protected using Luraph Obfuscator v(\d+)(?:\.(\d+))?/;
  const LURAPH_VM_SHAPE = /\[\d+\]=(bit32|buffer|string|table|math)\.\w+/;

  function detectLuraph(source) {
    const head500 = source.slice(0, 500);
    const m = LURAPH_HEADER.exec(head500);
    if (m) {
      return {
        name: 'luraph_v' + m[1] + (m[2] ? '.' + m[2] : ''),
        label: 'Luraph v' + m[1] + (m[2] ? '.' + m[2] : ''),
        confidence: m[1] === '15' ? 1.0 : 0.35,
        version: m[1],
      };
    }
    const head2k = source.trimStart().slice(0, 2000);
    if (
      head2k.startsWith('return setmetatable({') &&
      (LURAPH_VM_SHAPE.test(head2k) || source.slice(0, 200000).includes('LPH'))
    ) {
      return { name: 'luraph_v15', label: 'Luraph v15 (shape)', confidence: 0.8, version: '15' };
    }
    return { name: 'unknown', label: 'ไม่พบลายเซ็น Luraph ที่ชัดเจน', confidence: 0, version: null };
  }

  const $ = (id) => document.getElementById(id);
  const sourceEl = $('source');
  const statusEl = $('status');
  const resultEl = $('result');
  const btnDetect = $('btnDetect');
  const btnDeobf = $('btnDeobf');
  const btnCopy = $('btnCopy');
  const btnDownload = $('btnDownload');
  const btnClear = $('btnClear');
  const fileInput = $('fileInput');

  let lastOutput = '';

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'status ' + (kind || 'idle');
  }

  function setResult(text, isEmpty) {
    lastOutput = text || '';
    resultEl.textContent = text || '—';
    resultEl.classList.toggle('empty', !!isEmpty || !text);
    btnCopy.disabled = !text;
    btnDownload.disabled = !text;
  }

  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      sourceEl.value = String(reader.result || '');
      setStatus('โหลดไฟล์: ' + f.name, 'ok');
    };
    reader.readAsText(f);
  });

  btnClear.addEventListener('click', () => {
    sourceEl.value = '';
    fileInput.value = '';
    setResult('', true);
    setStatus('ล้างแล้ว', 'idle');
  });

  btnDetect.addEventListener('click', () => {
    const src = sourceEl.value;
    if (!src.trim()) {
      setStatus('ยังไม่มีโค้ด — วางหรืออัปโหลดไฟล์ก่อน', 'err');
      return;
    }
    const d = detectLuraph(src);
    const pct = Math.round(d.confidence * 100);
    const lines = [
      'ผลการตรวจจับ (ฝั่งเบราว์เซอร์)',
      '────────────────────────',
      'ประเภท: ' + d.label,
      'ความมั่นใจ: ' + pct + '%',
      'ความยาวโค้ด: ' + src.length.toLocaleString() + ' ตัวอักษร',
      '',
      d.confidence >= 0.5
        ? '→ น่าจะเป็น Luraph — ใช้ Termux หรือ Local API เพื่อถอดรหัสเต็ม'
        : '→ ไม่มั่นใจว่าเป็น Luraph v15 — อาจเป็น obfuscator อื่น',
      '',
      'คำสั่งบน Termux:',
      '  node deob.js yourfile.lua',
      '  node deob.js yourfile.lua --detect',
    ];
    setResult(lines.join('\n'), false);
    setStatus(d.confidence >= 0.5 ? 'ตรวจพบ: ' + d.label : 'ไม่พบลายเซ็นชัดเจน', d.confidence >= 0.5 ? 'ok' : 'err');
  });

  btnDeobf.addEventListener('click', async () => {
    const src = sourceEl.value;
    if (!src.trim()) {
      setStatus('ยังไม่มีโค้ด', 'err');
      return;
    }
    setStatus('กำลังส่งไป Local API...', 'run');
    setResult('รอผลจากเซิร์ฟเวอร์...', false);
    try {
      const res = await fetch('/api/deobf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: src, options: {} }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || ('HTTP ' + res.status));
      }
      setResult(data.output || data.result || JSON.stringify(data, null, 2), false);
      setStatus('ถอดรหัสสำเร็จ', 'ok');
    } catch (e) {
      const raw = String(e.message || e);
      const isNetwork = /Failed to fetch|NetworkError|load failed|ECONNREFUSED/i.test(raw);
      let msg;
      if (isNetwork) {
        msg =
          'เรียก API ไม่สำเร็จ (เครือข่าย): ' + raw + '\n\n' +
          'ตรวจว่า server ตื่นอยู่ที่ /api/health\n' +
          'หรือใช้ Termux: node deob.js file.lua';
        setStatus('เชื่อมต่อ API ไม่ได้', 'err');
      } else {
        msg =
          'Server ประมวลผลไม่สำเร็จ:\n' + raw + '\n\n' +
          'ถ้า error เกี่ยวกับ luau / luau-ast / Python:\n' +
          '  - บน Render ต้องมี binary Linux ใน bin/ (build จะดาวน์โหลดให้อัตโนมัติ)\n' +
          '  - หรือใช้ Termux: node deob.js file.lua';
        setStatus('Engine error จาก server', 'err');
      }
      setResult(msg, false);
    }
  });

  btnCopy.addEventListener('click', async () => {
    if (!lastOutput) return;
    try {
      await navigator.clipboard.writeText(lastOutput);
      setStatus('คัดลอกแล้ว', 'ok');
    } catch {
      setStatus('คัดลอกไม่สำเร็จ', 'err');
    }
  });

  btnDownload.addEventListener('click', () => {
    if (!lastOutput) return;
    const blob = new Blob([lastOutput], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'deobfuscated.lua';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ตรวจว่ามี API หรือไม่ (เมื่อเปิดผ่าน server.js)
  fetch('/api/health')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d && d.ok) {
        setStatus('เชื่อมต่อ Local API ได้ — พร้อมถอดรหัสเต็ม', 'ok');
        const hint = document.getElementById('apiHint');
        if (hint) hint.textContent = 'Local API พร้อมใช้งานที่เครื่องนี้';
      }
    })
    .catch(() => {});
})();
