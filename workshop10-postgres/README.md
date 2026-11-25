# 🐳 Workshop 10 — Node.js + PostgreSQL + Docker Compose

> Workshop 09 เรามีหลาย Container แล้ว แต่ข้อมูลของ API ยังเป็น array ใน memory:

```javascript
const users = [
  { id: 1, name: "James" }
];
```

รอบนี้เราจะเปลี่ยนเป็น Database จริง และรวมสิ่งที่เรียนมาตั้งแต่ Workshop 06–09 เข้าด้วยกัน:

- Docker Network
- Docker Volume
- Environment Variables
- Docker Compose
- Healthcheck
- Node.js
- PostgreSQL

Architecture ที่เราจะสร้าง:

```text
Browser / Postman
       │
       │ localhost:8080
       ▼
┌─────────────────────┐
│ Node.js API         │
│ :3000               │
│                     │
│ Express + pg        │
└──────────┬──────────┘
           │
           │ db:5432
           ▼
┌─────────────────────┐
│ PostgreSQL 18       │
│ :5432               │
└──────────┬──────────┘
           │
           ▼
      postgres-data
      Docker Volume
```

> [!IMPORTANT]
> Node.js API ต้องเชื่อมต่อ PostgreSQL ด้วยชื่อ Service บน Compose network
>
> ❌ `localhost:5432`
> ✅ `db:5432`

เพราะ db คือชื่อ service ใน Docker Compose network

## 1. สิ่งใหม่ที่เพิ่มเข้ามาใน Workshop นี้

เราจะเจอ 3 แนวคิดใหม่หลัก ๆ:

1. **Database Container**
2. **Healthcheck**
3. **Database Initialization**

โดยเฉพาะ healthcheck สำคัญ เพราะ depends_on แบบธรรมดารับประกันแค่ว่า container Database ถูก start ก่อน แต่ไม่ได้หมายความว่า PostgreSQL พร้อมรับ connection แล้ว Docker แนะนำให้ใช้ condition: service_healthy ร่วมกับ healthcheck สำหรับกรณีนี้ Docker Documentation

## 2. สร้าง Project

สร้าง:
C:\docker-workshop\workshop10-postgres

โครงสร้างที่เราต้องการ:

```text
workshop10-postgres/
│
├── compose.yaml
├── .env
├── .gitignore
│
├── database/
│   └── init.sql
│
└── api/
    ├── Dockerfile
    ├── .dockerignore
    ├── package.json
    ├── package-lock.json
    └── server.js
```

เริ่มที่ root:

```bash
cd C:\docker-workshop
mkdir workshop10-postgres
cd workshop10-postgres

mkdir api
mkdir database
```

## 3. สร้าง Node.js API

เข้า:

```bash
cd api
```

สร้าง project:
npm init -y

ติดตั้ง:
npm install express pg

ตรงนี้มี package ใหม่:
pg

คือ PostgreSQL client สำหรับ Node.js

flow จะเป็น:

```text
Express
   │
   ▼
pg
   │
   ▼
PostgreSQL
```

## 4. แก้ package.json

ให้มี:

```json
"scripts": {
  "start": "node server.js"
}
```

ประมาณ:

```json
{
  "name": "workshop10-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "...",
    "pg": "..."
  }
}
```

version ที่ npm ติดตั้งให้ไม่จำเป็นต้องเหมือนตัวอย่าง

## 5. สร้าง server.js

เริ่มจาก version นี้:

