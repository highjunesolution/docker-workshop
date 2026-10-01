# Workshop 05: Dockerize Node.js Express API

Workshop นี้เราจะนำความรู้เรื่อง Dockerfile จาก Workshop 04 มาใช้กับงาน Backend จริง โดยนำ Express API เข้าไปทำงานภายใน Docker Container

จากเดิมที่รัน Application โดยตรง:

```bash
node server.js
```

เราจะเปลี่ยนเป็น Flow นี้:

```text
Node.js Source Code
        │
        ▼
    Dockerfile
        │
        ▼
   docker build
        │
        ▼
   Docker Image
        │
        ▼
    docker run
        │
        ▼
     Container
        │
        ▼
    Express API
```

เมื่อเรียนจบ Workshop นี้ คุณจะสามารถ:

- Dockerize Node.js Express API ได้
- จัดลำดับ Dockerfile เพื่อใช้ Build Cache ได้อย่างมีประสิทธิภาพ
- อธิบายได้ว่าทำไมไม่ควร Copy `node_modules` จาก Host เข้า Image
- ส่ง Environment Variable เข้า Container ได้
- ตรวจสอบ Logs, Filesystem และ Process ของ Node.js Container ได้
- แก้ Source, Build Image Version ใหม่ และแทนที่ Container เดิมได้

API จะเปิดให้ทดสอบผ่าน URL เช่น:

```text
http://localhost:8080/health
```

---

## 1. โครงสร้าง Project

ภายใน Directory `workshop05-node` มีไฟล์หลักดังนี้:

```text
workshop05-node/
│
├── .dockerignore
├── .env
├── Dockerfile
├── package.json
├── package-lock.json
├── server.js
└── node_modules/
```

| ไฟล์ | หน้าที่ |
| --- | --- |
| `server.js` | Source Code ของ Express API |
| `package.json` | ข้อมูล Project, Script และ Dependencies |
| `package-lock.json` | Lock Version ของ Dependencies |
| `Dockerfile` | Recipe สำหรับสร้าง Docker Image |
| `.dockerignore` | ระบุไฟล์ที่ไม่ต้องส่งเข้า Build Context |
| `.env` | Environment สำหรับการพัฒนาในเครื่อง |

> ไฟล์ `.env` และ `node_modules` ถูกตัดออกจาก Docker Build ผ่าน `.dockerignore`

---

## 2. สำรวจ Express API

ไฟล์ `server.js` เริ่มต้นด้วย:

```javascript
require("dotenv").config();
const express = require("express");

const app = express();
const port = process.env.PORT || 3000;
```

สิ่งที่เกิดขึ้นคือ:

1. โหลด Environment Variable จาก `.env` เมื่อรันในเครื่อง
2. สร้าง Express Application
3. อ่านค่า `PORT` จาก Environment
4. หากไม่มี `PORT` ให้ใช้ Port `3000`

### Request Logger

Application มี Middleware สำหรับบันทึกทุก Request:

```javascript
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});
```

เมื่อมี Request เข้ามา จะเกิด Log ลักษณะนี้:

```text
2026-10-01T10:00:00.000Z GET /health
```

### API Endpoints

Project ปัจจุบันมี Endpoint ดังนี้:

| Method | Path | หน้าที่ |
| --- | --- | --- |
| `GET` | `/` | แสดงข้อความต้อนรับ |
| `GET` | `/health` | แสดงสถานะ Service, Port และ Timestamp |
| `GET` | `/info` | แสดงข้อมูลของ Workshop และ Runtime |

ตัวอย่าง Health Check:

```javascript
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "workshop05-node-api",
    port,
    timestamp: new Date().toISOString(),
  });
});
```

---

## 3. ทำไมต้อง Listen ที่ `0.0.0.0`?

ส่วนท้ายของ `server.js` คือ:

```javascript
app.listen(port, "0.0.0.0", () =>
  console.log(`Server is running on port ${port}`),
);
```

`0.0.0.0` หมายถึง Application รับ Connection ผ่านทุก Network Interface ภายใน Container

แนวคิดนี้แตกต่างจาก Port Mapping:

| การตั้งค่า | หน้าที่ |
| --- | --- |
| `app.listen(port, "0.0.0.0")` | กำหนดว่า Node.js Bind กับ Interface ใดภายใน Container |
| `-p 8080:3000` | กำหนดว่า Docker ส่ง Traffic จาก Host ไปยัง Container อย่างไร |

Flow การเชื่อมต่อ:

```text
Browser
localhost:8080
       │
       ▼
Docker Port Mapping
Host 8080 → Container 3000
       │
       ▼
Node.js Bind ที่ 0.0.0.0:3000
```

---

## 4. ทดสอบ Application ก่อนใช้ Docker

ก่อน Dockerize ควรตรวจสอบว่า Application สามารถทำงานบนเครื่องได้ตามปกติ

เข้า Directory ของ Workshop:

```powershell
cd workshop05-node
```

หากยังไม่ได้ติดตั้ง Dependencies:

```bash
npm install
```

เริ่ม Application:

```bash
npm start
```

Script นี้เรียกคำสั่ง:

```bash
node server.js
```

Terminal ควรแสดงข้อความลักษณะนี้:

```text
Server is running on port 3000
```

หากไม่ได้กำหนด `PORT` อื่นผ่าน `.env` ให้เปิด:

```text
http://localhost:3000
http://localhost:3000/health
http://localhost:3000/info
```

ตัวอย่าง Response จาก `/health`:

```json
{
  "status": "ok",
  "service": "workshop05-node-api",
  "port": 3000,
  "timestamp": "2026-10-01T10:00:00.000Z"
}
```

กด `Ctrl + C` เพื่อหยุด Application

> หาก Application ยังรันบนเครื่องไม่ได้ ควรแก้ปัญหาของ Application ก่อนนำ Docker เข้ามาเพิ่ม เพื่อแยกสาเหตุของปัญหาให้ง่ายขึ้น

---

## 5. `package.json` และ Start Script

ส่วนสำคัญของ `package.json`:

```json
{
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "dotenv": "^18.0.5",
    "express": "^5.2.1"
  }
}
```

เมื่อรัน:

```bash
npm start
```

npm จะเรียก:

```bash
node server.js
```

> ค่า `main` ใน `package.json` ไม่ได้ควบคุม `npm start` เพราะคำสั่งที่ใช้จริงถูกกำหนดไว้ใน `scripts.start`

---

## 6. Dockerfile สำหรับ Node.js

Dockerfile ของ Project:

```dockerfile
FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

ภาพรวมของแต่ละ Instruction:

| Instruction | หน้าที่ |
| --- | --- |
| `FROM node:22` | ใช้ Image ที่มี Node.js 22 และ npm |
| `WORKDIR /app` | กำหนด Working Directory ภายใน Image |
| `COPY package*.json ./` | Copy Package Manifest และ Lock File |
| `RUN npm ci` | ติดตั้ง Dependencies ภายใน Linux Image |
| `COPY . .` | Copy Source Code เข้า Image |
| `EXPOSE 3000` | ระบุว่า API ใช้ Container Port `3000` |
| `CMD ["npm", "start"]` | เริ่ม API เมื่อ Container Start |

---

## 7. `FROM node:22`

Instruction นี้:

```dockerfile
FROM node:22
```

นำ Node.js 22 มาเป็น Base Image ภายในมีทั้ง Node.js และ npm อยู่แล้ว เราจึงไม่ต้องติดตั้ง Node.js ด้วยตัวเอง

```text
node:22
│
├── Linux Filesystem
├── Node.js 22
├── npm
└── Application ของเรา
```

Node.js ภายใน Container ไม่จำเป็นต้องเป็น Version เดียวกับ Node.js บน Windows เพราะ Container ใช้ Version จาก Base Image

> ควร Pin อย่างน้อย Major Version เช่น `node:22` แทน `node:latest` เพื่อป้องกัน Major Version เปลี่ยนโดยไม่ตั้งใจ

---

## 8. `WORKDIR /app`

Instruction นี้:

```dockerfile
WORKDIR /app
```

กำหนดให้ Instruction หลังจากนี้ทำงานภายใน `/app` คล้ายกับการรัน:

```bash
cd /app
```

หาก Directory ยังไม่มี Docker จะสร้างให้โดยอัตโนมัติ

เมื่อ Build เสร็จ โครงสร้างภายใน Image จะเป็นประมาณนี้:

```text
/app/
│
├── node_modules/
├── package.json
├── package-lock.json
└── server.js
```

---

## 9. ทำไมต้อง Copy `package.json` ก่อน?

Dockerfile ใช้ลำดับนี้:

```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
```

ขั้นแรก Docker Copy ไฟล์ต่อไปนี้เข้า `/app`:

```text
package.json
package-lock.json
```

จากนั้น `npm ci` จะติดตั้ง Dependencies:

```text
/app/
│
├── node_modules/
├── package.json
└── package-lock.json
```

สุดท้ายจึง Copy Source Code ที่เหลือ

### ประโยชน์ต่อ Docker Cache

สมมติเราแก้เฉพาะ `server.js` แต่ไม่ได้แก้ Dependencies:

```text
COPY package*.json ./  → CACHED
RUN npm ci             → CACHED
COPY . .               → ทำใหม่
```

Docker ไม่ต้องติดตั้ง Dependencies ใหม่ทุกครั้ง จึง Build ได้เร็วขึ้น

หากเขียนแบบนี้:

```dockerfile
COPY . .
RUN npm ci
```

เมื่อ Source Code ไฟล์ใดก็ตามเปลี่ยน Layer ของ `COPY` จะเปลี่ยน และ `npm ci` ต้องทำงานใหม่ด้วย

> การ Copy Package Manifest ก่อน แล้วจึงติดตั้ง Dependencies เป็น Pattern ที่ใช้จริงใน Node.js Dockerfile

---

## 10. ทำไมไม่ Copy `node_modules` จาก Windows?

`node_modules` บน Host อาจถูกติดตั้งสำหรับ Windows แต่ Container ของเราใช้ Linux

Package บางตัวมี Native Binary ที่ขึ้นอยู่กับ Operating System และ Architecture:

```text
Windows node_modules
        ✕
        │ อาจใช้กับ Linux ไม่ได้
        ▼
Linux Container
```

วิธีที่เหมาะสมคือ:

```text
package.json + package-lock.json
             │
             ▼
        Docker Build
             │
             ▼
     npm ci ภายใน Linux Image
             │
             ▼
       Linux node_modules
```

เราจึงต้องตัด `node_modules` ออกจาก Build Context ด้วย `.dockerignore`

---

## 11. `.dockerignore`

ไฟล์ `.dockerignore` ปัจจุบัน:

```dockerignore
node_modules
Dockerfile
.env
```

รายการเหล่านี้จะไม่ถูก Copy เข้า Image ผ่าน `COPY . .`

| รายการ | เหตุผล |
| --- | --- |
| `node_modules` | ให้ติดตั้งใหม่สำหรับ Linux ด้วย `npm ci` |
| `.env` | ป้องกัน Configuration หรือ Secret ถูกฝังใน Image |
| `Dockerfile` | ไม่จำเป็นต้องอยู่ใน Application Filesystem |

สามารถเพิ่มรายการที่ไม่จำเป็นอื่นได้ เช่น:

```dockerignore
node_modules
npm-debug.log*
.git
.gitignore
.env
README.md
```

> ห้าม Copy Password, API Key, Token หรือ Secret เข้า Docker Image ควรส่งค่าเหล่านี้ตอน Runtime ผ่าน Environment Variable หรือ Secret Management

---

## 12. ทำไมใช้ `npm ci`?

Project นี้มี `package-lock.json` จึงใช้:

```dockerfile
RUN npm ci
```

เปรียบเทียบโดยสรุป:

| คำสั่ง | เหมาะสำหรับ |
| --- | --- |
| `npm install` | การพัฒนาทั่วไปและการแก้ Dependencies |
| `npm ci` | Automated Build, CI และ Docker Build |

`npm ci` ติดตั้ง Dependencies ตาม Lock File และต้องการให้ `package.json` กับ `package-lock.json` สอดคล้องกัน จึงช่วยให้ Build ทำซ้ำได้สม่ำเสมอขึ้น

---

## 13. Build Docker Image

จาก Directory `workshop05-node` ให้รัน:

```bash
docker build -t workshop05-node-api:1.0 .
```

ระหว่าง Build จะเห็นขั้นตอนลักษณะนี้:

```text
FROM node:22
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

