# Workshop 02: Docker CLI, Logs และการเข้าไปใน Container

Workshop นี้เราจะเริ่ม “เปิดฝากระโปรง” เพื่อสำรวจสิ่งที่อยู่ภายใน Container และเรียนรู้วิธีตรวจสอบปัญหาเมื่อ Service ทำงานผิดปกติ

เมื่อเรียนจบ Workshop นี้ คุณจะสามารถ:

- อ่าน Logs ของ Application ภายใน Container ได้
- เข้าไปใช้ Shell และสำรวจ Filesystem ภายใน Container ได้
- รันคำสั่งภายใน Container โดยไม่ต้องเปิด Shell ได้
- ตรวจสอบ Process, Resource และ Metadata ของ Container ได้
- อธิบายได้ว่าเหตุใด Container จึงไม่ใช่ Virtual Machine

คำสั่งหลักที่เราจะใช้:

```bash
docker logs
docker exec
docker inspect
docker top
docker stats
```

---

## 1. สร้าง Nginx Container

เริ่มต้นด้วยการสร้าง Container ชื่อ `my-nginx` และให้ทำงานแบบ Background:

```bash
docker run -d --name my-nginx nginx
```

ตรวจสอบว่า Container กำลังทำงาน:

```bash
docker ps
```

ตัวอย่างผลลัพธ์:

```text
CONTAINER ID   IMAGE   COMMAND                  STATUS       PORTS    NAMES
abc123         nginx   "/docker-entrypoint..."  Up 5 secs    80/tcp   my-nginx
```

สังเกต Column `PORTS`:

```text
80/tcp
```

หมายความว่า Nginx ภายใน Container กำลังฟังที่ Port `80` แต่เรายัง **ไม่ได้เปิด Port ของเครื่อง Host** ให้เข้าถึง Container

> เรื่องนี้จะอธิบายเพิ่มเติมใน Workshop 03: Docker Port Mapping

---

## 2. ดู Logs ของ Container

ใช้คำสั่งต่อไปนี้เพื่อดู Logs ของ Nginx:

```bash
docker logs my-nginx
```

ตัวอย่างผลลัพธ์:

```text
/docker-entrypoint.sh: /docker-entrypoint.d/ is not empty...
/docker-entrypoint.sh: Configuration complete; ready for start up
```

Logs เหล่านี้มาจาก `stdout` และ `stderr` ของ Application ภายใน Container:

```text
Application
     │
     ├── stdout
     └── stderr
          │
          ▼
      Docker Logs
```

ตัวอย่างใน Node.js:

```javascript
console.log("Server started");
console.error("Database connection failed");
```

ตัวอย่างใน ASP.NET Core:

```csharp
_logger.LogInformation("Server started");
_logger.LogError("Database failed");
```

ข้อความเหล่านี้สามารถตรวจสอบได้ด้วย:

```bash
docker logs container-name
```

### ดู Logs แบบ Real-time

ใช้ Option `-f` ซึ่งย่อมาจาก **Follow**:

```bash
docker logs -f my-nginx
```

การทำงานคล้ายกับคำสั่ง `tail -f` บน Linux หากมี Request เข้ามาที่ Nginx จะเห็น Log ใหม่แสดงขึ้นมาอย่างต่อเนื่อง

กด `Ctrl + C` เพื่อหยุดดู Logs

> การกด `Ctrl + C` ในกรณีนี้หยุดเฉพาะคำสั่งที่กำลังติดตาม Logs เท่านั้น **ไม่ได้หยุด Nginx Container**

กรณีนี้ต่างจากการรัน `docker run nginx` แบบ Foreground ซึ่ง Process จะผูกอยู่กับ Terminal โดยตรง

---

## 3. เข้าไปภายใน Container

รันคำสั่ง:

```bash
docker exec -it my-nginx bash
```

หากสำเร็จ Prompt จะเปลี่ยนจาก Windows:

```text
C:\>
```

เป็น Prompt ภายใน Linux Container:

```text
root@abc123:/#
```