```javascript
const express = require("express");
const { Pool } = require("pg");

const app = express();

app.use(express.json());

const PORT = Number(process.env.PORT ?? 3000);
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      api: "healthy",
      database: "connected",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.get("/api/employees", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        employee_code,
        name,
        department
      FROM employees
      ORDER BY id
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Cannot get employees",
    });
  }
});

app.post("/api/employees", async (req, res) => {
  try {
    const {
      employeeCode,
      name,
      department,
    } = req.body;

    const result = await pool.query(
      `
        INSERT INTO employees (
          employee_code,
          name,
          department
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          employee_code,
          name,
          department
      `,
      [employeeCode, name, department]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Cannot create employee",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);
});
```

## 6. Pool คืออะไร?

ตรงนี้:

```javascript
const { Pool } = require("pg");
```

แล้ว:

```javascript
const pool = new Pool({
  host: process.env.DB_HOST,
  ...
});
```

เราไม่ได้เปิด connection ใหม่แล้วปิดทุก request แบบง่าย ๆ

Pool จะจัดการกลุ่ม database connections ให้เรา

ประมาณ:

```text
Node.js API
    │
    ▼
Connection Pool
 ├── Connection 1
 ├── Connection 2
 ├── Connection 3
 └── ...
    │
    ▼
PostgreSQL
```

เวลา:
pool.query(...)

Pool จะเลือก connection ที่ว่างมาใช้

จบ query แล้ว connection จะกลับเข้ากองเพื่อใช้ครั้งต่อไป

แนวคิดนี้ใช้จริงกับ backend

## 7. ทำไม SQL ใช้ $1, $2, $3

เราเขียน:

```javascript
await pool.query(
  `
    INSERT INTO employees (
      employee_code,
      name,
      department
    )
    VALUES ($1, $2, $3)
  `,
  [employeeCode, name, department]
);
```

ไม่ควรเขียน:

```text
`INSERT INTO employees
 VALUES ('${employeeCode}', '${name}')`
```

เพราะการต่อ string จาก input โดยตรงเปิดทางให้ SQL Injection

pg จะส่ง:
SQL
+
Parameters

แยกจากกัน

คล้าย concept ที่คุณเคยใช้กับ SQL Server:
@EmployeeCode
@Name

PostgreSQL pg ใช้:
$1
$2
$3

## 8. สร้าง Dockerfile

ใน:

`api/Dockerfile`

ใส่:

```dockerfile
FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

เหมือนที่เราเรียน Workshop 05

## 9. .dockerignore

สร้าง:
api/.dockerignore

ใส่:

```text
node_modules
npm-debug.log
.git
.env
```

## 10. เตรียม PostgreSQL

กลับ root:

```bash
cd ..
```

ตอนนี้:

```text
workshop10-postgres/
├── api/
└── database/
```

เราจะใช้ Docker Official Image:
postgres:18

เอกสาร Docker ปัจจุบันก็ใช้ PostgreSQL 18 ในตัวอย่าง Compose/healthcheck เช่นกัน Docker Documentation

PostgreSQL Docker image รองรับ environment variables สำคัญ เช่น:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

โดย POSTGRES_PASSWORD เป็นค่าที่ต้องกำหนด ส่วน user/database สามารถกำหนดเองได้ GitHub

## 11. สร้าง .env

สร้างที่ root:
.env

ใส่:
APP_PORT=8080

```text
DB_HOST=db
DB_PORT=5432
DB_NAME=workshopdb
DB_USER=workshop_user
DB_PASSWORD=workshop_password
```

> [!WARNING]
> ตัวอย่างนี้ใช้รหัสผ่านสำหรับ Workshop เท่านั้น ห้ามนำรหัสผ่านนี้ไปใช้ใน Production

Production จริงอย่าใช้:
workshop_password

แบบนี้

## 12. ทำไม DB_HOST=db

สังเกต:
DB_HOST=db

ไม่ใช่:
DB_HOST=localhost

เพราะ Node อยู่ใน API container

ถ้า Node ใช้:
localhost:5432

จะหมายถึง:

```text
API Container
      │
      └── port 5432 ของ API Container เอง
```

แต่ Database อยู่คนละ container

เราจะตั้ง service ชื่อ:
db:

ดังนั้น Compose DNS ทำให้:
db
 ↓
PostgreSQL Container

## 13. สร้าง init.sql

สร้าง:

`database/init.sql`

ใส่:

```sql
CREATE TABLE IF NOT EXISTS employees
(
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL
);

INSERT INTO employees
(
    employee_code,
    name,
    department
)
VALUES
    ('260001', 'James', 'IT'),
    ('260002', 'Kevin', 'Engineering');
```

ตอน Database ถูกสร้างครั้งแรก เราต้องการ:
Database
   ↓
employees table
   ↓
sample records

Postgres Docker image สามารถรันไฟล์ .sql, .sql.gz หรือ shell script ที่อยู่ใน /docker-entrypoint-initdb.d ตอน initialize database ครั้งแรกได้ GitHub

## 14. สร้าง compose.yaml

นี่คือหัวใจของ Workshop:

```yaml
services:
  api:
    build:
      context: ./api

    environment:
      PORT: 3000

      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}

    ports:
      - "${APP_PORT}:3000"

    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:18

    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}

    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro

    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U ${DB_USER} -d ${DB_NAME}"
        ]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

