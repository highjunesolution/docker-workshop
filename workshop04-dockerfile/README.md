# Workshop 04: Dockerfile — สร้าง Image ของเราเอง

ที่ผ่านมาเราใช้ Image ที่ผู้อื่นเตรียมไว้ให้ เช่น:

```bash
docker run nginx
```

แต่เมื่อต้อง Deploy Application ของเราเอง เช่น Node.js หรือ ASP.NET Core เราต้องสร้าง Docker Image จาก Source Code ของเรา

Workshop นี้จะพาเรียนรู้ Flow ต่อไปนี้:

```text
Source Code
     +
Dockerfile
     │
     ▼
docker build
     │
     ▼
Image
     │
     ▼
docker run
     │
     ▼
Container
```

เมื่อเรียนจบ Workshop นี้ คุณจะสามารถ:

- อธิบายหน้าที่ของ `FROM`, `WORKDIR`, `COPY`, `RUN`, `EXPOSE` และ `CMD` ได้
- สร้าง Image ด้วย `docker build` ได้
- เข้าใจความหมายของ Build Context และ Image Layer
- อธิบายความแตกต่างระหว่าง Build time และ Run time ได้
- สร้าง Image Version ใหม่เมื่อ Source Code เปลี่ยนแปลงได้

---

## 1. โครงสร้าง Project

ภายใน Directory `workshop04-dockerfile` มีไฟล์ดังนี้:

```text
workshop04-dockerfile/
│
├── Dockerfile
├── index.html
└── README.md
```

ไฟล์ `index.html` คือหน้าเว็บไซต์ของเรา ส่วน `Dockerfile` คือ Recipe ที่ใช้สร้าง Image

> ชื่อไฟล์ต้องเป็น `Dockerfile` โดยไม่มีนามสกุล ไม่ใช่ `Dockerfile.txt`

---

## 2. สำรวจ `index.html`

ไฟล์ `index.html` มีโครงสร้างหน้าเว็บลักษณะนี้:

```html
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
  </head>
  <body>
    <h1>version 2</h1>
    <p>Workshop 04 - Dockerfile</p>
  </body>
</html>
```

ตอนนี้เรามีหน้าเว็บแล้ว แต่ยังต้องมี Web Server สำหรับให้ Browser เข้าถึง ซึ่งเราจะใช้ Nginx เป็น Base Image

---

## 3. สำรวจ `Dockerfile`

Dockerfile ที่ให้มาใน Workshop นี้:

```dockerfile
FROM nginx:latest

RUN apt-get update

WORKDIR /usr/share/nginx/html

COPY index.html .

EXPOSE 80
```

แต่ละบรรทัดเป็น Instruction สำหรับสร้าง Image:

| Instruction | หน้าที่ |
| --- | --- |
| `FROM nginx:latest` | ใช้ Nginx เป็น Base Image |
| `RUN apt-get update` | รันคำสั่งระหว่าง Build เพื่อสาธิต `RUN` |
| `WORKDIR /usr/share/nginx/html` | กำหนด Working Directory ภายใน Image |
| `COPY index.html .` | คัดลอกหน้าเว็บไปยัง Working Directory |
| `EXPOSE 80` | ระบุว่า Application ภายใน Image ใช้ Port `80` |

> `RUN apt-get update` ใน Workshop นี้มีไว้เพื่อสาธิต Build-time เท่านั้น ไม่จำเป็นสำหรับการให้บริการไฟล์ด้วย Nginx และไม่ได้ติดตั้ง Package เพิ่ม

---

## 4. `FROM` — เลือก Base Image

Instruction แรกคือ:

```dockerfile
FROM nginx:latest
```

หมายความว่าเรานำ `nginx:latest` มาเป็น Base Image แล้วเพิ่มไฟล์ของเราลงไป:

```text
nginx:latest
│
│ มี Linux และ Nginx อยู่แล้ว
│
└── Image ของเรา
      │
      └── เพิ่ม index.html
```

