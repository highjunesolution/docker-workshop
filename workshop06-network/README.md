# Workshop 06: Docker Network — ให้ Container คุยกัน

Workshop นี้ต่อยอดจากการรัน Container เดี่ยว ไปสู่ Application ที่มีหลาย Service โดยให้ `orders-api` เรียกข้อมูลผู้ใช้จาก `users-api` ผ่าน Docker Network

Architecture ที่เราจะสร้าง:

```text
Browser / Windows Host
        │
        │ http://localhost:8082/orders/100
        ▼
┌──────────────────────────────┐
│ orders-api Container         │
│ Node.js :3002                │
│                              │
│ GET /orders/:id              │
└──────────────┬───────────────┘
               │
               │ http://users-api:3001/users/1
               ▼
┌──────────────────────────────┐
│ users-api Container          │
│ Node.js :3001                │
│                              │
│ GET /users/:id               │
└──────────────────────────────┘

         Docker Network: workshop06-net
```

หัวใจสำคัญของ Workshop นี้คือ:

> Container A ไม่ควรเรียก Container B ด้วย `localhost` เพราะ `localhost` ของแต่ละ Container หมายถึง Container ตัวนั้นเอง

เมื่อเรียนจบ Workshop นี้ คุณจะสามารถ:

- อธิบายความหมายของ `localhost` ในแต่ละ Container ได้
- สร้าง User-defined Bridge Network ได้
- ให้ Container ติดต่อกันด้วยชื่อ Container ผ่าน Docker DNS ได้
- แยกความแตกต่างระหว่าง Host Port และ Container Port ได้
- ซ่อน Internal Service ไม่ให้เข้าถึงโดยตรงจาก Host ได้
- ตรวจสอบและแก้ปัญหา Network ระหว่าง Container ได้

---

## 1. ทำความเข้าใจ `localhost`

สมมติว่าในเครื่องมี Process แยกกัน 3 ส่วน:

```text
Windows Host
├── users-api Container
└── orders-api Container
```

คำว่า `localhost` จะอ้างถึงเครื่องหรือ Container ที่กำลังรันคำสั่งนั้น:

| ตำแหน่งที่เรียก | `localhost` หมายถึง |
| --- | --- |
| Windows Host | Windows เครื่องปัจจุบัน |
| `users-api` Container | `users-api` เอง |
| `orders-api` Container | `orders-api` เอง |

ดังนั้น หากโค้ดใน `orders-api` เรียก:

```javascript
fetch("http://localhost:3001/users/1");
```

มันกำลังมองหา Service ที่ Port `3001` **ภายใน `orders-api` เอง** ไม่ได้กำลังเรียก `users-api`

ค่าที่ถูกต้องเมื่อทั้งสอง Container อยู่ใน Docker Network เดียวกันคือ:

```javascript
fetch("http://users-api:3001/users/1");
```

Docker จะใช้ DNS ภายในแปลงชื่อ `users-api` เป็น IP ของ Container ให้โดยอัตโนมัติ

---

## 2. โครงสร้าง Project

```text
workshop06-network/
│
├── README.md
├── .gitignore
│
├── users-api/
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── server.js
│
└── orders-api/
    ├── .dockerignore
    ├── Dockerfile
    ├── package.json
    ├── pnpm-lock.yaml
    └── server.js
```

| Service | Container Port | หน้าที่ |
| --- | ---: | --- |
| `users-api` | `3001` | คืนข้อมูลผู้ใช้ |
| `orders-api` | `3002` | คืนข้อมูล Order และเรียกข้อมูลผู้ใช้จาก `users-api` |

ทั้งสอง Service ใช้ Node.js 22, Express, ES Modules และ `pnpm`

---

## 3. สำรวจ Users API

ไฟล์ `users-api/server.js` เก็บข้อมูลผู้ใช้ตัวอย่าง และเปิด Endpoint ต่อไปนี้:

| Method | Path | ผลลัพธ์ |
| --- | --- | --- |
| `GET` | `/users/1` | ข้อมูลของ James |
| `GET` | `/users/2` | ข้อมูลของ Kevin |
| `GET` | `/users/:id` | HTTP `404` เมื่อไม่พบผู้ใช้ |

ส่วนสำคัญของโค้ด:

```javascript
app.get("/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  res.json(user);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Users API running on port ${PORT}`);
});
```

Application ต้อง Listen ที่ `0.0.0.0` เพื่อรับ Request ที่ส่งเข้ามาทาง Network Interface ของ Container

---

## 4. สำรวจ Orders API

ไฟล์ `orders-api/server.js` อ่าน URL ของ Users API จาก Environment Variable:

```javascript
const USERS_API_URL =
  process.env.USERS_API_URL || "http://users-api:3001";
