# Workshop 03: Docker Port Mapping

Workshop นี้จะอธิบายการเชื่อม Port ระหว่างเครื่อง Host และ Container ผ่านคำสั่งสำคัญ:

```bash
docker run -p 8080:80 nginx
```

เมื่อเรียนจบ Workshop นี้ คุณจะสามารถตอบคำถามต่อไปนี้ได้:

- `8080` เป็น Port ของใคร?
- `80` เป็น Port ของใคร?
- `localhost` หมายถึงเครื่องไหน?
- ทำไม `docker ps` แสดง `80/tcp` แต่ Browser ยังเข้าไม่ได้?
- ทำไมหลาย Container ใช้ Container Port เดียวกันได้?

---

## 1. รัน Nginx โดยไม่ทำ Port Mapping

สร้าง Nginx Container แบบเดียวกับ Workshop ก่อนหน้า:

```bash
docker run -d --name nginx-no-port nginx
```

ตรวจสอบ Container:

```bash
docker ps
```

ใน Column `PORTS` จะเห็น:

```text
80/tcp
```

หลายคนอาจเข้าใจว่าเราสามารถเปิด `localhost:80` ได้แล้ว แต่ `80/tcp` ในที่นี้หมายความเพียงว่า:

> Image ระบุว่า Application ภายใน Container ใช้ Port `80`

ไม่ได้หมายความว่า Port `80` ของ Windows Host ถูกเชื่อมเข้ามายัง Container แล้ว

---

## 2. Host และ Container อยู่คนละ Network

ตอนนี้โครงสร้างเป็นประมาณนี้:

```text
Windows Host
192.168.x.x

        ✕
        │
        │ ยังไม่มี Port Mapping
        │
        ▼

Docker Network
172.17.0.0/16

┌─────────────────────┐
│ nginx-no-port       │
│                     │
│ IP: 172.17.0.2      │
│ Port: 80            │
└─────────────────────┘
```

Browser ทำงานอยู่บน Windows Host ขณะที่ Nginx ทำงานอยู่ใน Network Environment ของ Container เราจึงต้องสร้างทางเชื่อมระหว่างทั้งสองฝั่ง

---

## 3. Publish Port ด้วย `-p`

ลบ Container เดิมก่อน:

```bash
docker rm -f nginx-no-port
```

จากนั้นสร้างใหม่พร้อมทำ Port Mapping:

```bash
docker run -d --name workshop-nginx -p 8080:80 nginx
```

ตรวจสอบด้วย:

```bash
docker ps
```

คราวนี้ Column `PORTS` จะแสดงประมาณนี้:

```text
0.0.0.0:8080->80/tcp
```

อ่านค่าจากซ้ายไปขวา:

```text
HOST                         CONTAINER

Port 8080        ────────▶   Port 80
```

ดังนั้น Syntax ของ `-p` คือ:

```text
-p HOST_PORT:CONTAINER_PORT
```

จำง่าย ๆ ว่า:

> **ข้างนอก : ข้างใน**

---

## 4. เปิด Nginx ผ่าน Browser

เปิด Browser ที่:

```text
http://localhost:8080
```

ควรเห็นหน้า:

```text
Welcome to nginx!
```

Request เดินทางตาม Flow นี้:

```text
Browser
   │
   │ http://localhost:8080
   ▼
Windows Host
Port 8080
   │
   │ Docker Port Mapping
   ▼
Container
Port 80
   │
   ▼
Nginx
```

หรือมองแบบสั้น ๆ:

```text
localhost:8080  →  Docker  →  container:80  →  Nginx
```

---

## 5. ทำไมจึงไม่ใช้ `8080:8080`?

Nginx ภายใน Container กำลังฟังอยู่ที่ Port `80` ไม่ใช่ Port `8080`

หากใช้คำสั่ง:

```bash
docker run -d -p 8080:8080 nginx
```

Docker จะเชื่อม Port ดังนี้:

```text
Host Port 8080  →  Container Port 8080
```

แต่ภายใน Container ไม่มี Nginx รอรับ Request ที่ Port `8080`:

```text
Host :8080
     │
     ▼
Container :8080   ✕ ไม่มี Service รออยู่

Container :80     ✓ Nginx รออยู่ที่นี่
```

ดังนั้น Browser จะไม่สามารถเชื่อมต่อกับ Nginx ได้

---

## 6. Host Port เปลี่ยนได้

Container Port ไม่จำเป็นต้องมีเลขเดียวกับ Host Port

ตัวอย่างที่ 1:

```bash
docker run -d --name nginx-example-1 -p 8081:80 nginx
```

```text
localhost:8081  →  container:80
```

ตัวอย่างที่ 2:

```bash
docker run -d --name nginx-example-2 -p 9000:80 nginx
```

```text
localhost:9000  →  container:80
```

Nginx ภายใน Container ไม่จำเป็นต้องรู้ว่าโลกภายนอกใช้ Port ใด มันยังคงทำงานที่ Container Port `80` เหมือนเดิม

> หากทดลองทั้งสองคำสั่ง ให้ใช้ `docker rm -f nginx-example-1 nginx-example-2` เพื่อลบ Container เมื่อเสร็จแล้ว

---

## 7. รัน Nginx หลาย Container พร้อมกัน

นี่คือประโยชน์ที่เห็นได้ชัดของ Port Mapping แต่ละ Container สามารถใช้ Container Port เดียวกันได้ โดยเชื่อมกับ Host Port ที่ต่างกัน:

```bash
docker run -d --name nginx-1 -p 8081:80 nginx
docker run -d --name nginx-2 -p 8082:80 nginx
docker run -d --name nginx-3 -p 8083:80 nginx
```

ตรวจสอบด้วย:

```bash
docker ps
```

จะเห็น Mapping ประมาณนี้:

```text
nginx-1   0.0.0.0:8081->80/tcp
nginx-2   0.0.0.0:8082->80/tcp
nginx-3   0.0.0.0:8083->80/tcp
```

เปิดแต่ละ Container ผ่าน Browser:

```text
http://localhost:8081
http://localhost:8082
http://localhost:8083
```

ทั้งสาม Container ใช้ Container Port `80` เหมือนกัน แต่ใช้ Host Port ต่างกัน

| Container | Host Port | Container Port | URL |
| --- | ---: | ---: | --- |
| `nginx-1` | 8081 | 80 | `http://localhost:8081` |
| `nginx-2` | 8082 | 80 | `http://localhost:8082` |
| `nginx-3` | 8083 | 80 | `http://localhost:8083` |

---

## 8. ถ้า Host Port ซ้ำกันจะเกิดอะไรขึ้น?

ตอนนี้ `nginx-1` ใช้ Host Port `8081` อยู่แล้ว ลองสร้างอีก Container โดยใช้ Port เดียวกัน:

```bash
docker run -d --name nginx-conflict -p 8081:80 nginx
```

Docker จะแสดง Error ลักษณะประมาณนี้:

```text
port is already allocated
```

สาเหตุคือ Host Port หนึ่ง Port บน Address เดียวกัน ปกติไม่สามารถถูก Bind โดยหลาย Service พร้อมกันได้:

```text
Windows Host

Port 8081
    │
    └── nginx-1

nginx-conflict  ✕ ไม่สามารถใช้ Port 8081 ซ้ำได้
```

การรันที่ไม่สำเร็จอาจทิ้ง Container ที่หยุดอยู่ไว้ ลบออกด้วย:

```bash
docker rm -f nginx-conflict
```

---

## 9. ทำไม Container Port จึงซ้ำกันได้?

แต่ละ Container มี Network Namespace ของตัวเอง จึงสามารถใช้หมายเลข Port เดียวกันได้โดยไม่ชนกัน

เปรียบเทียบเหมือนเลขห้องในบ้านคนละหลัง:

```text
House A  →  Room 80
House B  →  Room 80
House C  →  Room 80
```

เลขห้องเหมือนกันได้เพราะอยู่คนละบ้าน เช่นเดียวกับ `nginx-1`, `nginx-2` และ `nginx-3` ที่ต่างก็ใช้ Container Port `80`

---

## 10. ดู Port Mapping โดยตรง

ตรวจสอบ Port Mapping ของ `workshop-nginx` ด้วย:

```bash
docker port workshop-nginx
```

ตัวอย่างผลลัพธ์:

```text
80/tcp -> 0.0.0.0:8080
80/tcp -> [::]:8080
```

คำสั่งนี้ช่วยให้ตรวจสอบได้อย่างรวดเร็วว่า Container Publish Port ใดอยู่

---

## 11. ดู Port Mapping ด้วย `docker inspect`

รันคำสั่ง:

```bash
docker inspect workshop-nginx
```

Container ที่ไม่มี `-p` จะมีค่าลักษณะนี้:

```json
"PortBindings": {}
```

และ:

```json
"Ports": {
  "80/tcp": null
}
```

แต่ Container ที่รันด้วย `-p 8080:80` จะมีข้อมูลประมาณนี้:

```json
"PortBindings": {
  "80/tcp": [
    {
      "HostPort": "8080"
    }
  ]
}
```

และ:

```json
"Ports": {
  "80/tcp": [
    {
      "HostIp": "0.0.0.0",
      "HostPort": "8080"
    }
  ]
}
```