เราไม่จำเป็นต้องสร้าง Linux และติดตั้ง Nginx ตั้งแต่ศูนย์ แต่ต่อยอดจาก Image ที่เตรียมไว้แล้ว

ตัวอย่าง Base Image สำหรับ Technology อื่น:

```dockerfile
# Node.js
FROM node:22

# ASP.NET Core
FROM mcr.microsoft.com/dotnet/aspnet:10.0

# Python
FROM python:3.13
```

> ใน Production ควรเลือก Version หรือ Digest ที่เหมาะสม แทนการพึ่ง `latest` ซึ่งสามารถเปลี่ยนแปลงได้

---

## 5. `WORKDIR` — กำหนด Working Directory

Instruction นี้กำหนด Directory หลักภายใน Image:

```dockerfile
WORKDIR /usr/share/nginx/html
```

Instruction ที่ตามมาจะอ้างอิง Directory นี้เป็นตำแหน่งปัจจุบัน

ตัวอย่าง:

```dockerfile
WORKDIR /app
COPY hello.txt .
```

จุด `.` ในตำแหน่งปลายทางหมายถึง Current Working Directory ผลลัพธ์จึงเป็น:

```text
/app/hello.txt
```

สำหรับ Node.js เรามักพบรูปแบบนี้:

```dockerfile
WORKDIR /app

COPY package.json .
RUN npm install

COPY . .
```

---

## 6. `COPY` — นำไฟล์เข้า Image

Instruction ใน Workshop นี้คือ:

```dockerfile
COPY index.html .
```

เนื่องจาก `WORKDIR` ถูกกำหนดเป็น `/usr/share/nginx/html` ผลลัพธ์จึงเทียบเท่ากับ:

```dockerfile
COPY index.html /usr/share/nginx/html/index.html
```

Flow การคัดลอกไฟล์:

```text
เครื่อง Host
index.html
     │
     │ COPY
     ▼
Docker Image
/usr/share/nginx/html/index.html
```

Syntax ของ `COPY` คือ:

```text
COPY SOURCE DESTINATION
```

ตัวอย่างเพิ่มเติม:

```dockerfile
COPY index.html /app/index.html
COPY . /app
```

จุด `.` ในตำแหน่ง Source หมายถึงไฟล์ทั้งหมดที่ Docker สามารถเข้าถึงได้จาก Build Context

---

## 7. `RUN` — รันคำสั่งตอน Build

Dockerfile ปัจจุบันมี:

```dockerfile
RUN apt-get update
```

`RUN` ใช้รันคำสั่งขณะที่ Docker กำลังสร้าง Image:

```text
Dockerfile
    │
    │ RUN ...
    ▼
docker build
    │
    ▼
Image Layer ใหม่
```

ตัวอย่างการใช้งานใน Node.js:

```dockerfile
RUN npm install
```

คำสั่งนี้ติดตั้ง Dependencies ลงใน Image ตอน Build ไม่ได้รันใหม่ทุกครั้งที่ Container Start

### `RUN` กับ `docker run` ไม่เหมือนกัน

| คำสั่ง | ทำงานเมื่อใด | หน้าที่ |
| --- | --- | --- |
| `RUN npm install` | ตอน `docker build` | สร้าง Layer ภายใน Image |
| `docker run nginx` | หลังสร้าง Image แล้ว | สร้างและเริ่ม Container |

ชื่อคล้ายกัน แต่เป็นคนละส่วนของ Lifecycle

---

## 8. `EXPOSE` — ระบุ Port ของ Application

Instruction นี้:

```dockerfile
EXPOSE 80
```

เป็น Metadata ที่บอกว่า Application ภายใน Image ตั้งใจใช้ Port `80`

`EXPOSE` ไม่ได้ Publish Port ของ Host ให้อัตโนมัติ ดังนั้น:

```bash
docker run workshop04-web:1.0
```

จะยังไม่ทำให้ Browser บน Host เข้าถึง Nginx ได้ เราต้องใช้ `-p` ตอนสร้าง Container:

```bash
docker run -p 8080:80 workshop04-web:1.0
```

จำไว้ว่า:

```text
EXPOSE  ≠  -p
```

| รูปแบบ | ความหมาย |
| --- | --- |
| `EXPOSE 80` | Image ระบุว่า Application ใช้ Container Port `80` |
| `-p 8080:80` | เชื่อม Host Port `8080` ไปยัง Container Port `80` |

---

## 9. Build Image

เปิด Terminal ที่ Root ของ Repository แล้วเข้า Directory ของ Workshop:

```powershell
cd workshop04-dockerfile
```

ตรวจสอบว่ามีไฟล์ที่ต้องใช้:

```powershell
Get-ChildItem
```

ควรพบอย่างน้อย:

```text
Dockerfile
index.html
```

จากนั้น Build Image:

```bash
docker build -t workshop04-web:1.0 .
```

แยกส่วนประกอบของคำสั่งได้ดังนี้:

| ส่วนประกอบ | ความหมาย |
| --- | --- |
| `docker build` | สร้าง Image จาก Dockerfile |
| `-t` | กำหนดชื่อและ Tag ให้ Image |
| `workshop04-web` | ชื่อ Image |
| `1.0` | Tag หรือ Version |
| `.` | ใช้ Directory ปัจจุบันเป็น Build Context |

อ่านคำสั่งนี้ได้ว่า:

> สร้าง Image จาก Directory ปัจจุบัน แล้วตั้งชื่อว่า `workshop04-web` Version `1.0`

> จุด `.` ท้ายคำสั่งสำคัญมาก เพราะเป็นการระบุ Build Context

---

## 10. Build Context คืออะไร?

ในคำสั่งนี้:

```bash
docker build -t workshop04-web:1.0 .
```

จุด `.` หมายถึงส่ง Directory ปัจจุบันให้ Docker Builder เป็น Build Context

สมมติมีโครงสร้าง:

```text
workshop04-dockerfile/
│
├── Dockerfile
├── index.html
├── notes.txt
└── image.png
```

เมื่อใช้ `docker build .` ไฟล์เหล่านี้จะอยู่ในขอบเขตที่ Dockerfile สามารถอ้างถึงได้

Dockerfile จึงใช้คำสั่งนี้ได้:

```dockerfile
COPY index.html .
```

แต่หากไฟล์อยู่นอก Build Context:

```text
docker-workshop/
│
├── secret.txt              ← อยู่นอก Build Context
│
└── workshop04-dockerfile/  ← Build จาก Directory นี้
    ├── Dockerfile
    └── index.html
```

Dockerfile จะไม่สามารถใช้ `COPY ../secret.txt ...` เพื่อเข้าถึงไฟล์นอก Build Context ได้

---

## 11. ตรวจสอบ Image

หลังจาก Build สำเร็จ ตรวจสอบ Image ด้วย:

```bash
docker images
```

ควรพบ:

```text
REPOSITORY       TAG
workshop04-web   1.0
```

ตอนนี้เรามี Image ของตัวเองแล้ว:

```text
workshop04-web:1.0
│
├── Linux Filesystem จาก Base Image
├── Nginx
└── index.html ของเรา
```

---

## 12. Run Image ของเรา

สร้าง Container จาก Image ที่เพิ่ง Build:

```bash
docker run -d --name workshop04 -p 8080:80 workshop04-web:1.0
```

ตรวจสอบว่า Container กำลังทำงาน:

```bash
docker ps
```

ควรเห็น Port Mapping:

```text
0.0.0.0:8080->80/tcp
```

เปิด Browser ที่:

```text
http://localhost:8080
```

Browser ควรแสดงเนื้อหาจาก `index.html`

