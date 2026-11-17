# Workshop 09 — Docker Compose

Workshop นี้สาธิตการใช้ Docker Compose เพื่อจัดการหลาย container พร้อมกัน โดยมี 3 services:

- users-api — ให้ข้อมูลผู้ใช้
- orders-api — ให้ข้อมูลคำสั่งซื้อและเรียก users-api ภายใน Docker network
- redis — ทดลองใช้ named volume เพื่อเก็บข้อมูลแบบ persistent

แทนที่จะสั่ง docker build, docker network create และ docker run ทีละ container เราจะอธิบายระบบทั้งหมดไว้ในไฟล์ compose.yaml แล้วจัดการด้วยคำสั่ง docker compose

## สิ่งที่จะได้เรียนรู้

หลังจบ Workshop นี้ควรเข้าใจเรื่องต่อไปนี้:

- โครงสร้างของไฟล์ compose.yaml
- ความแตกต่างระหว่าง service, image และ container
- การ build image จาก Dockerfile ผ่าน Compose
- การส่ง environment variables จากไฟล์ .env
- การ map port แบบ HOST:CONTAINER
- การสื่อสารระหว่าง services ด้วย service name
- Default network และ DNS ของ Docker Compose
- การใช้ named volume
- การดู logs และเข้าไปตรวจสอบภายใน container
- การ rebuild หลังแก้ source code
- ความแตกต่างระหว่าง stop, down และ down -v

## Architecture

~~~text
Browser
   |
   | http://localhost:9000/orders/100
   v
orders-api:3002
   |
   | http://users-api:3001
   v
users-api:3001

redis:6379
   |
   v
redis-data (named volume)
~~~

Browser เข้าถึงเฉพาะ orders-api ผ่าน host port 9000 ส่วน users-api ไม่ได้เปิด port ออกมาที่ host เพราะใช้สำหรับการสื่อสารภายใน Compose network เท่านั้น

## โครงสร้างโปรเจกต์

~~~text
workshop09-compose/
├── .env
├── compose.yaml
├── README.md
├── users-api/
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package.json
│   ├── pnpm-lock.yaml
│   └── server.js
└── orders-api/
    ├── .dockerignore
    ├── Dockerfile
    ├── package.json
    ├── pnpm-lock.yaml
    └── server.js
~~~

## Services

### users-api

ทำงานที่ container port 3001 และมี endpoints:

| Method | Endpoint | รายละเอียด |
| --- | --- | --- |
| GET | /health | ตรวจสอบสถานะ service |
| GET | /users/:id | อ่านข้อมูลผู้ใช้ตาม ID |

ตัวอย่าง:

~~~http
GET /users/1
~~~

ผลลัพธ์:

~~~json
{
  "id": 1,
  "name": "James",
  "department": "IT"
}
~~~

### orders-api

ทำงานที่ container port 3002 และเปิดให้ host เข้าถึงผ่าน port 9000

| Method | Endpoint | รายละเอียด |
| --- | --- | --- |
| GET | /health | ตรวจสอบสถานะ service |
| GET | /orders/:id | อ่าน order พร้อมข้อมูล user |

เมื่อเรียก /orders/100 จะเกิด flow ดังนี้:

1. orders-api ค้นหา order หมายเลข 100
2. อ่าน userId จาก order
3. เรียก http://users-api:3001/users/1
4. users-api ส่งข้อมูล user กลับมา
5. orders-api รวม order และ user เป็น JSON เดียว

ผลลัพธ์ตัวอย่าง:

~~~json
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
~~~

## Dockerfile

ทั้งสอง API ใช้แนวทางเดียวกัน:

~~~dockerfile
FROM node:24

WORKDIR /app

RUN npm install --global pnpm@12

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3001

CMD ["pnpm", "start"]
~~~

orders-api ใช้ EXPOSE 3002 แทน 3001