volumes:
  postgres-data:
```

อันนี้มีหลายเรื่องใหม่ ค่อย ๆ แกะทีละส่วน

## 15. API Service

```yaml
api:
  build:
    context: ./api
```

Compose จะ:
./api
  ↓
Dockerfile
  ↓
Build Node Image
  ↓
API Container

เหมือน:
docker build ./api

## 16. Database Service

```yaml
db:
  image: postgres:18
```

เราไม่ได้มี Dockerfile ของ PostgreSQL

เราใช้ Official Image โดยตรง

ต่างกัน:
api
→ build image ของเราเอง

db
→ ใช้ postgres image ที่มีอยู่แล้ว

## 17. PostgreSQL Environment

ตรงนี้:

```yaml
environment:
  POSTGRES_DB: ${DB_NAME}
  POSTGRES_USER: ${DB_USER}
  POSTGRES_PASSWORD: ${DB_PASSWORD}
```

Compose อ่าน .env

เช่น:
DB_NAME=workshopdb

แล้วส่งเข้า PostgreSQL:
POSTGRES_DB=workshopdb

Postgres image ใช้ค่าเหล่านี้ตอน initialize database ครั้งแรก GitHub

## 18. Named Volume

ตรงนี้:

```yaml
volumes:
  - postgres-data:/var/lib/postgresql/data

คือ Workshop 07
PostgreSQL Container
        │
        ▼
/var/lib/postgresql/data
        │
        ▼
postgres-data
Docker Volume
```

ดังนั้น:
docker compose down

ลบ Database Container ได้

แต่:
postgres-data

ยังอยู่

พอสร้าง PostgreSQL container ใหม่ มัน mount volume เดิมกลับมา

## 19. init.sql เป็น Bind Mount

อีกบรรทัด:
- ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro

อันนี้ไม่ใช่ Named Volume

มันคือ:
Bind Mount

ซ้าย:
./database/init.sql

คือไฟล์บน Windows

ขวา:
/docker-entrypoint-initdb.d/init.sql

คือ path ภายใน PostgreSQL container

ส่วน:
:ro

คือ:
read-only

container อ่านได้ แต่ไม่ควรแก้ไฟล์บน Host

## 20. เรื่องสำคัญมากเกี่ยวกับ init.sql

PostgreSQL image จะ run scripts ใน:
/docker-entrypoint-initdb.d

เฉพาะตอน data directory ว่างและกำลัง initialize Database ครั้งแรก เท่านั้น GitHub

สมมติครั้งแรก:
postgres-data
(empty)
    ↓
Postgres initialization
    ↓
run init.sql

จากนั้น Volume มี Database แล้ว:
postgres-data
(workshopdb exists)

ถ้าคุณแก้:
init.sql

แล้ว:

```bash
docker compose down
docker compose up -d
```

SQL ใหม่จะไม่ run ซ้ำ

เพราะ database ถูก initialize ไปแล้ว

นี่สำคัญมาก

## 21. Initialization ≠ Migration

init.sql เหมาะกับ:

- สร้าง Database ครั้งแรก
- Workshop
- Development environment
- Initial schema

ไม่ควรใช้แทนระบบ migration จริงแบบ:

- Migration 001
- Migration 002
- Migration 003

ใน production

ต่อไปตอนเราเรียน application จริง จะไปเจอ Migration Tool เช่น ORM หรือ migration framework

ตอนนี้ใช้ init.sql เพื่อเข้าใจ Docker lifecycle ก่อน

## 22. Healthcheck

นี่คือส่วนใหม่:

```yaml
healthcheck:
  test:
    [
      "CMD-SHELL",
      "pg_isready -U ${DB_USER} -d ${DB_NAME}"
    ]
  interval: 5s
  timeout: 5s
  retries: 5
  start_period: 10s