นี่คือครั้งแรกที่เราทำ Flow ครบทั้งหมด:

```text
เขียน Source Code
       │
       ▼
สร้าง Image
       │
       ▼
สร้าง Container
       │
       ▼
เปิดใช้งานผ่าน Browser
```

---

## 13. แก้ Source แล้ว Container ไม่เปลี่ยน

ลองแก้ข้อความใน `index.html` เช่น:

```html
<h1>Docker Workshop Version 2</h1>
```

จากนั้น Refresh Browser โดยยังไม่ Build ใหม่ จะพบว่า Container ยังคงแสดงเนื้อหาเดิม

สาเหตุคือไฟล์ถูก Copy เข้า Image ตั้งแต่ตอน Build:

```text
index.html บน Host
       │
       │ docker build
       ▼
Image
       │
       │ docker run
       ▼
Container
```

การแก้ไฟล์บน Host จึงไม่ได้แก้ไฟล์ที่อยู่ใน Image หรือ Container ที่กำลังทำงาน

> **แนวคิดสำคัญ:** Source Code เปลี่ยน ไม่ได้หมายความว่า Image และ Container จะเปลี่ยนตาม

---

## 14. Build Image Version ใหม่

หลังจากแก้ `index.html` แล้ว ให้ Build Image ด้วย Tag ใหม่:

```bash
docker build -t workshop04-web:2.0 .
```

ตรวจสอบ Image:

```bash
docker images
```

จะพบทั้งสอง Version:

```text
REPOSITORY       TAG
workshop04-web   2.0
workshop04-web   1.0
```

Container ชื่อ `workshop04` ยังคงใช้ Image `workshop04-web:1.0` จึงต้องลบ Container เดิม:

```bash
docker rm -f workshop04
```

แล้วสร้าง Container ใหม่จาก Version `2.0`:

```bash
docker run -d --name workshop04 -p 8080:80 workshop04-web:2.0
```

Refresh `http://localhost:8080` แล้ว Browser จะแสดงเนื้อหา Version ใหม่

Lifecycle ที่ควรจำ:

```text
Source เปลี่ยน
     │
     ▼
Build Image ใหม่
     │
     ▼
สร้าง Container ใหม่
     │
     ▼
Deploy Version ใหม่
```

---

## 15. `CMD` — คำสั่งเมื่อ Container เริ่มทำงาน

Base Image ของ Nginx มี Command เริ่มต้นอยู่แล้ว จึงไม่จำเป็นต้องเขียน `CMD` ซ้ำใน Dockerfile ของ Workshop นี้

เมื่อดูด้วย `docker inspect` จะพบค่าลักษณะนี้:

```json
"Cmd": [
  "nginx",
  "-g",
  "daemon off;"
]
```

Command นี้ทำงานเมื่อ Container Start:

```text
Image
  │
  │ docker run
  ▼
Container
  │
  └── CMD
```

ตัวอย่างใน Node.js:

```dockerfile
CMD ["node", "server.js"]
```

หมายความว่าเมื่อ Container เริ่มทำงาน Docker จะรัน:

```bash
node server.js
```

---

## 16. `RUN` กับ `CMD` ต่างกันอย่างไร?

ความแตกต่างที่ต้องจำ:

| Instruction | ทำงานเมื่อใด | ตัวอย่าง |
| --- | --- | --- |
| `RUN` | ตอน Build Image | `RUN npm install` |
| `CMD` | ตอน Container Start | `CMD ["node", "server.js"]` |

ภาพรวม:

```text
Dockerfile

RUN npm install
      │
      ▼
docker build
      │
      ▼
    Image
      │
      │ docker run
      ▼
CMD node server.js
      │
      ▼
  Container
```

ตัวอย่าง Dockerfile ของ Node.js:

```dockerfile
FROM node:22

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .

CMD ["node", "server.js"]
```

`npm install` ทำตอน Build ส่วน `node server.js` ทำทุกครั้งที่ Container Start

