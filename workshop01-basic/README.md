# Workshop 01: Docker Basics

Workshop นี้จะช่วยให้เข้าใจพื้นฐานของ Docker ผ่านการทดลองรัน Container แรกด้วย `hello-world` และ `nginx`

เมื่อเรียนจบ Workshop นี้ คุณจะสามารถ:

- อธิบายความแตกต่างระหว่าง **Image** และ **Container** ได้
- รัน Container ทั้งแบบ Foreground และ Background ได้
- ตรวจสอบ หยุด เริ่ม และลบ Container ได้
- เข้าใจ Flow พื้นฐานจาก Registry → Image → Container

---

## ทำไมเราถึงใช้ Docker?

ก่อนเริ่มใช้คำสั่ง Docker มาดูภาพรวมของ Architecture กันเล็กน้อย

สมมติว่าเรามี Node.js API โดยปกติเราต้องติดตั้งทุกอย่างลงบน Server โดยตรง:

```text
Ubuntu Server
   │
   ├── Node.js
   ├── npm
   ├── Dependencies
   ├── Environment
   └── Application
```

ปัญหาที่พบบ่อยคือ:

> “เครื่องฉันรันได้ แต่พอขึ้น Server แล้วรันไม่ได้”

สาเหตุอาจเกิดจาก Version หรือ Environment ของแต่ละเครื่องไม่เหมือนกัน

Docker จึงเปลี่ยนแนวคิดใหม่ โดยแพ็ก Environment และ Application ไว้ด้วยกันภายใน Container:

```text
Ubuntu Server
      │
 Docker Engine
      │
 ┌────────────────┐
 │   Container    │
 │                │
 │ Node.js        │
 │ Dependencies   │
 │ Application    │
 └────────────────┘
```

ผลลัพธ์คือ Application จะมี Environment ที่สม่ำเสมอ ไม่ว่าจะนำไปรันที่เครื่องใดก็ตาม

---

## 1. Image คืออะไร?

ให้คิดว่า **Image คือ Template หรือ Blueprint** ที่ใช้สำหรับสร้าง Container

ตัวอย่าง Image:

```text
node:22
nginx:latest
postgres:17
mcr.microsoft.com/dotnet/aspnet
```

Image ยังไม่ได้ทำงานด้วยตัวเอง แต่เป็นต้นแบบที่บรรจุสิ่งที่ Application ต้องใช้เอาไว้

## 2. Container คืออะไร?

**Container คือ Instance ที่สร้างขึ้นจาก Image** และสามารถถูกสั่งให้เริ่มหรือหยุดทำงานได้

หากเปรียบเทียบกับภาษา C#:

```csharp
Employee emp = new Employee();
```

| Docker | C# |
| --- | --- |
| Image | Class |
| Container | Object |

Image เดียวสามารถใช้สร้าง Container ได้หลายตัว:

```text
nginx Image
    │
    ├── nginx-container-1
    ├── nginx-container-2
    └── nginx-container-3
```

---

## 3. ทดลองรัน Container แรก

รันคำสั่งต่อไปนี้:

```bash
docker run hello-world
```

สิ่งที่ Docker ทำเบื้องหลัง:

```text
docker run hello-world
        │
        ▼
ตรวจสอบ Image ในเครื่อง
        │
        │ ไม่พบ Image
        ▼
ดาวน์โหลดจาก Docker Hub
        │
        ▼
สร้าง Container
        │
        ▼
เริ่มทำงาน
        │
        ▼
Hello from Docker!
```

### Docker Hub คืออะไร?

Docker Hub เป็น Registry ที่ใช้เก็บและแจกจ่าย Docker Image คล้ายกับแหล่งรวม Package หรือ Source Code อื่น ๆ:

| Service | ใช้สำหรับ |
| --- | --- |
| Docker Hub | Docker Images |
| npmjs.com | npm Packages |
| NuGet | .NET Packages |
| GitHub | Source Code |

---

## 4. ทดลองรัน Nginx

### รันแบบ Foreground

```bash
docker run nginx
```

Terminal จะดูเหมือนค้างอยู่ แต่จริง ๆ แล้ว Docker กำลังรัน Nginx แบบ **Foreground**

กด `Ctrl + C` เพื่อหยุดการทำงาน

### รันแบบ Background

```bash
docker run -d nginx
```

Option `-d` ย่อมาจาก **Detached Mode** ทำให้ Container ทำงานอยู่เบื้องหลังและคืน Terminal ให้เราใช้งานต่อได้

---

## 5. ตรวจสอบ Container

### ดูเฉพาะ Container ที่กำลังทำงาน

```bash
docker ps
```

ตัวอย่างผลลัพธ์:

```text
CONTAINER ID   IMAGE   COMMAND                  STATUS
d34ab12c       nginx   "/docker-entrypoint..."  Up 10 seconds
```

### ดู Container ทั้งหมด

```bash
docker ps -a
```

คำสั่งนี้จะแสดง Container ทั้งที่กำลังทำงานและหยุดไปแล้ว

จำง่าย ๆ:

```text
docker ps      → Running Containers
docker ps -a   → All Containers
```

---

## 6. ตั้งชื่อ Container

ถ้าเราไม่กำหนดชื่อ Docker จะสุ่มชื่อให้ เช่น:

```text
wonderful_turing
happy_babbage
focused_morse
```