ตรวจสอบ Image หลัง Build:

```bash
docker images workshop05-node-api
```

ควรพบ:

```text
REPOSITORY              TAG
workshop05-node-api     1.0
```

---

## 14. Run Container

Node.js ภายใน Container ฟังที่ Port `3000` เราจะ Publish ผ่าน Host Port `8080`:

```bash
docker run -d --name workshop05-api -p 8080:3000 workshop05-node-api:1.0
```

ตรวจสอบ Container:

```bash
docker ps
```

ควรเห็น Mapping:

```text
0.0.0.0:8080->3000/tcp
```

อ่านได้ว่า:

```text
Host Port 8080  →  Container Port 3000
```

> หากมี Container ชื่อ `workshop05-api` อยู่แล้ว ให้ลบด้วย `docker rm -f workshop05-api` ก่อนสร้างใหม่

---

## 15. ทดสอบ API ใน Container

เปิด URL ต่อไปนี้ผ่าน Browser, Postman หรือโปรแกรมที่ใช้ทดสอบ API:

### หน้าแรก

```text
http://localhost:8080
```

ตัวอย่าง Response:

```json
{
  "message": "Hello from docker Node.js API"
}
```

### Health Check

```text
http://localhost:8080/health
```

ตัวอย่าง Response:

```json
{
  "status": "ok",
  "service": "workshop05-node-api",
  "port": 3000,
  "timestamp": "2026-10-01T10:00:00.000Z"
}
```

### Application Info

```text
http://localhost:8080/info
```

ตัวอย่าง Response:

```json
{
  "app": "Docker Workshop",
  "workshop": 5,
  "runtime": "Node.js",
  "environment": "Docker"
}
```

Request Flow:

```text
Browser / Postman
        │
        │ localhost:8080
        ▼
Windows Host
Port 8080
        │
        │ Docker -p
        ▼
Container
Port 3000
        │
        ▼
Node.js
        │
        ▼
Express Route
```

---

## 16. ดู Application Logs

ดู Logs ที่ Application เขียนออกมาทาง `stdout` และ `stderr`:

```bash
docker logs workshop05-api
```

ตอนเริ่ม Container ควรเห็นข้อความลักษณะนี้:

```text
> workshop05-node@1.0.0 start
> node server.js

Server is running on port 3000
```

ติดตาม Logs แบบ Real-time:

```bash
docker logs -f workshop05-api
```

จากนั้นเปิด `http://localhost:8080/health` จะเห็น Request Log:

```text
2026-10-01T10:00:00.000Z GET /health
```

กด `Ctrl + C` เพื่อหยุดติดตาม Logs โดย Container จะยังทำงานต่อไป

---

## 17. แก้ Source และ Build Version ใหม่

ไฟล์ Source ถูก Copy เข้า Image ตอน Build ดังนั้นการแก้ `server.js` บน Host จะไม่ทำให้ Container ที่กำลังทำงานเปลี่ยนทันที

```text
แก้ Source Code
      │
      ▼
Build Image ใหม่
      │
      ▼
ลบ Container เดิม
      │
      ▼
สร้าง Container ใหม่
```

หลังแก้ Source ให้ Build Version `2.0`:

```bash
docker build -t workshop05-node-api:2.0 .
```

สังเกตว่า Docker ควรนำ Layer เหล่านี้จาก Cache กลับมาใช้ หาก Dependencies ไม่เปลี่ยน:

```text
COPY package*.json ./  → CACHED
RUN npm ci             → CACHED
```

ส่วน Layer ที่ Copy Source จะถูกสร้างใหม่:

```text
COPY . .               → ทำใหม่
```

แทนที่ Container เดิม:

```bash
docker rm -f workshop05-api
docker run -d --name workshop05-api -p 8080:3000 workshop05-node-api:2.0
```

---

## 18. เข้าไปสำรวจภายใน Container

เปิด Bash ภายใน Container:

```bash
docker exec -it workshop05-api bash
```

ตรวจสอบ Working Directory:

```bash
pwd
```

ควรได้:

```text
/app
```

ดูไฟล์ภายใน:

```bash
ls
```

ควรพบ:

```text
node_modules
package.json
package-lock.json
server.js
```

ตรวจสอบ Node.js Version:

```bash
node --version
```

จะเห็น Node.js 22 ตาม Base Image ที่กำหนดด้วย `FROM node:22`

ออกจาก Container:

```bash
exit
```

---

## 19. ตรวจสอบ Process

ดู Process ภายใน Container จาก Host:

```bash
docker top workshop05-api
```

จะพบ Process ที่เกี่ยวข้องกับ:

```text
npm start
node server.js
```

Container จะทำงานอยู่ตราบใดที่ Main Process ยังทำงาน เมื่อ Process หลักสิ้นสุด Container จะเปลี่ยนเป็นสถานะ Stopped

```text
docker run
    │
    ▼
CMD ["npm", "start"]
    │
    ▼
npm start
    │
    ▼
node server.js
    │
    ▼
Express listening :3000
```

> Container ไม่ใช่ Virtual Machine ที่เปิดค้างโดยอิสระ แต่ Lifecycle ของมันผูกกับ Process หลัก

---

## 20. ส่ง Environment Variable เข้า Container

Application อ่าน Port จาก:

```javascript
const port = process.env.PORT || 3000;
```

หากไม่ส่ง `PORT` เข้า Container ระบบจะใช้ค่า Default คือ `3000`

ลองเปลี่ยน Port ภายใน Container เป็น `5000`:

```bash
docker rm -f workshop05-api
docker run -d --name workshop05-api -e PORT=5000 -p 8080:5000 workshop05-node-api:2.0
```

Flow การทำงาน:

```text
Environment Variable
PORT=5000
     │
     ▼
Node.js Listen ที่ Container Port 5000
     │
     ▼
Docker Mapping
Host 8080 → Container 5000
```

เปิด:

```text
http://localhost:8080/health
```

Response จะมี Port ลักษณะนี้:

```json
{
  "status": "ok",
  "service": "workshop05-node-api",
  "port": "5000"
}
```

ค่าที่มาจาก Environment Variable จะเป็น String

### `.env` กับ `-e` ต่างกันอย่างไร?

| รูปแบบ | ใช้เมื่อใด |
| --- | --- |
| `.env` + `dotenv` | สะดวกสำหรับ Development บนเครื่อง |
| `docker run -e PORT=5000 ...` | ส่งค่าเข้า Container ตอน Runtime |

เนื่องจาก `.env` อยู่ใน `.dockerignore` มันจะไม่ถูกฝังเข้า Image

---

## 21. `EXPOSE 3000` แต่ใช้ Port `5000` ได้หรือไม่?

ได้ เพราะ:

```dockerfile
EXPOSE 3000
```

เป็น Metadata และ Documentation ของ Image ไม่ได้บังคับให้ Application ต้อง Listen ที่ Port `3000`

เมื่อส่ง:

```bash
-e PORT=5000
```

Node.js จะ Listen ที่ Port `5000` ตาม Environment Variable และเราต้องทำ Port Mapping ให้ตรงกัน:

```bash
-p 8080:5000
```

สิ่งที่กำหนดพฤติกรรมจริงคือ Port ที่ Application Listen อยู่ตอน Runtime

> ในงานจริงควรกำหนด Default Port, `EXPOSE` และ Configuration ให้สอดคล้องกัน เพื่อลดความสับสนของผู้ใช้งาน Image

---

## 22. ขนาดและประเภทของ Node.js Image

Workshop นี้ใช้:

```dockerfile
FROM node:22
```

ตรวจสอบขนาด Image:

```bash
docker images workshop05-node-api
```

ในอนาคตอาจพบ Base Image รูปแบบอื่น:

| Image | ลักษณะทั่วไป |
| --- | --- |
| `node:22` | เครื่องมือค่อนข้างครบ เหมาะกับการเรียนและ Debug |
| `node:22-slim` | ขนาดเล็กลง แต่มีเครื่องมือน้อยกว่า |
| `node:22-alpine` | มีขนาดเล็กมาก แต่มี Trade-off กับ Native Dependencies และการ Debug |

ยังไม่จำเป็นต้องเปลี่ยนเป็น Alpine ทันที ควรเลือก Image ตามความต้องการของ Application และทดสอบ Compatibility เสมอ

---

## สรุป Architecture

```text
Windows Host
│
│ Browser / Postman
│ http://localhost:8080
│
▼
Docker Port Mapping
Host 8080 → Container 3000
│
▼
Container
│
├── Linux Filesystem
├── Node.js 22
├── /app
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/
│
└── Express
    └── Listen ที่ 0.0.0.0:3000
```

Dockerfile ที่ใช้:

```dockerfile
FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### คำสั่งสำคัญ

| คำสั่ง | ใช้สำหรับ |
| --- | --- |
| `npm start` | ทดสอบ API บน Host |
| `docker build -t workshop05-node-api:1.0 .` | Build Image |
| `docker run -d --name workshop05-api -p 8080:3000 ...` | สร้างและรัน Container |
| `docker logs -f workshop05-api` | ติดตาม Application Logs |
| `docker exec -it workshop05-api bash` | เข้าไปสำรวจ Container |
| `docker top workshop05-api` | ดู Process ภายใน Container |
| `docker rm -f workshop05-api` | ลบ Container |

---

## Mini Challenge 05

เพิ่ม Endpoint ใหม่:

```text
GET /api/info
```

ให้ Response เป็น:

```json
{
  "app": "Docker Workshop",
  "workshop": 5,
  "runtime": "Node.js",
  "environment": "Docker"
}
```

### Requirements

1. เพิ่ม Route `/api/info` ใน `server.js`
2. Build Image เป็น Version `3.0`
3. ลบ Container เก่า
4. สร้าง Container ใหม่จาก Version `3.0`
5. Map Host Port `9090` ไปยัง Container Port `3000`
6. ทดสอบ `/api/info`
7. ตรวจสอบ Logs
8. เข้า Container ด้วย `docker exec`
9. ตรวจสอบ Node.js Version
10. ตรวจสอบไฟล์ภายใน `/app`
11. ลบ Container เมื่อทำเสร็จ

<details>
<summary>ดูเฉลย</summary>

เพิ่ม Route ใน `server.js`:

```javascript
app.get("/api/info", (req, res) => {
  res.json({
    app: "Docker Workshop",
    workshop: 5,
    runtime: "Node.js",
    environment: "Docker",
  });
});
```

Build Image Version ใหม่:

```bash
docker build -t workshop05-node-api:3.0 .
```

แทนที่ Container:

```bash
docker rm -f workshop05-api
docker run -d --name workshop05-api -p 9090:3000 workshop05-node-api:3.0
```

เปิด API:

```text
http://localhost:9090/api/info
```

ตรวจสอบ Logs และ Container:

```bash
docker logs workshop05-api
docker exec -it workshop05-api bash
```

เมื่ออยู่ภายใน Container:

```bash
node --version
pwd
ls
exit
```

ลบ Container เมื่อทดลองเสร็จ:

```bash
docker rm -f workshop05-api
```

</details>

---

## เส้นทางการเรียนรู้

```text
Workshop 01  Image / Container
      │
      ▼
Workshop 02  Logs / Exec / Inspect
      │
      ▼
Workshop 03  Port Mapping
      │
      ▼
Workshop 04  Dockerfile
      │
      ▼
Workshop 05  Dockerize Node.js API
      │
      ▼
Workshop 06  Docker Network
```

ใน Workshop 06 เราจะสร้าง `users-api` และ `orders-api` แยกกัน แล้วให้ Container ติดต่อกันผ่าน Docker Network โดยใช้ชื่อ Service แทน `localhost`