```

คำสั่ง:
pg_isready

เอาไว้ถาม PostgreSQL ว่า:
พร้อมรับ connection หรือยัง?

Docker เองก็ยก pg_isready เป็นตัวอย่างสำหรับ PostgreSQL healthcheck Docker Documentation

## 23. interval

interval: 5s

หมายถึง:
ตรวจสุขภาพทุก 5 วินาที

ประมาณ:
check
 ↓
5 sec
 ↓
check
 ↓
5 sec
 ↓
check

## 24. timeout

`timeout: 5s`

หมายถึง:
แต่ละ healthcheck ให้เวลาตอบไม่เกิน 5 วินาที

ถ้าเกิน ถือว่า check ล้มเหลว

## 25. retries

retries: 5

ถ้าตรวจ fail ติดต่อกันตามจำนวนที่กำหนด Docker สามารถ mark container:
unhealthy

## 26. start_period

`start_period: 10s`

PostgreSQL เพิ่ง start อาจต้อง initialize database ก่อน

เราเลยบอก Docker:
ช่วง 10 วินาทีแรกให้เวลามันเตรียมตัวก่อน

Docker อธิบาย start_period ว่าเป็นช่วง grace period ก่อนนำ failure ของ healthcheck ไปนับตาม retry policy Docker Documentation

## 27. depends_on

API มี:

```yaml
depends_on:
  db:
    condition: service_healthy
```

นี่ต่างจาก:

```yaml
depends_on:
  - db
```

แบบธรรมดา

แบบธรรมดาหมายถึงประมาณ:
Start DB Container
       ↓
Start API Container

แต่ PostgreSQL process อาจยัง initialize อยู่

แบบของเรา:
Start DB Container
       ↓
Healthcheck
       ↓
healthy?
       ↓ YES
Start API

Docker Compose รองรับ condition: service_healthy เพื่อรอ dependency ผ่าน healthcheck ก่อนเริ่ม dependent service Docker Documentation

## 28. ตรวจ Compose ก่อน Run

จาก root:
cd C:\docker-workshop\workshop10-postgres

ใช้:
docker compose config

ตรวจว่า:
DB_NAME
DB_USER
APP_PORT

ถูก substitute แล้ว

ถ้าไม่มี error ค่อยไปต่อ

## 29. Run ระบบ

รันแบบ attached ก่อน:
docker compose up --build

คุณน่าจะเห็นลำดับประมาณ:
db  | database system is ready to accept connections

```text
db  | CREATE TABLE
db  | INSERT 0 2
```

api | API running on port 3000

สังเกต API ควร start หลัง Database healthy

เมื่อเรียบร้อยแล้วกด:
Ctrl + C

แล้วใช้ background:
docker compose up -d

## 30. ตรวจ Container

```bash
docker compose ps
```

ควรเห็นประมาณ:
SERVICE   STATUS

api       Up
db        Up (healthy)

จุดที่ต้องมอง:
healthy

ตรง Database

## 31. ทดสอบ Health API

เปิด:
http://localhost:8080/health

ควรได้:

```json
{
  "status": "ok",
  "api": "healthy",
  "database": "connected"
}
```

ตอน:
await pool.query("SELECT 1");

สำเร็จ แปลว่า Node ต่อ PostgreSQL ได้จริง

## 32. ดู Employees

เปิด:
http://localhost:8080/api/employees

ควรได้:

```json
[
  {
    "id": 1,
    "employee_code": "260001",
    "name": "James",
    "department": "IT"
  },
  {
    "id": 2,
    "employee_code": "260002",
    "name": "Kevin",
    "department": "Engineering"
  }
]
```

ข้อมูลนี้มาจาก:
init.sql
   ↓
PostgreSQL
   ↓
SELECT
   ↓
Node.js
   ↓
Browser

ไม่ใช่ array ใน JavaScript แล้ว

## 33. เพิ่มข้อมูลจริง

ใช้ Postman หรือ REST Client ส่ง:

```text
POST http://localhost:8080/api/employees
Content-Type: application/json