### ทำไมต้อง COPY package.json และ pnpm-lock.yaml ก่อน

Container build มองไม่เห็นไฟล์จากเครื่อง host จนกว่าเราจะ COPY ไฟล์เข้า build context

การแยก COPY dependency files ออกจาก source code ยังช่วยให้ Docker ใช้ layer cache ได้:

~~~dockerfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
~~~

ถ้าแก้เฉพาะ server.js แต่ dependencies ไม่เปลี่ยน Docker สามารถใช้ layer pnpm install เดิมได้ ทำให้ build เร็วขึ้น

ถ้าเขียน COPY . . ก่อน pnpm install การแก้ source code เพียงไฟล์เดียวอาจทำให้ต้องติดตั้ง dependencies ใหม่ทั้งหมด

### ทำไมต้องใช้ --frozen-lockfile

คำสั่งนี้บอก pnpm ว่า:

- ให้ติดตั้งตาม pnpm-lock.yaml
- ห้ามแก้ lockfile ระหว่าง Docker build
- ถ้า package.json และ lockfile ไม่ตรงกัน ให้ build ล้มเหลวทันที

เมื่อเพิ่ม dependency ควรรันบนเครื่อง development ก่อน:

~~~powershell
pnpm.cmd add express dotenv
~~~

จากนั้น commit ทั้ง package.json และ pnpm-lock.yaml แล้วจึง build image ใหม่

## .dockerignore

ไฟล์ .dockerignore ควรอยู่ที่ root ของ build context

ในโปรเจกต์นี้แต่ละ service ใช้ context ของตัวเอง:

~~~yaml
build:
  context: ./users-api
~~~

ดังนั้น users-api/.dockerignore ต้องอยู่ระดับเดียวกับ users-api/Dockerfile

ตัวอย่าง:

~~~dockerignore
node_modules
.git
.env*
pnpm-debug*
~~~

ประโยชน์:

- ไม่ส่ง node_modules จาก host เข้า Docker build
- ลดขนาด build context
- ลดโอกาสนำไฟล์ secret เข้า image
- ป้องกันไฟล์จาก host ชนกับ dependencies ที่ติดตั้งใน container

## Environment variables

ไฟล์ .env ที่ root ของ Compose project:

~~~dotenv
ORDERS_HOST_PORT=9000
USERS_PORT=3001
ORDERS_PORT=3002
~~~

Compose จะนำค่าเหล่านี้ไปแทนที่ตัวแปรรูปแบบ ${VARIABLE_NAME}

ข้อควรระวัง: ต้องเขียนทั้งเครื่องหมาย ${ และ } ให้ครบ

ถูกต้อง:

~~~yaml
ports:
  - "${ORDERS_HOST_PORT}:${ORDERS_PORT}"
~~~

ไม่ถูกต้อง:

~~~yaml
ports:
  - "${ORDERS_HOST_PORT}:$ORDERS_PORT}"
~~~

รูปแบบที่ไม่ครบอาจทำให้เกิด error:

~~~text
invalid containerPort: 3002}
~~~

## compose.yaml

~~~yaml
services:
  users-api:
    build:
      context: ./users-api
    environment:
      PORT: ${USERS_PORT}

  orders-api:
    build:
      context: ./orders-api
    environment:
      PORT: ${ORDERS_PORT}
      USERS_API_URL: http://users-api:${USERS_PORT}
    ports:
      - "${ORDERS_HOST_PORT}:${ORDERS_PORT}"

  redis:
    image: redis:7
    volumes:
      - redis-data:/data

volumes:
  redis-data:
~~~

## อธิบาย compose.yaml

### services

services คือรายการ application หรือ infrastructure ที่ Compose ต้องจัดการ

~~~yaml
services:
  users-api:
  orders-api:
  redis:
~~~

โดยทั่วไปแต่ละ service จะสร้าง container ของตัวเอง

### build

~~~yaml
users-api:
  build:
    context: ./users-api