ตอนนี้คำสั่งที่พิมพ์จะทำงานอยู่ภายใน Linux Container ไม่ใช่บน Windows Host

ทดลองดูตำแหน่งปัจจุบัน:

```bash
pwd
```

ผลลัพธ์:

```text
/
```

ทดลองดูไฟล์และ Directory:

```bash
ls
```

ตัวอย่างผลลัพธ์:

```text
bin   boot  dev   docker-entrypoint.d  docker-entrypoint.sh
etc   home  lib   media                mnt
opt   proc  root  run                  sbin
srv   sys   tmp   usr                  var
```

นี่คือ Filesystem ของ Linux ที่อยู่ภายใน Nginx Container

### `docker exec -it` หมายถึงอะไร?

| ส่วนประกอบ | ความหมาย |
| --- | --- |
| `docker exec` | สั่งให้รัน Command ภายใน Container ที่กำลังทำงาน |
| `-i` | Interactive — เปิด Standard Input ไว้ให้เราพิมพ์คำสั่ง |
| `-t` | TTY — สร้าง Terminal จำลองให้เราใช้งาน |
| `my-nginx` | ชื่อ Container เป้าหมาย |
| `bash` | Command ที่ต้องการรันภายใน Container |

ดังนั้นคำสั่งนี้:

```bash
docker exec -it my-nginx bash
```

สามารถอ่านได้ว่า:

> เปิด Bash แบบ Interactive Terminal ภายใน Container ชื่อ `my-nginx`

---

## 4. Container บางตัวไม่มี Bash

บาง Image มี `bash` แต่บาง Image ไม่มี โดยเฉพาะ Image ขนาดเล็ก เช่น Alpine หรือ Minimal Image

หากรันคำสั่งนี้:

```bash
docker exec -it container-name bash
```

แล้วพบ Error:

```text
exec: "bash": executable file not found
```

ให้ลองใช้ `sh` แทน:

```bash
docker exec -it container-name sh
```

จำง่าย ๆ:

```text
Ubuntu / Debian Image   → มักมี bash
Alpine / Minimal Image  → มักใช้ sh
```

---

## 5. สำรวจไฟล์เว็บไซต์ของ Nginx

ขณะที่ยังอยู่ภายใน Container ให้ไปยัง Directory ที่เก็บไฟล์เว็บไซต์:

```bash
cd /usr/share/nginx/html
```

ดูไฟล์ที่อยู่ภายใน:

```bash
ls
```

โดยปกติจะพบไฟล์:

```text
50x.html
index.html
```

อ่านเนื้อหาของหน้าแรก:

```bash
cat index.html
```

จะพบ HTML ของหน้า Welcome to Nginx ลักษณะประมาณนี้:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Welcome to nginx!</title>
  </head>
  ...
</html>
```

Nginx อ่านไฟล์จาก Directory นี้และส่งเนื้อหากลับไปให้ Browser:

```text
/usr/share/nginx/html
           │
           └── index.html
                    │
                    ▼
                 Browser
```

---

## 6. แก้ไขไฟล์ภายใน Container

ทดลองเขียน HTML ใหม่ลงใน `index.html`:

```bash
echo "<h1>Hello Docker</h1>" > /usr/share/nginx/html/index.html
```

ตรวจสอบเนื้อหา:

```bash
cat /usr/share/nginx/html/index.html
```

ผลลัพธ์:

```html
<h1>Hello Docker</h1>
```

แสดงว่าเราสามารถแก้ไข Filesystem ภายใน Container ได้

> **แนวคิดสำคัญ:** ข้อมูลที่แก้ไขภายใน Container ไม่ควรถูกใช้เป็น Permanent Storage เพราะข้อมูลจะหายไปเมื่อ Container ถูกลบ ใน Workshop เรื่อง Volume เราจะเรียนรู้วิธีจัดเก็บข้อมูลแบบถาวร

---

## 7. ออกจาก Container

ใช้คำสั่ง:

```bash
exit
```

Prompt จะกลับมายัง Windows:

```text
C:\>
```

ตรวจสอบสถานะของ Nginx:

```bash
docker ps
```

Nginx จะยังคงทำงานอยู่ เพราะ `exit` เป็นเพียงการออกจาก Shell ไม่ใช่การหยุด Container

---

## 8. ใช้ `docker exec` โดยไม่เปิด Shell

เราไม่จำเป็นต้องเข้า Bash ทุกครั้ง สามารถสั่ง Command ให้ทำงานภายใน Container ได้โดยตรง

ตัวอย่าง:

```bash
docker exec my-nginx ls
```

Flow การทำงาน:

```text
Windows Terminal
       │
       │ docker exec
       ▼
