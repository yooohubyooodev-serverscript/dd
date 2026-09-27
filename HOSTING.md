# Deploy บน Render.com (แนะนำ)

Render ฟรี สร้างหลาย Web Service ได้ — เหมาะกับโปรเจกต์นี้

## สถาปัตยกรรม (ภาษาอะไรทำอะไร)

```
[ เบราว์เซอร์ ]
      │  JavaScript (web/app.js)
      │  fetch POST /api/deobf  { "source": "..." }
      ▼
[ Render Web Service ]
      │  Node.js (JavaScript)  ← server.js
      │  เสิร์ฟหน้าเว็บ + รับ API
      ▼
 deob.js → (ถ้ามี) Python + Luau
```

| ส่วน | ภาษา | ไฟล์ |
|------|------|------|
| หน้าเว็บ | HTML + CSS + **JavaScript** | `web/` |
| เซิร์ฟเวอร์ | **Node.js (JavaScript)** | `server.js` |
| Engine เต็ม | Node + Python + Luau | `deob.js`, `core/` |

เว็บส่งคำขอด้วย **JavaScript** → Server ประมวลผลด้วย **Node.js**

---

## วิธีสร้างบน Render (ทีละขั้น)

### แบบ A — เชื่อม GitHub (แนะนำ)

1. Push โค้ดขึ้น GitHub repo  
2. เข้า [https://dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**  
3. เชื่อม GitHub แล้วเลือก repo นี้  
4. ตั้งค่า:
   - **Name:** `yoohubdeobfbyfox` (หรือชื่ออื่น)
   - **Runtime:** Node  
   - **Build Command:** `npm install`  
   - **Start Command:** `node server.js`  
   - **Instance type:** Free  
5. Create Web Service รอ deploy  
6. เปิด URL แบบ `https://yoohubdeobfbyfox.onrender.com`

### แบบ B — อัปโหลด / ใช้ ZIP แล้ว push GitHub เอง

Render ต้องการ Git repo เป็นหลัก — อัป ZIP อย่างเดียวไม่พอ  
อัปโหลด ZIP ไป GitHub แล้วใช้แบบ A

ถ้ามีไฟล์ `render.yaml` ใน repo Render อ่าน blueprint ได้เลย

---

## ตัวแปรที่ Render ใส่ให้อัตโนมัติ

| ตัวแปร | ความหมาย |
|--------|----------|
| `PORT` | พอร์ตที่ต้อง listen (โค้ดอ่านแล้ว) |

ไม่ต้องตั้ง `PORT` เอง — `server.js` ใช้ `process.env.PORT` อยู่แล้ว

---

## ตรวจหลังขึ้น

- หน้าแรก: `https://<ชื่อ>.onrender.com/`  
- Health: `https://<ชื่อ>.onrender.com/api/health`  
  ต้องได้ประมาณ `{ "ok": true, "name": "yoohubdeobfbyfox" }`

---

## ข้อจำกัด Free tier ของ Render

1. **Sleep หลังไม่ใช้งาน ~15 นาที** — ครั้งถัดไปเปิดช้า (cold start 1–2 นาที)  
2. **ไม่มี Luau binary Linux ใน image มาตรฐาน** — โหมดถอดรหัสเต็มอาจยังไม่รันได้จนกว่าจะมี `luau` + Python  
3. สิ่งที่ใช้ได้แน่นอนบน Free Node:
   - หน้าเว็บ UI  
   - ปุ่ม **Detect** (ฝั่งเบราว์เซอร์)  
   - API `/api/health`  
   - API `/api/deobf` จะสำเร็จเมื่อ environment มี Python + `luau`

สำหรับถอดรหัสเต็มบนมือถือ ใช้ Termux ยังเป็นทางที่เสถียรที่สุด:

```bash
node deob.js script.lua
```

---

## API

```http
GET /api/health
POST /api/deobf
Content-Type: application/json
{ "source": "...lua code...", "options": {} }
```

JavaScript บนหน้าเว็บ (มีใน `web/app.js` แล้ว):

```javascript
const res = await fetch('/api/deobf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ source: code }),
});
const data = await res.json();
```