~~~

หมายถึงให้ Compose เข้าไปที่โฟลเดอร์ users-api แล้วใช้ Dockerfile ในโฟลเดอร์นั้นสร้าง image

แนวคิดเดียวกับ:

~~~powershell
docker build ./users-api
~~~

### image

~~~yaml
redis:
  image: redis:7
~~~

หมายถึงใช้ image ที่มีอยู่แล้ว โดย Compose จะ pull จาก registry หากเครื่องยังไม่มี image นี้

สรุป:

- build — สร้าง image จาก Dockerfile ของเรา
- image — ใช้ image ที่มีอยู่แล้ว

### environment

~~~yaml
environment:
  PORT: ${ORDERS_PORT}
  USERS_API_URL: http://users-api:${USERS_PORT}
~~~

เทียบได้กับการส่ง -e ตอนใช้ docker run

Node.js อ่านค่าเหล่านี้ผ่าน:

~~~js
process.env.PORT
process.env.USERS_API_URL
~~~

### ports

~~~yaml
ports:
  - "${ORDERS_HOST_PORT}:${ORDERS_PORT}"
~~~

รูปแบบคือ:

~~~text
HOST_PORT:CONTAINER_PORT
~~~

เมื่อค่าใน .env คือ 9000 และ 3002 จะได้:

~~~text
localhost:9000 -> orders-api container:3002
~~~

### volumes

~~~yaml
redis:
  volumes:
    - redis-data:/data

volumes:
  redis-data:
~~~

redis-data คือ named volume และ /data คือตำแหน่งภายใน Redis container

ข้อมูลใน named volume มี lifecycle แยกจาก container ดังนั้นการลบและสร้าง container ใหม่ไม่ได้หมายความว่าข้อมูลจะหายไปด้วย

## Compose network และ service discovery

Docker Compose สร้าง default network ให้ project อัตโนมัติ และนำทุก service เข้า network เดียวกัน

Service สามารถเรียกกันด้วย service name:

~~~text
http://users-api:3001
~~~

ไม่ควรใช้ localhost จาก orders-api เพื่อเรียก users-api เพราะ localhost ภายใน container หมายถึง container ตัวนั้นเอง

| ตำแหน่งที่เรียก | URL |
| --- | --- |
| Browser บน host | http://localhost:9000 |
| orders-api เรียก users-api | http://users-api:3001 |

Compose project ชื่อ workshop09-compose อาจสร้าง network ชื่อประมาณ:

~~~text
workshop09-compose_default
~~~

## เริ่มใช้งาน

เข้าโฟลเดอร์:

~~~powershell
cd D:\skill\docker\docker-workshop\workshop09-compose
~~~

ตรวจสอบ Compose configuration หลังแทนค่า environment variables:

~~~powershell
docker compose config
~~~

Build และรันพร้อมแสดง logs:

~~~powershell
docker compose up --build
~~~

รันแบบ background:

~~~powershell
docker compose up -d --build
~~~

ตรวจสอบสถานะ:

~~~powershell
docker compose ps
~~~

เปิดใน Browser:

~~~text
http://localhost:9000/orders/100
~~~

## คำสั่งที่ใช้บ่อย

### ดู logs

ดูทุก service:

~~~powershell
docker compose logs
~~~

ติดตามแบบ realtime:

~~~powershell
docker compose logs -f
~~~

ดูเฉพาะ orders-api:

~~~powershell
docker compose logs -f orders-api
~~~

### เข้า container

~~~powershell
docker compose exec users-api bash
~~~

จากนั้นสามารถตรวจสอบได้ เช่น:

~~~bash
pwd
node --version
~~~

ออกจาก container:

~~~bash
exit
~~~

### ทดสอบ network ภายใน

~~~powershell
docker compose exec orders-api node -e "fetch('http://users-api:3001/users/1').then(r => r.text()).then(console.log)"
~~~