```

เมื่อมี Request มาที่ `/orders/:id` โปรแกรมจะ:

1. ค้นหา Order ตาม `id`
2. อ่าน `userId` จาก Order
3. เรียก `${USERS_API_URL}/users/${order.userId}`
4. รวมข้อมูล Order และ User เป็น Response เดียว

```javascript
const response = await fetch(
  `${USERS_API_URL}/users/${order.userId}`
);

const user = await response.json();

res.json({
  ...order,
  user,
});
```

Node.js 22 มี `fetch()` ให้ใช้งานอยู่แล้ว จึงไม่จำเป็นต้องติดตั้ง Axios สำหรับตัวอย่างนี้

การใช้ Environment Variable ช่วยให้เปลี่ยนปลายทางได้โดยไม่ต้องแก้ Source Code:

| Environment | ตัวอย่าง URL |
| --- | --- |
| Local Development | `http://localhost:3001` |
| Docker Network | `http://users-api:3001` |
| Kubernetes | `http://users-service:3001` |

---

## 5. Dockerfile ของทั้งสอง Service

Dockerfile ของทั้งสอง Service มีโครงสร้างเหมือนกัน ต่างกันเฉพาะ Port ที่เปิดไว้:

```dockerfile
FROM node:22

WORKDIR /app

RUN npm install --global pnpm@12

COPY package*.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3001

CMD [ "pnpm", "start" ]
```

สำหรับ `orders-api` จะใช้ `EXPOSE 3002`

| Instruction | หน้าที่ |
| --- | --- |
| `FROM node:22` | ใช้ Node.js 22 เป็น Base Image |
| `WORKDIR /app` | กำหนด Working Directory ภายใน Image |
| `RUN npm install --global pnpm@12` | ติดตั้ง `pnpm` ใน Image |
| `COPY package*.json pnpm-lock.yaml ./` | คัดลอกไฟล์ Dependency ก่อนเพื่อใช้ Build Cache |
| `RUN pnpm install --frozen-lockfile` | ติดตั้ง Dependency ตาม Lockfile |
| `COPY . .` | คัดลอก Source Code เข้า Image |
| `EXPOSE` | ระบุ Container Port ที่ Application ใช้ |
| `CMD` | เริ่ม Application ด้วย `pnpm start` |

> `EXPOSE` เป็นข้อมูลกำกับของ Image ไม่ได้ Publish Port ออกมาที่ Host การ Publish Port ต้องใช้ `-p` ตอน `docker run`

---

## 6. Build Docker Images

เปิด Terminal ที่ Directory `workshop06-network` แล้ว Build ทั้งสอง Image:

```bash
docker build -t workshop06-users-api:1.0 ./users-api
docker build -t workshop06-orders-api:1.0 ./orders-api
```

ตรวจสอบ Image:

```bash
docker images
```

ควรพบ Image ต่อไปนี้:

```text
REPOSITORY                     TAG
workshop06-users-api           1.0
workshop06-orders-api          1.0
```

ตอนนี้เรามี Image แล้ว แต่ยังไม่มี Container ที่กำลังทำงาน

---

## 7. สร้าง Docker Network

ดู Network ที่มีอยู่:

```bash
docker network ls
```

สร้าง User-defined Bridge Network ชื่อ `workshop06-net`:

```bash
docker network create workshop06-net
```

ตรวจสอบอีกครั้ง:

```bash
docker network ls
```

แนวคิดของ Network นี้เปรียบได้กับ LAN ภายในสำหรับ Application:

```text
┌──────────────────────────────────────┐
│ Docker Network: workshop06-net       │
│                                      │
│   users-api          orders-api      │
│     :3001              :3002         │
│                                      │
└──────────────────────────────────────┘
```

Container ที่อยู่ใน User-defined Network เดียวกันจะติดต่อกันด้วยชื่อ Container ได้ผ่าน Docker DNS โดยไม่ต้องจำ IP

---

## 8. Run Users API

รัน `users-api` และเชื่อมต่อกับ `workshop06-net`:

```bash
docker run -d \
  --name users-api \
  --network workshop06-net \
  -p 8081:3001 \
  workshop06-users-api:1.0
```