body:
{
  "employeeCode": "260003",
  "name": "Tony",
  "department": "IT"
}
```

ควรได้:

```json
{
  "id": 3,
  "employee_code": "260003",
  "name": "Tony",
  "department": "IT"
}
```

เปิด:
GET http://localhost:8080/api/employees

ตอนนี้มี 3 คน

## 34. เข้า PostgreSQL โดยตรง

เราไม่จำเป็นต้อง publish:
5432

ออก Windows เลย

แต่ยังเข้า Database ผ่าน container ได้:
docker compose exec db psql -U workshop_user -d workshopdb

จะเข้าสู่:
workshopdb=#

ลอง:
SELECT * FROM employees;

ควรเห็น:

```text
id | employee_code | name  | department
---+---------------+-------+------------
1  | 260001        | James | IT
2  | 260002        | Kevin | Engineering
3  | 260003        | Tony  | IT
```

ออก:
\q

## 35. ทำไม Database ไม่ต้องมี ports:

Compose ของเราไม่มี:

```yaml
db:
  ports:
    - "5432:5432"
```

เพราะ API กับ Database อยู่ network เดียวกัน

API ใช้:
db:5432

ดังนั้น architecture คือ:
Windows

```text
localhost:8080
      │
      ▼
API Container
      │
      │ db:5432
      ▼
Database Container
```

Windows ไม่จำเป็นต้องเข้าถึง Database

นี่ปลอดภัยกว่าการเปิด database port โดยไม่จำเป็น

## 36. ถ้าอยากใช้ Database Tool บน Windows ล่ะ?

เช่น DBeaver / pgAdmin

ตอน development สามารถเพิ่ม:

```yaml
db:
  ports:
    - "5433:5432"