ถ้าทำงานถูกต้องควรได้:

~~~json
{"id":1,"name":"James","department":"IT"}
~~~

## Rebuild หลังแก้โค้ด

Dockerfile ใช้ COPY . . และโปรเจกต์ไม่ได้ bind mount source code ดังนั้นเมื่อแก้ server.js ต้อง build image ใหม่:

~~~powershell
docker compose up -d --build
~~~

ไม่จำเป็นต้องลบ container หรือ image ด้วยตัวเอง Compose จะตรวจ image ที่เปลี่ยนและ recreate service ที่จำเป็นให้

ถ้าต้องการบังคับสร้าง container ใหม่ทั้งหมด:

~~~powershell
docker compose up -d --build --force-recreate
~~~

โดยทั่วไปไม่จำเป็นต้องใช้ --no-cache ถ้า Dockerfile และ source code เปลี่ยนตามปกติ

## Container lifecycle

### หยุดชั่วคราว

~~~powershell
docker compose stop
~~~

Container ยังอยู่ สามารถเริ่มใหม่ได้ด้วย:

~~~powershell
docker compose start
~~~

### หยุดและลบ containers

~~~powershell
docker compose down
~~~

คำสั่งนี้ลบ:

- Containers ของ Compose project
- Default network ของ Compose project

แต่ไม่ลบ named volume โดยอัตโนมัติ

### ลบรวม named volumes

~~~powershell
docker compose down -v
~~~

คำเตือน: -v จะลบข้อมูลใน named volumes ของ project ด้วย ไม่ควรใช้กับข้อมูลสำคัญโดยไม่ตรวจสอบก่อน

## ทดลอง Redis persistence

เขียนค่าเข้า Redis:

~~~powershell
docker compose exec redis redis-cli SET workshop "Docker Compose 09"
~~~

อ่านค่า:

~~~powershell
docker compose exec redis redis-cli GET workshop
~~~

ควรได้:

~~~text
Docker Compose 09
~~~

ลบ containers และ network:

~~~powershell
docker compose down
~~~

สร้างระบบใหม่:

~~~powershell
docker compose up -d
~~~

อ่านค่าอีกครั้ง:

~~~powershell
docker compose exec redis redis-cli GET workshop
~~~

ข้อมูลควรยังอยู่ เพราะ redis-data มี lifecycle แยกจาก Redis container

## Troubleshooting

### pnpm add ดูเหมือนค้าง

ตรวจสอบว่า package.json pin เวอร์ชัน pnpm ไว้หรือไม่:

~~~json
{
  "packageManager": "pnpm@12.21.0",
  "devEngines": {
    "packageManager": {
      "name": "pnpm",
      "version": "12.21.0",
      "onFail": "download"
    }
  }
}
~~~

ถ้า pnpm ในเครื่องเป็นคนละเวอร์ชันและ onFail เป็น download ตัว pnpm อาจดาวน์โหลดเวอร์ชันที่ project กำหนดก่อน จึงดูเหมือนค้าง

บน PowerShell ที่บล็อก pnpm.ps1 สามารถเรียก pnpm.cmd ได้:

~~~powershell
pnpm.cmd add express dotenv
~~~

### Service exited with code 0

ตัวอย่าง:

~~~text
orders-api-1 exited with code 0
~~~

exit code 0 หมายถึงโปรแกรมไม่ได้ crash แต่ทำงานจบเอง สำหรับ Express มักเกิดจากลืมเรียก app.listen

~~~js
app.listen(PORT, "0.0.0.0", () => {
  console.log("Orders API is running");
});
~~~

ต้อง bind ที่ 0.0.0.0 เพื่อให้รับ connection จากภายนอก container ได้

### Body is unusable: Body has already been read

Fetch response body อ่านได้ครั้งเดียว และไม่ควรตั้งชื่อตัวแปรซ้ำกับ Express response