---

## 17. Dockerfile คือ Recipe สำหรับสร้าง Image

Dockerfile ไม่ใช่ Script ธรรมดา แต่เป็นชุด Instruction ที่อธิบายว่า Image ควรถูกสร้างอย่างไร

Dockerfile แบบสั้นสำหรับ Workshop นี้สามารถเขียนได้ดังนี้:

```dockerfile
FROM nginx:latest

WORKDIR /usr/share/nginx/html

COPY index.html .

EXPOSE 80
```

อ่านเป็นภาษาไทยได้ว่า:

1. เริ่มจาก Nginx Image
2. กำหนด Directory ของหน้าเว็บไซต์
3. นำ `index.html` ของเราเข้าไป
4. ระบุว่า Application ใช้ Port `80`

จากนั้น `docker build` จะทำตาม Recipe และสร้าง Image ออกมา

---

## 18. Image Layer

ระหว่าง Build อาจเห็นข้อความลักษณะนี้:

```text
[1/4] FROM nginx:latest
[2/4] RUN apt-get update
[3/4] WORKDIR /usr/share/nginx/html
[4/4] COPY index.html .
```

Docker Image ประกอบขึ้นจากหลาย Layer:

```text
┌──────────────────────────────┐
│ COPY index.html              │ ← ไฟล์ของเรา
├──────────────────────────────┤
│ WORKDIR /usr/share/nginx/html│
├──────────────────────────────┤
│ RUN apt-get update           │
├──────────────────────────────┤
│ Nginx Base Image             │
└──────────────────────────────┘
```

Docker สามารถ Cache Layer ที่ไม่มีการเปลี่ยนแปลง ทำให้การ Build ครั้งต่อไปเร็วขึ้น

> `EXPOSE` และ Instruction บางชนิดอาจปรากฏเป็น Metadata หรือ History โดยรายละเอียดของ Output อาจต่างกันตาม Builder และ Docker Version

---

## 19. ทดลอง Docker Build Cache

Build Image ซ้ำโดยไม่แก้ไฟล์:

```bash
docker build -t workshop04-web:2.0 .
```

ขั้นตอนที่ไม่มีการเปลี่ยนแปลงอาจแสดงคำว่า:

```text
CACHED
```

ตัวอย่างการจัดลำดับ Dockerfile สำหรับ Node.js:

```dockerfile
COPY package*.json ./
RUN npm install

COPY . .
```

เรา Copy ไฟล์ Package ก่อน Source Code เพื่อให้ Docker นำ Layer ของ `npm install` กลับมาใช้ได้ หาก Dependency ไม่เปลี่ยน แม้ Source Code จะถูกแก้ไข

---

## 20. ดู History ของ Image

ดู Layer และ Instruction ที่ใช้สร้าง Image:

```bash
docker history workshop04-web:2.0
```

ผลลัพธ์จะมีลักษณะประมาณนี้:

```text
IMAGE       CREATED BY
xxxx        COPY index.html ...
xxxx        WORKDIR /usr/share/nginx/html
xxxx        RUN apt-get update
xxxx        nginx base layer
```

คำสั่งนี้ช่วยให้เข้าใจว่า Image ถูกประกอบขึ้นจากอะไรบ้าง

---

## 21. `.dockerignore`

สมมติ Project มีไฟล์ดังนี้:

```text
workshop04-dockerfile/
│
├── Dockerfile
├── index.html
├── secret.txt
├── app.log
└── temp/
```

เราอาจไม่ต้องการให้ Docker รวมไฟล์บางชนิดไว้ใน Build Context จึงสร้างไฟล์ `.dockerignore`:

```dockerignore
secret.txt
*.log
temp/
```

`.dockerignore` ทำงานคล้าย `.gitignore` แต่ใช้สำหรับ Docker Build

ตัวอย่างสำหรับ Node.js:

```dockerignore
node_modules
.git
.env
npm-debug.log
```