> หากใช้ PowerShell และต้องการวางคำสั่งแบบบรรทัดเดียว ให้ลบ `\` และขึ้นบรรทัดใหม่ทั้งหมดออก

ความหมายของ Option:

| Option | ความหมาย |
| --- | --- |
| `-d` | รัน Container แบบ Background |
| `--name users-api` | ตั้งชื่อ Container และใช้ชื่อนี้เป็น Hostname ภายใน Network |
| `--network workshop06-net` | เชื่อม Container เข้ากับ Network |
| `-p 8081:3001` | ส่ง Traffic จาก Host Port `8081` ไป Container Port `3001` |

ทดสอบจาก Browser:

```text
http://localhost:8081/users/1
```

ผลลัพธ์ที่ควรได้:

```json
{
  "id": 1,
  "name": "James",
  "department": "IT"
}
```

---

## 9. Run Orders API

รัน `orders-api` ใน Network เดียวกัน และส่ง URL ของ Users API ผ่าน Environment Variable:

```bash
docker run -d \
  --name orders-api \
  --network workshop06-net \
  -e USERS_API_URL=http://users-api:3001 \
  -p 8082:3002 \
  workshop06-orders-api:1.0
```

จุดสำคัญคือ:

```text
USERS_API_URL=http://users-api:3001
```

- `users-api` คือชื่อ Container ที่ Docker DNS ใช้ค้นหา
- `3001` คือ Port ภายใน `users-api` Container
- ไม่ใช้ `localhost` เพราะจะหมายถึง `orders-api` เอง
- ไม่ใช้ IP โดยตรง เพราะ IP อาจเปลี่ยนเมื่อสร้าง Container ใหม่

ตรวจสอบ Container:

```bash
docker ps
```

---

## 10. ทดสอบ API-to-API Communication

เปิด URL ต่อไปนี้:

```text
http://localhost:8082/orders/100
```

ผลลัพธ์ที่ควรได้:

```json
{
  "id": 100,
  "product": "Keyboard",
  "quantity": 1,
  "userId": 1,
  "user": {
    "id": 1,
    "name": "James",
    "department": "IT"
  }
}
```

ทดลอง Order อีกชุด:

```text
http://localhost:8082/orders/101
```

```json
{
  "id": 101,
  "product": "Mouse",
  "quantity": 2,
  "userId": 2,
  "user": {
    "id": 2,
    "name": "Kevin",
    "department": "Engineering"
  }
}
```

Request เดียวจาก Browser ทำให้เกิดการสื่อสารระหว่างสอง API จริง

---

## 11. Request เดินทางอย่างไร

เมื่อ Browser เปิด `http://localhost:8082/orders/100` Request จะเดินทางดังนี้:

```text
Browser
   │
   │ localhost:8082
   ▼
Windows Host
   │
   │ Port Mapping 8082 → 3002
   ▼
orders-api:3002
   │
   │ fetch("http://users-api:3001/users/1")
   ▼
Docker DNS
   │
   │ resolve ชื่อ users-api
   ▼
users-api:3001
   │
   │ ส่ง JSON User กลับ
   ▼
orders-api
   │
   │ รวม Order + User
   ▼
Browser
```

นี่คือพื้นฐานของการสื่อสารแบบ Service-to-Service ใน Microservices Architecture

---

## 12. Host Port กับ Container Port

มีเส้นทางการเรียกใช้งานสองแบบที่ต้องแยกให้ออก:

### จาก Host เข้า Container

```text
Windows Host
localhost:8081
      │
      │ -p 8081:3001
      ▼
users-api:3001
```

### จาก Container ไป Container

```text
orders-api
      │
      │ Docker Network
      ▼
users-api:3001
```

`orders-api` ต้องเรียก `users-api:3001` ไม่ใช่ `users-api:8081` เพราะ Port `8081` เป็น Host Port ซึ่งมีไว้สำหรับ Traffic ที่เข้าจาก Host

| ต้นทาง | ปลายทาง | URL ที่ใช้ |
| --- | --- | --- |
| Windows Host | `users-api` | `http://localhost:8081` |
| Windows Host | `orders-api` | `http://localhost:8082` |
| `orders-api` Container | `users-api` | `http://users-api:3001` |
| `users-api` Container | `orders-api` | `http://orders-api:3002` |
| `orders-api` | ตัวเอง | `http://localhost:3002` |

> ภายใน `orders-api` คำว่า `localhost` หมายถึง `orders-api` ไม่ใช่ Windows Host และไม่ใช่ `users-api`

---

## 13. ตรวจสอบ Docker Network และ DNS

ดูรายละเอียดของ Network:

```bash
docker network inspect workshop06-net
```