Container
       │
       │ ls
       ▼
แสดงผลลัพธ์กลับมาที่ Terminal
```

ตัวอย่างคำสั่งเพิ่มเติม:

```bash
docker exec my-nginx pwd
docker exec my-nginx ls /usr/share/nginx/html
docker exec my-nginx cat /usr/share/nginx/html/index.html
```

เลือกใช้ให้เหมาะกับงาน:

| รูปแบบ | เหมาะสำหรับ |
| --- | --- |
| `docker exec -it my-nginx bash` | เข้าไปสำรวจหรือรันหลายคำสั่งต่อเนื่อง |
| `docker exec my-nginx ls /app` | รันคำสั่งเดียวและรับผลลัพธ์ทันที |

---

## 9. ดู Process ภายใน Container

ใช้คำสั่ง:

```bash
docker top my-nginx
```

ตัวอย่างผลลัพธ์:

```text
UID     PID      COMMAND
root    1234     nginx: master process
nginx   1250     nginx: worker process
nginx   1251     nginx: worker process
```

สิ่งนี้นำไปสู่แนวคิดสำคัญ:

> Container ไม่ใช่ Virtual Machine เต็มรูปแบบ แต่เป็น Process ที่ถูกแยกออกจาก Process อื่นด้วย Isolation

มองภาพรวมแบบง่าย:

```text
Windows
│
└── Docker Desktop
      │
      └── Linux Environment
            │
            ├── nginx process
            ├── node process
            └── dotnet process
```

Docker จะแยก Filesystem, Network และ Environment ของแต่ละ Container ออกจากกัน

---

## 10. ดูการใช้ Resource

ใช้คำสั่ง:

```bash
docker stats
```

ตัวอย่างผลลัพธ์:

```text
CONTAINER   CPU %   MEM USAGE / LIMIT   NET I/O
my-nginx    0.00%   5MiB / 7.5GiB       ...
```

คำสั่งนี้มีประโยชน์สำหรับตรวจสอบปัญหาในงานจริง เช่น API ทำงานช้า แล้วพบว่า:

```text
CONTAINER   CPU %   MEM USAGE / LIMIT
orders-api  98.0%   1.8GiB / 2GiB
```

ข้อมูลนี้ช่วยให้ตั้งสมมติฐานได้ว่าปัญหาอาจเกี่ยวข้องกับ CPU หรือ Memory

กด `Ctrl + C` เพื่อออกจากหน้าจอ `docker stats`

---

## 11. ตรวจสอบ Metadata ของ Container

ใช้คำสั่ง:

```bash
docker inspect my-nginx
```

ผลลัพธ์จะเป็น JSON ขนาดใหญ่ที่มี Metadata ของ Container เช่น:

- ID
- Image
- Command
- Environment
- Network และ IP Address
- Mounts
- Ports
- State

ข้อมูลจาก `docker inspect` จะถูกนำมาใช้อีกครั้งใน Workshop เรื่อง Network และ Volume

---

## 12. ดู IP Address ของ Container

วิธีพื้นฐานคือใช้คำสั่ง:

```bash
docker inspect my-nginx
```

จากนั้นค้นหา `IPAddress` ในผลลัพธ์:

```json
"IPAddress": "172.x.x.x"
```

หากใช้ PowerShell สามารถแสดงเฉพาะ IP Address ได้ด้วย:

```powershell
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' my-nginx
```

ภาพรวมของ Network:

```text
Host
192.168.x.x
     │
Docker Network
     │
     └── Container
          172.x.x.x