ไม่ควรเขียน:

~~~js
const res = await fetch(url);
const user = await res.json();
res.json({ user });
~~~

ควรแยกชื่อให้ชัดเจน:

~~~js
const response = await fetch(url);
const user = await response.json();

res.json({
  user,
});
~~~

ในตัวอย่างที่ถูกต้อง:

- response คือ Fetch Response
- res คือ Express Response

### invalid containerPort

ตรวจ syntax ของตัวแปรใน ports:

~~~yaml
ports:
  - "${ORDERS_HOST_PORT}:${ORDERS_PORT}"
~~~

ใช้คำสั่งนี้ตรวจ configuration ก่อนรัน:

~~~powershell
docker compose config
~~~

### orders-api ติดต่อ users-api ไม่ได้

ตรวจสอบตามลำดับ:

1. users-api ต้องกำลังรัน
2. users-api ต้อง listen ที่ 0.0.0.0
3. orders-api ต้องใช้ http://users-api:3001 ไม่ใช่ localhost
4. ทั้งสอง services ต้องอยู่ใน Compose project เดียวกัน
5. ตรวจ logs ของทั้งสอง services

~~~powershell
docker compose ps
docker compose logs users-api
docker compose logs orders-api
~~~

## Command summary

| คำสั่ง | ใช้ทำอะไร |
| --- | --- |
| docker compose config | ตรวจและแสดง config หลังแทนค่าตัวแปร |
| docker compose up | สร้างและรัน services พร้อม logs |
| docker compose up -d | รัน services แบบ background |
| docker compose up -d --build | Build image ใหม่และรัน |
| docker compose ps | ดูสถานะ services |
| docker compose logs -f | ติดตาม logs |
| docker compose exec SERVICE bash | เข้า shell ของ service |
| docker compose stop | หยุด containers แต่ไม่ลบ |
| docker compose start | เริ่ม containers เดิม |
| docker compose down | ลบ containers และ network |
| docker compose down -v | ลบ containers, network และ volumes |

## Mini Challenge

1. เปลี่ยน ORDERS_HOST_PORT ใน .env จาก 9000 เป็นค่าอื่น
2. ใช้ docker compose config ตรวจสอบค่าที่ Compose resolve
3. รันระบบด้วย docker compose up -d --build
4. เรียก /orders/100 ผ่าน host port ใหม่
5. ตรวจว่า users-api ไม่มี host port แต่ orders-api ยังเรียกได้
6. ใช้ docker compose logs -f orders-api
7. เข้า users-api แล้วตรวจ node --version
8. เขียนค่าเข้า Redis
9. ใช้ docker compose down แล้วสร้างระบบใหม่
10. ตรวจว่าข้อมูล Redis ยังอยู่
11. ปิดระบบด้วย docker compose down โดยยังไม่ใช้ -v

## สรุป

ก่อนใช้ Compose เราต้องจัดการ Dockerfile, network, ports, environment variables, containers และ volumes แยกกัน

หลังใช้ Compose เราสามารถอธิบายระบบทั้งหมดไว้ใน compose.yaml และจัดการ lifecycle ด้วยคำสั่งชุดเดียว

~~~text
compose.yaml
   |
   +-- services
   |    +-- users-api
   |    +-- orders-api
   |    +-- redis
   |
   +-- default network
   +-- environment variables
   +-- port mappings
   +-- named volumes
~~~

Compose ไม่ได้แทนที่พื้นฐาน Docker แต่รวมสิ่งที่เรียนมาให้เป็น configuration ที่อ่านได้ ทำซ้ำได้ และดูแลได้ง่ายขึ้น

## เอกสารอ้างอิง

- [Docker Compose documentation](https://docs.docker.com/compose/)
- [Docker build context และ .dockerignore](https://docs.docker.com/build/concepts/context/)
- [pnpm และ Docker](https://pnpm.io/docker)