```

แล้วเครื่อง Windows เชื่อม:
Host: localhost
Port: 5433

แต่ API container ยังคงใช้:
Host: db
Port: 5432

อย่าสับสนสองเส้นทาง:
Windows → DB

localhost:5433

กับ:
API → DB

db:5432

## 37. ทดสอบ Persistent Data

ตอนนี้เรามี employee:

```text
260003 Tony
```

ลอง:
docker compose down

สิ่งที่จะหาย:
API Container
DB Container
Default Network

แต่ Volume:
postgres-data

ยังอยู่

ตรวจ:
docker volume ls

น่าจะเห็นประมาณ:
workshop10-postgres_postgres-data

## 38. สร้างระบบใหม่

```bash
docker compose up -d
```

แล้วเปิด:
http://localhost:8080/api/employees

คำถาม:
Tony ยังอยู่ไหม?

ควรตอบว่า:
อยู่

เพราะข้อมูลจริงอยู่:
postgres-data

ไม่ใช่ใน lifecycle ของ Database Container

นี่คือ Workshop 07 ที่นำมาใช้กับ Database จริง

## 39. พิสูจน์เพิ่มด้วยการลบเฉพาะ DB Container

ดู:
docker compose ps

จากนั้น:
docker compose rm -s -f db

Database container ถูกลบ

แล้ว:
docker compose up -d db

มันจะสร้าง DB container ใหม่

แต่ mount:
postgres-data

เดิมกลับมา

ข้อมูลควรยังอยู่

## 40. ทำไม init.sql ไม่ Insert James/Kevin ซ้ำ?

ตอน Database ใหม่ mount volume เดิม:
postgres-data

PostgreSQL พบว่า data directory ถูก initialize แล้ว

มันจึงไม่ run:
/docker-entrypoint-initdb.d/init.sql

ซ้ำ

ตามพฤติกรรมของ Official Image initialization scripts จะทำงานเฉพาะ data directory ที่ว่างเท่านั้น GitHub

## 41. ถ้าอยาก Reset Database ทั้งหมด

ตอน Workshop เท่านั้นนะ

ใช้:
docker compose down -v

-v จะลบ named volume ด้วย

ตอนนี้:
postgres-data

หาย

run ใหม่:
docker compose up -d

Database จะเป็น:
empty volume
      ↓
initdb
      ↓
init.sql
      ↓
James + Kevin

Tony จะหาย เพราะเรา reset storage จริง

ดังนั้นคำสั่งนี้:
docker compose down -v

ต้องระวังมากกับ Database

## 42. ทดลองว่า init.sql ไม่ใช่ Migration

ตอน database มี volume อยู่ ลองแก้ init.sql เพิ่ม:

```sql
INSERT INTO employees
(
    employee_code,
    name,
    department
)
VALUES
(
    '260004',
    'Alice',
    'HR'
);
```

จากนั้น:

```bash
docker compose down
docker compose up -d
```

เปิด employees

Alice จะ ไม่เพิ่ม

เพราะ Volume เดิม initialize ไปแล้ว

ถ้า:

```bash
docker compose down -v
docker compose up -d
```

Alice จึงจะปรากฏ

ตรงนี้อยากให้ทดลองจริง เพราะเป็น bug ที่เจอบ่อยมากเวลาใช้ Docker Database

## 43. ดู Logs แยก Service

Database:
docker compose logs db

realtime:
docker compose logs -f db

API:
docker compose logs -f api

เวลา API ต่อ DB ไม่ได้ ให้เริ่มตรวจตามลำดับ:

1. `docker compose ps`
2. Database เป็น `healthy` หรือไม่
3. `docker compose logs db`
4. `docker compose logs api`
5. ค่า `DB_HOST` ถูกต้องหรือไม่

## 44. ตรวจ Environment ใน API

```bash
docker compose exec api printenv DB_HOST
```

ควรได้:
db

ลอง:
docker compose exec api printenv DB_NAME

ได้:
workshopdb

นี่คือ Workshop 08
.env
   ↓
Compose
   ↓
Container Environment
   ↓
process.env

## 45. ดู Network

```bash
docker network ls
```

จะเจอประมาณ:
workshop10-postgres_default

inspect:
docker network inspect workshop10-postgres_default

จะเห็น:
api
db

อยู่ network เดียวกัน

นี่คือ Workshop 06

## 46. ดู Volume

```bash
docker volume ls
```

inspect:
docker volume inspect workshop10-postgres_postgres-data

นี่คือ Workshop 07

ตอนนี้ Workshop ก่อน ๆ เริ่มรวมกันทั้งหมดแล้ว:

```text
Workshop 05
Node Dockerfile
       │
Workshop 06
Docker Network
       │
Workshop 07
Volume
       │
Workshop 08
Environment
       │
Workshop 09
Compose
       │
       ▼
Workshop 10
Node + PostgreSQL จริง
```

## 47. Connection Flow ที่ต้องเข้าใจ

เมื่อ request มา:

```http
GET /api/employees
```

เกิด:

```text
Browser
   │
   │ localhost:8080
   ▼
Docker Port Mapping
   │
   ▼
API Container :3000
   │
   │ pool.query(...)
   ▼
Docker DNS
   │
   │ db
   ▼
PostgreSQL Container :5432
   │
   ▼
employees table
   │
   ▼
Query Result
   │
   ▼
Node.js
   │
   ▼
