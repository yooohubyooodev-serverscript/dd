# Yoohub Deobf by Fox

**Luraph v15 Deobfuscator** — สำหรับรันบน **Termux / เทอร์มินัลมือถือ**, Linux, Windows หรือเตรียมต่อเป็นเว็บ

ฟอร์ก / ปรับจาก [caomod2077/Deobfuscator-Luraph-V15](https://github.com/caomod2077/Deobfuscator-Luraph-V15) (MIT)

---

## เป้าหมายหลัก

| โหมด | สถานะ | วิธีใช้ |
|------|--------|---------|
| **Termux / เทอร์มินัลมือถือ** | รองรับ | `node deob.js script.lua` |
| **Linux / macOS terminal** | รองรับ | เหมือนกัน |
| **Windows** | รองรับ | มี `bin/luau.exe` ใน repo |
| **เว็บ (Web UI)** | พร้อม | `web/` + `node server.js` / GitHub Pages |

---

## ความต้องการ

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Luau CLI** (`luau`)
  - Windows: มีใน `bin/` แล้ว
  - Termux: `pkg install luau` (ถ้ามีใน repo) หรือ build จาก source
  - Linux: ติดตั้งจาก distro หรือ binary จาก [luau-lang/luau releases](https://github.com/luau-lang/luau/releases)

---

## ติดตั้งบน Termux (มือถือ)

```bash
# 1. ติดตั้งเครื่องมือพื้นฐาน
pkg update -y
pkg install -y git nodejs python curl

# 2. โคลน repo นี้ (หลัง push แล้ว)
git clone https://github.com/yooohubyooodev-serverscript/yoohubdeobfbyfox.git
cd yoohubdeobfbyfox

# 3. รันตัวช่วยติดตั้ง
bash install-termux.sh

# หรือทำเอง:
npm install
# ติดตั้ง luau (ถ้ามี package)
pkg install luau   # หรือ build เอง
```

---

## ติดตั้งบน Linux / PC

```bash
git clone https://github.com/yooohubyooodev-serverscript/yoohubdeobfbyfox.git
cd yoohubdeobfbyfox
npm install

# ใส่ luau ใน PATH หรือคัดลอกไป bin/
```

---

## คำสั่งใช้งาน (CLI)

```bash
# Deobfuscate ไฟล์เดียว → บันทึกที่ ./output/<ชื่อไฟล์>
node deob.js input.lua

# กำหนด path ผลลัพธ์
node deob.js input.lua -o output.lua

# โฟลเดอร์ทั้งก้อน / หลายไฟล์
node deob.js ./scripts/
node deob.js a.lua b.lua c.lua

# โหมดเร็ว (trace อย่างเดียว ~1–3 วินาที ไม่ lift bytecode เต็ม)
node deob.js input.lua --no-devirt

# ตรวจว่าเป็น Luraph หรือไม่ (ไม่รัน deobf)
node deob.js input.lua --detect

# Debug เก็บไฟล์กลาง
node deob.js input.lua --debug
```

### ตัวเลือกเพิ่มเติม

| Option | คำอธิบาย |
|--------|----------|
| `-o`, `--output <file>` | path ผลลัพธ์ |
| `--no-devirt` | trace เร็ว ไม่ full lift |
| `--detect` | ตรวจ obfuscator แล้วออก |
| `--timeout <sec>` | timeout ต่อ pass (ค่าเริ่ม 90) |
| `--budget <sec>` | soft budget (ค่าเริ่ม 30) |
| `--max-runs <n>` | จำนวน rerun กัน anti-tamper (12) |
| `--devirt-rounds` | รอบ decrypt constant (200) |
| `--debug` | เก็บ intermediate files |

ถ้า Python ไม่ใช่ `python3` / `python`:

```bash
export PYTHON_BIN=python3   # Linux / Termux
# หรือ
set PYTHON_BIN=py           # Windows
```

---

## โครงสร้างโปรเจกต์

```
yoohubdeobfbyfox/
├── deob.js              # จุดเข้า CLI หลัก
├── fetch.js
├── package.json
├── install-termux.sh    # ตัวช่วยติดตั้งบน Termux
├── server.js            # เว็บ + API ท้องถิ่น
├── web/                 # HTML/CSS/JS หน้าเว็บ
├── index.html           # redirect → web/
├── bin/                 # luau.exe (Windows) / วาง luau Linux ที่นี่ได้
├── src/                 # Node: driver, harness, vmmap, detect…
├── core/                # Python symbolic engine + luraph_v15
├── runtime/             # envlog.luau, roblox_api.luau, …
├── sample/              # สคริปต์ตัวอย่าง
├── README.md
└── TECHNICAL.md
```

---

## Overview (จากต้นทาง)

Luraph v15 แปลงสคริปต์ Luau เป็น VM (flattened dispatch, `LPH_ENCSTR` / `LPH_ENCFUNC`, `LPH_CRASH()`).

เครื่องมือนี้ทำ reverse compiler:

1. AST analysis & hooking  
2. Sandboxed simulation (offline Roblox-like env)  
3. Live constant decryption  
4. CFG / loop reconstruction  
5. Polish & variable naming  

รายละเอียดลึกดูที่ [TECHNICAL.md](TECHNICAL.md)

---



---

## หน้าเว็บ (GitHub Pages / Local)

มี UI อยู่ที่โฟลเดอร์ `web/`

### เปิดบน GitHub Pages
1. Settings → Pages → Deploy from branch `main` / folder `/ (root)` หรือ `/docs`
2. เปิด `https://yooohubyooodev-serverscript.github.io/yoohubdeobfbyfox/` (หรือ path ตามที่ตั้ง)
3. บน Pages ใช้ได้ **Detect** (ตรวจว่าเป็น Luraph หรือไม่)
4. **ถอดรหัสเต็ม** ต้องใช้ Termux หรือรันเซิร์ฟเวอร์ด้านล่าง

### รันเว็บ + API บนเครื่อง / VPS / Termux

```bash
npm install
node server.js
# เปิด http://localhost:3847
```

- UI: `/`
- Health: `GET /api/health`
- Deobf: `POST /api/deobf` body `{ "source": "..." }`


## License

MIT — ดู [LICENSE](LICENSE)  
ต้นทาง: caomod2077 / Deobfuscator-Luraph-V15  
ปรับสำหรับ Yoohub / Termux โดย yoohubdeobfbyfox