ประโยชน์ของ `.dockerignore`:

- ลดขนาด Build Context
- ทำให้ Build เร็วขึ้น
- ป้องกันไฟล์ที่ไม่จำเป็นเข้าไปใน Image
- ลดความเสี่ยงที่ Secret เช่น `.env` จะถูก Copy เข้า Image โดยไม่ตั้งใจ

> ไม่ควรเก็บ Password, Token หรือ Secret ไว้ใน Docker Image

---

## สรุปคำสั่ง Dockerfile

| Instruction | หน้าที่ | ทำงานเมื่อใด |
| --- | --- | --- |
| `FROM` | เลือก Base Image | Build time |
| `WORKDIR` | กำหนด Working Directory | Build time / Image metadata |
| `COPY` | คัดลอกไฟล์เข้า Image | Build time |
| `RUN` | รันคำสั่งและสร้าง Layer | Build time |
| `EXPOSE` | ระบุ Port ที่ Application ใช้ | Image metadata |
| `CMD` | กำหนด Default Command | Container start |

สิ่งที่สำคัญที่สุดคือ:

```text
RUN  = Build time
CMD  = Run time
```

---

## Mini Challenge 04

สร้าง Directory ใหม่ชื่อ `challenge04` โดยมีโครงสร้าง:

```text
challenge04/
│
├── Dockerfile
├── .dockerignore
└── index.html
```

### Requirements

1. ใช้ `nginx` เป็น Base Image
2. กำหนด `WORKDIR` เป็น Directory ที่ Nginx ใช้เก็บไฟล์ HTML
3. Copy `index.html` เข้าไปใน Image
4. ระบุว่า Application ใช้ Port `80`
5. Build Image ชื่อ `my-web:1.0`
6. เปิดเว็บไซต์ผ่าน `http://localhost:8085`
7. แก้ HTML แล้ว Build เป็น Version `2.0`
8. สร้าง Container ใหม่จาก Version `2.0`
9. ตรวจสอบ Image History
10. ลบ Container เมื่อทดลองเสร็จ

ตัวอย่างเนื้อหา `index.html`:

```html
<h1>My First Docker Image</h1>
<p>Created in Workshop 04</p>
```

<details>
<summary>ดูเฉลย</summary>

`Dockerfile`:

```dockerfile
FROM nginx:latest

WORKDIR /usr/share/nginx/html

COPY index.html .

EXPOSE 80
```

`.dockerignore`:

```dockerignore
.git
.env
*.log
```

Build และ Run Version `1.0`:

```bash
docker build -t my-web:1.0 .
docker run -d --name my-web-container -p 8085:80 my-web:1.0
```

เปิด Browser ที่:

```text
http://localhost:8085
```

แก้ `index.html` แล้ว Build Version ใหม่:

```bash
docker build -t my-web:2.0 .
docker rm -f my-web-container
docker run -d --name my-web-container -p 8085:80 my-web:2.0
```

ตรวจสอบ History:

```bash
docker history my-web:2.0
```

ลบ Container เมื่อทดลองเสร็จ:

```bash
docker rm -f my-web-container
```

</details>

---

## ภาพรวมหลังจบ Workshop 04

```text
                 Dockerfile
                     │
Source Code ─────────┤
                     │
                     ▼
               docker build
                     │
                     ▼
                   Image
                     │
                     │ docker run
                     ▼
                 Container
                     │
                     ▼
              Running Service
```

ใน **Workshop 05** เราจะ Dockerize Node.js Express API จริง โดยสร้าง:

- Endpoint `GET /health`
- `package.json`
- `server.js`
- `Dockerfile`
- `.dockerignore`
- Docker Image สำหรับ API
- Container ที่เปิดให้เข้าถึงผ่าน `localhost`

Workshop ถัดไปจะเชื่อมแนวคิด Docker เข้ากับงาน Backend โดยตรง