JSON Response
```

นี่คือ backend container architecture จริง ๆ แล้ว

## 48. สิ่งที่ไม่ควรทำ

อย่าเขียน:
host: "localhost"

ใน API container

เพราะ:
localhost
=
API Container ตัวเอง

ควร:
host: process.env.DB_HOST

แล้ว Compose:
DB_HOST: db

อย่า hardcode:
password: "workshop_password"

ควร:
password: process.env.DB_PASSWORD

อย่าเก็บ Database ไว้ใน container filesystem อย่างเดียว

ควร:

```yaml
volumes:
  - postgres-data:/var/lib/postgresql/data
```

อย่าคิดว่า:

```yaml
depends_on:
  - db
```

หมายความว่า Database พร้อม query แล้ว

ถ้าต้องรอ readiness ใช้:

```yaml
depends_on:
  db:
    condition: service_healthy
```

ร่วมกับ healthcheck Docker Documentation

## 🧪 Mini Challenge 10

ผมอยากให้รอบนี้ลงมือเพิ่มเองอีกนิด

เพิ่ม endpoint:
GET /api/employees/:id

Requirement:
/api/employees/1

ต้องได้ employee id 1

ถ้าไม่มี:
/api/employees/999

ให้ return:
404 Not Found

พร้อม:

```json
{
  "message": "Employee not found"
}
```

Hint SQL:

```sql
SELECT
    id,
    employee_code,
    name,
    department
FROM employees
WHERE id = $1
```

และ parameter:
[id]

### Challenge: Persistence

หลังเพิ่ม employee ใหม่:

```json
{
  "employeeCode": "260010",
  "name": "Docker User",
  "department": "IT"
}
```

ให้ทำตามนี้:

1. POST employee
2. GET ตรวจว่ามีข้อมูล
3. docker compose down
4. docker compose up -d
5. GET ใหม่

ข้อมูล ต้องยังอยู่

จากนั้นลอง:

```bash
docker compose down -v
docker compose up -d
```

แล้วตรวจอีกครั้ง

260010 ต้องหาย

และข้อมูลจาก:
init.sql

ต้องกลับมา

ถ้าคุณอธิบายได้ว่าทำไมสองกรณีนี้ผลต่างกัน ถือว่าเข้าใจ Docker Volume กับ Database lifecycle ดีมากแล้ว

## ✅ สรุป Workshop 10

ตอนนี้ compose.yaml ของเราเป็นตัวอธิบายระบบทั้งหมด:

```text
compose.yaml
    │
    ├── API
    │    ├── Build Dockerfile
    │    ├── Port
    │    └── Environment
    │
    ├── PostgreSQL
    │    ├── Environment
    │    ├── Healthcheck
    │    └── Volume
    │
    └── Default Network
```

จำ concept หลัก 5 ข้อนี้ให้ได้:

| แนวคิด | สิ่งที่ต้องจำ |
|---|---|
| API → Database | ใช้ `db:5432` ไม่ใช่ `localhost` |
| Database Data | เก็บใน Named Volume |
| `POSTGRES_*` | ใช้กำหนดค่าตอน initialize PostgreSQL |
| `init.sql` | ทำงานตอน Database initialization ครั้งแรก |
| `depends_on` + `healthcheck` | ใช้รอให้ Database พร้อมใช้งานจริง |

โดยเฉพาะความแตกต่างนี้:

> [!IMPORTANT]
> **Container Running ≠ Application Ready**

นี่เป็น concept สำคัญมากเวลาทำระบบหลาย service

Workshop 11 ต่อไปตาม roadmap เดิมจะเป็น ASP.NET Core + Docker ซึ่งเหมาะมากกับเส้นทางที่คุณกำลังฝึก C#/.NET อยู่ด้วย เราจะเอา ASP.NET Core Web API/MVC จริงมาทำ Multi-stage Dockerfile เพื่อแยก SDK Image สำหรับ build ออกจาก ASP.NET Runtime Image สำหรับรัน ทำให้เห็นว่าทำไม production image ไม่จำเป็นต้องแบก .NET SDK ทั้งก้อนมาด้วย.