ในส่วน `Containers` จะเห็นข้อมูลลักษณะนี้:

```json
{
  "Name": "users-api",
  "IPv4Address": "172.18.0.2/16"
}
```

IP จริงอาจต่างจากตัวอย่างและอาจเปลี่ยนเมื่อสร้าง Container ใหม่ Application จึงควรใช้ชื่อ `users-api` แทนการ Hardcode IP

ทดสอบการเรียก Users API จากภายใน Orders Container โดยตรง:

```bash
docker exec orders-api node -e "fetch('http://users-api:3001/users/1').then(r => r.text()).then(console.log)"
```

ผลลัพธ์ที่ควรได้:

```json
{"id":1,"name":"James","department":"IT"}
```

คำสั่งนี้พิสูจน์ว่า `orders-api` ติดต่อ `users-api` ผ่าน Docker Network โดยไม่ผ่าน Host Port `8081`

---

## 14. ทดลองให้พังด้วย `localhost`

ลบ `orders-api` เดิม:

```bash
docker rm -f orders-api
```

สร้างใหม่โดยจงใจตั้ง URL ผิดเป็น `localhost:3001`:

```bash
docker run -d \
  --name orders-api \
  --network workshop06-net \
  -e USERS_API_URL=http://localhost:3001 \
  -p 8082:3002 \
  workshop06-orders-api:1.0
```

เปิด `http://localhost:8082/orders/100` แล้วควรได้รับ Error:

```json
{
  "message": "Cannot communicate with users-api"
}
```

ตรวจสอบ Log:

```bash
docker logs orders-api
```

สาเหตุคือ `localhost:3001` ชี้กลับมาที่ `orders-api` เอง แต่ `orders-api` Listen อยู่ที่ Port `3002` และ `users-api` อยู่คนละ Container

แก้กลับให้ถูกต้อง:

```bash
docker rm -f orders-api

docker run -d \
  --name orders-api \
  --network workshop06-net \
  -e USERS_API_URL=http://users-api:3001 \
  -p 8082:3002 \
  workshop06-orders-api:1.0
```

จากนั้นทดสอบ `http://localhost:8082/orders/100` อีกครั้ง

---

## 15. ซ่อน Users API จาก Host

หากผู้ใช้ภายนอกไม่จำเป็นต้องเรียก `users-api` โดยตรง เราไม่จำเป็นต้อง Publish Port ของ Service นี้

ลบ Container เดิมแล้วสร้างใหม่โดยไม่มี `-p`:

```bash
docker rm -f users-api

docker run -d \
  --name users-api \
  --network workshop06-net \
  workshop06-users-api:1.0
```

ผลที่เกิดขึ้น:

- Host เข้า `http://localhost:8081` ไม่ได้
- `orders-api` ยังเรียก `http://users-api:3001` ได้
- Internal Service ไม่ถูกเปิดออกมาที่ Host โดยไม่จำเป็น

Production Architecture มักใช้แนวคิดเดียวกัน:

```text
Internet
   │
   ▼
Reverse Proxy :80 / :443
   │
   ▼
orders-api
   │
   ▼
users-api
   │
   ▼
Database
```

เปิดเฉพาะ Entry Point ที่จำเป็น ส่วน API และ Database ภายในสื่อสารกันผ่าน Private Network

---

## 16. Network Isolation

สร้าง Network อีกชุด:

```bash
docker network create another-net
```

หาก `users-api` อยู่ใน `workshop06-net` แต่ `orders-api` อยู่ใน `another-net` ทั้งสอง Container จะค้นหากันไม่พบ:

```text
workshop06-net             another-net
┌────────────────┐         ┌────────────────┐
│ users-api      │         │ orders-api     │
└────────────────┘         └────────────────┘
```

Container หนึ่งตัวสามารถเชื่อมต่อหลาย Network ได้:

```bash
docker network connect another-net users-api
```

ตรวจสอบและถอด Network เมื่อไม่ต้องการ:

```bash
docker inspect users-api
docker network disconnect another-net users-api
```

> Container ต้องอยู่ใน Network ร่วมกันอย่างน้อยหนึ่ง Network จึงจะติดต่อกันด้วยชื่อ Container ได้

---

## 17. Default Bridge กับ User-defined Bridge

ถ้าไม่ระบุ `--network` Docker จะนำ Container เข้า Default Network ชื่อ `bridge`

สำหรับ Application ที่มีหลาย Container ควรสร้าง User-defined Network โดยเฉพาะ:

```bash
docker network create my-network
docker run --network my-network ...
```

ข้อดีหลัก:

- ใช้ชื่อ Container เป็น Hostname ได้
- แยก Application ออกจาก Network ของระบบอื่น
- เชื่อมต่อหรือถอด Container ออกจาก Network ได้ง่าย
- ลดการพึ่งพา IP ที่เปลี่ยนแปลงได้

สร้าง Network ตามขอบเขตของ Application เช่น `transport-network`, `shopping-network` หรือ `rag-network` แทนการรวมทุก Container ไว้ใน Default Bridge

---

## 18. Mini Challenge 06

สร้าง Architecture ต่อไปนี้ด้วยตัวเอง:

```text
Browser
   │
   │ localhost:9002
   ▼
orders-api:3002
   │
   │ http://users-api:3001
   ▼
users-api:3001
```

เงื่อนไข:

1. สร้าง Network ชื่อ `company-network`
2. `users-api` ห้าม Publish Port ออกมาที่ Host
3. `orders-api` ต้อง Publish Port `9002` ไปยัง Container Port `3002`
4. `orders-api` ต้องเรียก `http://users-api:3001`
5. เปิด `http://localhost:9002/orders/100` แล้วต้องได้ทั้งข้อมูล Order และ User
6. `http://localhost:3001` และ `http://localhost:8081` ต้องเข้า `users-api` ไม่ได้
7. คำสั่งนี้ต้องทำงานได้:

```bash
docker exec orders-api node -e "fetch('http://users-api:3001/users/1').then(r => r.text()).then(console.log)"
```

<details>
<summary>ดูเฉลยคำสั่ง</summary>

```bash
docker network create company-network

docker run -d \
  --name users-api \
  --network company-network \
  workshop06-users-api:1.0

docker run -d \
  --name orders-api \
  --network company-network \
  -e USERS_API_URL=http://users-api:3001 \
  -p 9002:3002 \
  workshop06-orders-api:1.0
```

</details>

หากทำ Challenge นี้สำเร็จ แสดงว่าคุณเข้าใจความแตกต่างระหว่าง Host Networking และ Docker Internal Networking แล้ว

---

## 19. Troubleshooting

### Container ไม่ทำงาน

```bash
docker ps -a
docker logs users-api
docker logs orders-api
```

### ชื่อ Container ซ้ำ

```bash
docker rm -f users-api orders-api
```

แล้วจึงรัน Container ใหม่

### `orders-api` ติดต่อ `users-api` ไม่ได้

ตรวจสอบตามลำดับ:

1. ทั้งสอง Container กำลังทำงานหรือไม่
2. ทั้งสอง Container อยู่ Network เดียวกันหรือไม่
3. URL เป็น `http://users-api:3001` หรือไม่
4. ชื่อ Container ตรงกับ `users-api` หรือไม่
5. `users-api` Listen ที่ `0.0.0.0:3001` หรือไม่

คำสั่งที่ช่วยตรวจสอบ:

```bash
docker ps
docker network inspect workshop06-net
docker logs orders-api
docker exec orders-api node -e "fetch('http://users-api:3001/users/1').then(r => r.text()).then(console.log)"
```

---

## 20. Cleanup

ลบ Container:

```bash
docker rm -f users-api orders-api
```

ลบ Network ที่สร้างใน Workshop:

```bash
docker network rm workshop06-net
```

หากสร้าง Network สำหรับการทดลองหรือ Challenge แล้วไม่ใช้งาน ให้ลบเพิ่มเติม:

```bash
docker network rm another-net company-network
```

> Docker จะไม่ยอมลบ Network ที่ยังมี Container เชื่อมต่ออยู่ ต้องลบหรือ Disconnect Container ก่อน

---

## สรุป Workshop 06

จำหลักสำคัญ 4 ข้อนี้:

1. `localhost` ภายใน Container หมายถึง Container ตัวนั้นเอง
2. Container ที่อยู่ใน Docker Network เดียวกันสามารถติดต่อกันได้
3. ใช้ชื่อ Container หรือ Service เป็น Hostname เช่น `users-api:3001`
4. Container-to-Container ใช้ Container Port ไม่ใช่ Host Port

จาก Workshop ก่อนหน้า เรามี Flow แบบนี้:

```text
Browser → Container
```

Workshop นี้ขยายเป็น:

```text
Browser → API → API
```

Workshop ถัดไปจะเรียนเรื่อง Docker Volume เพื่อให้ข้อมูลยังคงอยู่แม้ Container ถูกลบและสร้างใหม่