ในการใช้งานจริง เราควรตั้งชื่อที่สื่อความหมายด้วย Option `--name`:

```bash
docker run -d --name web-server nginx
```

ตรวจสอบชื่อ Container:

```bash
docker ps
```

ใน Column `NAMES` จะเห็นชื่อที่เรากำหนด:

```text
NAMES
web-server
```

---

## 7. จัดการ Container

### หยุด Container

```bash
docker stop web-server
```

เมื่อตรวจสอบด้วย `docker ps` จะไม่เห็น Container นี้ เพราะมันหยุดทำงานแล้ว

อย่างไรก็ตาม เรายังสามารถพบ Container ได้ด้วย:

```bash
docker ps -a
```

> **จำไว้:** การ Stop ไม่ใช่การ Delete — Container ยังคงอยู่ในเครื่อง

### เริ่ม Container อีกครั้ง

```bash
docker start web-server
```

### ลบ Container

โดยปกติควรหยุด Container ก่อน แล้วจึงลบ:

```bash
docker stop web-server
docker rm web-server
```

หากต้องการหยุดและลบ Container ทันที สามารถใช้:

```bash
docker rm -f web-server
```

> `-f` เป็นการบังคับลบ ควรตรวจสอบชื่อ Container ให้ถูกต้องก่อนใช้งาน

---

## 8. จัดการ Image

### ดู Image ทั้งหมดในเครื่อง

```bash
docker images
```

ตัวอย่างผลลัพธ์:

```text
REPOSITORY    TAG       IMAGE ID       SIZE
nginx         latest    abc123         192MB
hello-world   latest    def456         13kB
```

การลบ Container **ไม่ได้หมายความว่า Image จะถูกลบด้วย** เพราะ Image และ Container เป็นคนละส่วนกัน:

```text
Docker Hub
    │
    │ docker pull
    ▼
  Image
    │
    │ docker run
    ▼
Container
```

### ลบ Image

ใช้คำสั่งใดคำสั่งหนึ่งต่อไปนี้:

```bash
docker rmi hello-world
```

หรือ:

```bash
docker image rm hello-world
```

ทั้งสองคำสั่งให้ผลลัพธ์เหมือนกัน

---

## สรุป Flow ที่ควรเข้าใจ

```text
Registry
   │
   │ pull
   ▼
 Image
   │
   │ run
   ▼
Container
   │
   ├── start
   ├── stop
   └── remove
```

### คำสั่งสำคัญใน Workshop 01

| คำสั่ง | ใช้สำหรับ |
| --- | --- |
| `docker --version` | ตรวจสอบ Version ของ Docker |
| `docker info` | ดูข้อมูล Docker Engine |
| `docker run hello-world` | สร้างและรัน Container ตัวอย่าง |
| `docker run nginx` | รัน Nginx แบบ Foreground |
| `docker run -d nginx` | รัน Nginx แบบ Background |
| `docker run -d --name web-server nginx` | รันและตั้งชื่อ Container |
| `docker ps` | ดู Container ที่กำลังทำงาน |
| `docker ps -a` | ดู Container ทั้งหมด |
| `docker stop web-server` | หยุด Container |
| `docker start web-server` | เริ่ม Container ที่หยุดไว้ |
| `docker rm web-server` | ลบ Container ที่หยุดแล้ว |
| `docker rm -f web-server` | บังคับหยุดและลบ Container |
| `docker images` | ดู Image ทั้งหมดในเครื่อง |
| `docker rmi nginx` | ลบ Image |

> ยังไม่จำเป็นต้องจำทุกคำสั่งในครั้งเดียว ให้เข้าใจความสัมพันธ์ระหว่าง **Registry → Image → Container** ก่อน

---

## Mini Challenge 01

ลองทำตามโจทย์ต่อไปนี้โดยไม่ย้อนกลับไปดูตัวอย่างด้านบน:

1. ดาวน์โหลด Nginx Image
2. สร้าง Container ชื่อ `my-nginx`
3. ให้ Container ทำงานแบบ Background
4. ตรวจสอบว่า Container กำลังทำงาน
5. หยุด Container
6. ตรวจสอบว่า Container ยังอยู่
7. เริ่ม Container อีกครั้ง
8. ลบ Container

คำสั่งที่น่าจะได้ใช้:

```bash
docker pull ...
docker run ...
docker ps ...
docker stop ...
docker start ...
docker rm ...
```

<details>
<summary>ดูเฉลย</summary>

```bash
docker pull nginx
docker run -d --name my-nginx nginx
docker ps
docker stop my-nginx
docker ps -a
docker start my-nginx
docker rm -f my-nginx
```

</details>

---

## Workshop ถัดไป

ตอนนี้เรายังไม่เปิดเว็บผ่าน `localhost` เพราะต้องเรียนรู้เรื่อง **Port Mapping** ก่อน ซึ่งเป็นแนวคิดสำคัญมากของ Docker

ใน Workshop 02 เราจะเรียนรู้ Docker CLI และการเข้าไปสำรวจภายใน Container ผ่านคำสั่ง เช่น:

- `docker exec`
- `docker logs`
- การเข้า Linux Shell ภายใน Container
- การดูว่าไฟล์ของ Nginx อยู่ที่ตำแหน่งใด

เนื้อหาเหล่านี้จะช่วยให้เห็นภาพการทำงานภายใน Container ชัดเจนยิ่งขึ้น