```

Container มี Network Environment ของตัวเอง จึงเป็นเหตุผลที่เราต้องเรียนรู้เรื่องต่อไปนี้:

- Port Mapping
- Docker Network
- DNS ภายใน Docker

---

## ภาพรวมของ Container ใน Workshop นี้

```text
               Docker Host

┌──────────────────────────────────┐
│                                  │
│  ┌────────────────────────────┐  │
│  │ Container: my-nginx        │  │
│  │                            │  │
│  │ Linux Filesystem           │  │
│  │                            │  │
│  │ /usr/share/nginx/html      │  │
│  │           │                │  │
│  │       index.html           │  │
│  │                            │  │
│  │ nginx master process       │  │
│  │ nginx worker processes     │  │
│  │                            │  │
│  │ Port 80                    │  │
│  └────────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
```

เราสามารถตรวจสอบและควบคุม Container จากภายนอกได้:

| คำสั่ง | ใช้สำหรับ |
| --- | --- |
| `docker logs` | ดู Output ของ Application |
| `docker exec` | รันคำสั่งภายใน Container |
| `docker top` | ดู Process ภายใน Container |
| `docker stats` | ดูการใช้ CPU, Memory และ Network |
| `docker inspect` | ดู Metadata และ Configuration |

---

## Mini Challenge 02

สร้าง Container ใหม่:

```bash
docker run -d --name workshop-nginx nginx
```

จากนั้นลองทำโจทย์ต่อไปนี้ด้วยตัวเอง:

1. ตรวจสอบว่า Container กำลังทำงาน
2. ดู Startup Logs
3. เปิด Logs แบบ Real-time แล้วออกจากการดู Logs
4. เข้า Bash ภายใน Container
5. ไปที่ `/usr/share/nginx/html`
6. อ่านเนื้อหาของ `index.html`
7. เปลี่ยนเนื้อหาเป็น `<h1>Docker Workshop 02</h1>`
8. ออกจาก Container
9. ใช้ `docker exec` อ่าน `index.html` โดยไม่เข้า Bash
10. ตรวจสอบ Container ด้วย `docker top`, `docker stats` และ `docker inspect`
11. ลบ Container เมื่อทำแบบฝึกหัดเสร็จ

<details>
<summary>ดูเฉลย</summary>

```bash
docker ps
docker logs workshop-nginx
docker logs -f workshop-nginx
```

กด `Ctrl + C` เพื่อหยุดดู Logs จากนั้นเข้าไปภายใน Container:

```bash
docker exec -it workshop-nginx bash
cd /usr/share/nginx/html
cat index.html
echo "<h1>Docker Workshop 02</h1>" > index.html
exit
```

ตรวจสอบจากภายนอก Container:

```bash
docker exec workshop-nginx cat /usr/share/nginx/html/index.html
docker top workshop-nginx
docker stats workshop-nginx
docker inspect workshop-nginx
```

กด `Ctrl + C` เพื่อออกจาก `docker stats` แล้วลบ Container:

```bash
docker rm -f workshop-nginx
```

</details>

---

## ทดลองก่อนเข้าสู่ Workshop ถัดไป

สร้าง Nginx Container อีกครั้ง:

```bash
docker run -d --name workshop-nginx nginx
```

จากนั้นลองเปิด Browser ที่:

```text
http://localhost
```

คุณน่าจะยังเข้าไม่ได้ แม้ `docker ps` จะแสดงว่า:

```text
80/tcp
```

นี่ไม่ใช่ Error แต่เกิดจากเรายังไม่ได้เชื่อม Port ของ Host เข้ากับ Port ของ Container

เมื่อลองเสร็จแล้ว สามารถลบ Container ได้ด้วย:

```bash
docker rm -f workshop-nginx
```

ใน **Workshop 03: Docker Port Mapping** เราจะเรียนรู้เรื่อง:

- การใช้ `-p 8080:80`
- Host Port และ Container Port
- การเดินทางของ Request จาก `localhost` ไปยัง Container
- แนวคิดที่จำเป็นสำหรับการ Dockerize Node.js และ ASP.NET Core API