ข้อมูลนี้แสดงความแตกต่างระหว่าง Port ที่ถูก **Expose** และ Port ที่ถูก **Publish**

---

## 12. `EXPOSE` ไม่เท่ากับ Publish

Dockerfile ของ Image อาจมีคำสั่ง:

```dockerfile
EXPOSE 80
```

คำสั่งนี้ไม่ได้เปิด `localhost:80` ให้อัตโนมัติ แต่เป็น Metadata ที่สื่อว่า Application ภายใน Container ตั้งใจใช้ Port `80`

การเปรียบเทียบอย่างง่าย:

```text
EXPOSE 80
    = ป้ายบอกว่า “ร้านนี้มีประตูหมายเลข 80”

-p 8080:80
    = สร้างถนนจาก Host Port 8080 มายังประตูหมายเลข 80
```

เมื่อต้องการให้ Host เข้าถึง Container เรายังต้อง Publish Port ตอนรัน:

```bash
docker run -p 8080:80 nginx
```

---

## 13. แก้ไข HTML แล้วเปิดผ่าน Browser

ตอนนี้ `workshop-nginx` กำลังทำงานด้วย Mapping `8080:80` ให้แก้ไขหน้าแรกของ Nginx:

```bash
docker exec workshop-nginx sh -c "echo '<h1>Hello Docker Port</h1>' > /usr/share/nginx/html/index.html"
```

จากนั้นเปิด:

```text
http://localhost:8080
```

ควรเห็นข้อความ:

```text
Hello Docker Port
```

Flow การทำงานทั้งหมด:

```text
Browser
    │
    │ GET /
    ▼
localhost:8080
    │
    │ Port Mapping
    ▼
container:80
    │
    ▼
Nginx
    │
    ▼
/usr/share/nginx/html/index.html
```

---

## 14. ดู Logs ขณะเปิดเว็บไซต์

เปิด Terminal แรกและติดตาม Logs:

```bash
docker logs -f workshop-nginx
```

จากนั้น Refresh Browser ที่:

```text
http://localhost:8080
```

จะเห็น Access Log ลักษณะประมาณนี้:

```text
172.x.x.x - - "GET / HTTP/1.1" 200 ...
172.x.x.x - - "GET /favicon.ico HTTP/1.1" 200 ...
```

Request เดินทางตามลำดับ:

```text
Browser
   ↓
Host Port
   ↓
Docker Port Mapping
   ↓
Container Port
   ↓
Nginx
   ↓
Access Log
```

กด `Ctrl + C` เพื่อหยุดติดตาม Logs โดย Container จะยังคงทำงานต่อไป

---

## 15. `0.0.0.0:8080` คืออะไร?

เมื่อ `docker ps` แสดง:

```text
0.0.0.0:8080->80/tcp
```

`0.0.0.0` หมายถึง Docker Bind Port `8080` กับทุก IPv4 Interface ของ Host ไม่ใช่ Address ที่เรานำไปเปิดใน Browser โดยตรง

เครื่องหนึ่งอาจมีหลาย Interface เช่น:

```text
127.0.0.1
192.168.1.50
10.x.x.x
```

การเข้าถึงจากแต่ละ Interface ยังขึ้นอยู่กับ Routing และ Firewall ของเครื่องด้วย สำหรับการเปิดจากเครื่องตัวเองให้ใช้:

```text
http://localhost:8080
```

---

## 16. Bind เฉพาะ Localhost

หากต้องการให้ Service รับการเชื่อมต่อเฉพาะจากเครื่อง Host สามารถระบุ `127.0.0.1` ได้:

```bash
docker run -d --name local-nginx -p 127.0.0.1:9090:80 nginx
```

Syntax แบบเต็มคือ:

```text
-p HOST_IP:HOST_PORT:CONTAINER_PORT
```

จากตัวอย่าง:

```text
127.0.0.1 : 9090 : 80
     │        │      │
     │        │      └── Container Port
     │        └───────── Host Port
     └────────────────── Host IP
```

เปรียบเทียบความแตกต่าง:

| รูปแบบ | การ Bind โดยทั่วไป |
| --- | --- |
| `-p 8080:80` | ทุก Interface ของ Host |
| `-p 127.0.0.1:9090:80` | เฉพาะ Localhost |

> การเลือก Interface ที่ Publish Port มีผลด้าน Security โดยเฉพาะใน Production

เมื่อลองเสร็จแล้ว ลบ Container ได้ด้วย:

```bash
docker rm -f local-nginx
```

---

## 17. ประยุกต์ใช้กับ ASP.NET Core และ Node.js

### ASP.NET Core

สมมติ ASP.NET Core ภายใน Container ฟังอยู่ที่ Port `8080`:

```bash
docker run -p 5000:8080 my-api
```

Flow การเชื่อมต่อ:

```text
Browser / Postman
http://localhost:5000
        │
        ▼
Host Port 5000
        │
        ▼
Container Port 8080
        │
        ▼
ASP.NET Core
```

### Node.js

สมมติ Application ฟังอยู่ที่ Port `3000`:

```javascript
app.listen(3000);
```

รัน Container ด้วย:

```bash
docker run -p 8080:3000 my-node-api
```

ผู้ใช้จะเข้าถึง Application ผ่าน:

```text
http://localhost:8080
```

---

## สรุปสิ่งสำคัญ

คำสั่งที่ต้องจำคือ:

```text
-p HOST_PORT:CONTAINER_PORT
```

ตัวอย่าง:

```bash
docker run -p 8080:80 nginx
```

หมายความว่า:

```text
Host
localhost:8080
      │
      ▼
Container
Port 80
      │
      ▼
Nginx
```

| แนวคิด | สิ่งที่ควรจำ |
| --- | --- |
| Host Port | Port ที่ผู้ใช้หรือ Browser เชื่อมต่อจากภายนอก |
| Container Port | Port ที่ Application ฟังอยู่ภายใน Container |
| `EXPOSE` | Metadata ที่บอกว่า Application ตั้งใจใช้ Port ใด |
| `-p` | Publish และเชื่อม Host Port ไปยัง Container Port |
| Host Port ซ้ำ | ใช้พร้อมกันไม่ได้บน Address เดียวกัน |
| Container Port ซ้ำ | ใช้ได้ เพราะแต่ละ Container มี Network แยกกัน |

> อย่าสลับเป็น Container : Host — ให้จำว่า **ข้างนอก : ข้างใน**

---

## Mini Challenge 03

ล้าง Container จากการทดลองก่อนหน้า:

```bash
docker rm -f workshop-nginx nginx-1 nginx-2 nginx-3
```

> หากบาง Container ไม่มีอยู่ Docker อาจแสดงข้อความแจ้งเตือน ซึ่งไม่กระทบกับการทำ Challenge

จากนั้นลองทำโจทย์ต่อไปนี้:

1. สร้าง Nginx ชื่อ `nginx-a`
2. เปิด `nginx-a` ผ่าน `http://localhost:8081`
3. สร้าง Nginx ชื่อ `nginx-b`
4. เปิด `nginx-b` ผ่าน `http://localhost:8082`
5. ให้ทั้งสอง Container ใช้ Container Port `80`
6. เปลี่ยน `index.html` ของ `nginx-a` เป็น `<h1>I am nginx A</h1>`
7. เปลี่ยน `index.html` ของ `nginx-b` เป็น `<h1>I am nginx B</h1>`
8. ตรวจสอบว่า Port `8081` แสดงหน้า A และ Port `8082` แสดงหน้า B
9. ใช้ `docker port` ตรวจสอบ Mapping ของทั้งสอง Container
10. ลองสร้าง Container ตัวที่สามโดยใช้ Host Port `8081` ซ้ำ และสังเกต Error
11. ลบ Container ทั้งหมดเมื่อทำเสร็จ

<details>
<summary>ดูเฉลย</summary>

สร้าง Container A และ B:

```bash
docker run -d --name nginx-a -p 8081:80 nginx
docker run -d --name nginx-b -p 8082:80 nginx
```

แก้ไขหน้าเว็บไซต์:

```bash
docker exec nginx-a sh -c "echo '<h1>I am nginx A</h1>' > /usr/share/nginx/html/index.html"
docker exec nginx-b sh -c "echo '<h1>I am nginx B</h1>' > /usr/share/nginx/html/index.html"
```

เปิด Browser ที่:

```text
http://localhost:8081
http://localhost:8082
```

ตรวจสอบ Port Mapping:

```bash
docker port nginx-a
docker port nginx-b
```

ทดลองใช้ Host Port ซ้ำ:

```bash
docker run -d --name nginx-c -p 8081:80 nginx
```

ล้าง Container ทั้งหมด รวมถึง `nginx-c` ที่อาจถูกสร้างค้างไว้แม้ Start ไม่สำเร็จ:

```bash
docker rm -f nginx-a nginx-b nginx-c
```

</details>

---

## เส้นทางการเรียนรู้

```text
Workshop 01
Image / Container
        │
        ▼
Workshop 02
Logs / Exec / Inspect
        │
        ▼
Workshop 03
Port Mapping
        │
        ▼
Workshop 04
Dockerfile
```

Workshop ถัดไปเราจะสร้าง Docker Image ของเราเองด้วย `Dockerfile`
