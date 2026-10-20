# Workshop 08: Environment Variables, Configuration และ Secrets

Workshop นี้จะทำให้ Docker Image เดียวสามารถนำไปใช้ใน Development, Test และ Production ได้ โดยเปลี่ยนเฉพาะ Configuration ตอนสร้าง Container ไม่ต้องแก้ Source Code หรือ Build Image ใหม่ทุกครั้ง

```text
Environment Variables
├── PORT
├── NODE_ENV
├── APP_NAME
├── LOG_LEVEL
└── DATABASE_*
        │
        ▼
Docker Container
        │
        ▼
process.env
        │
        ▼
config.js
        │
        ▼
Node.js Application
```

หัวใจสำคัญของ Workshop นี้คือ:

> Build Image ครั้งเดียว แล้วส่ง Configuration ที่แตกต่างกันเข้ามาตอน Runtime

เมื่อเรียนจบ Workshop นี้ คุณจะสามารถ:

- อ่าน Environment Variables ผ่าน `process.env` ได้
- ส่งค่าด้วย `-e` และ `--env-file` ได้
- แยก Configuration ออกจาก Source Code ได้
- แปลงชนิดข้อมูลและ Validate Configuration ได้
- อธิบายความแตกต่างระหว่าง `.env`, Docker Environment และ `dotenv` ได้
- ป้องกันไม่ให้ Secret เข้า Git หรือ Docker Image ได้
- แยก Build-time Configuration ออกจาก Runtime Configuration ได้

---

## 1. ทำไมไม่ควร Hardcode Configuration

ตัวอย่างที่ไม่ควรทำ:

```javascript
const PORT = 3000;
const DATABASE_URL =
  "sqlserver://admin:password123@192.168.1.10:1433/mydb";
```

ค่าเหล่านี้มักแตกต่างกันตาม Environment:

| Configuration | Development | Test | Production |
| --- | --- | --- | --- |
| `DATABASE_HOST` | `localhost` | `test-database` | `database` |
| `LOG_LEVEL` | `debug` | `info` | `warn` |
| `PORT` | `3000` | `5000` | `7000` |

หาก Hardcode ค่าไว้ใน Source Code เราจะต้องแก้โค้ดหรือ Build Image ใหม่ทุกครั้งที่ Environment เปลี่ยน

แนวทางที่ดีกว่า:

```text
                 Application เดียวกัน
                         │
               ┌─────────┼─────────┐
               ▼         ▼         ▼
              DEV       TEST      PROD
               │         │         │
            Config A  Config B  Config C
```

Code เหมือนเดิม แต่ Configuration ถูกส่งเข้ามาจากภายนอก

---

## 2. โครงสร้าง Project

```text
workshop08-env/
│
├── .dockerignore
├── .env
├── .env.development
├── .env.production
├── .env.test
├── config.js
├── Dockerfile
├── package.json
├── pnpm-lock.yaml
├── README.md
└── server.js
```

| ไฟล์ | หน้าที่ |
| --- | --- |
| `server.js` | Express Application และ API Endpoints |
| `config.js` | อ่าน แปลง และ Validate Environment Variables |
| `.env` | Configuration เริ่มต้นสำหรับ Local Development |
| `.env.*` | Configuration แยกตาม Environment |
| `Dockerfile` | Recipe สำหรับสร้าง Docker Image |
| `.dockerignore` | ป้องกันไฟล์ที่ไม่ต้องการเข้าสู่ Build Context |

Project นี้ใช้ Node.js 22, Express, ES Modules, `dotenv` และ `pnpm`

> ไฟล์ `.env` อาจมีข้อมูลสำคัญ ห้ามนำค่าจริงไปเผยแพร่ในเอกสาร Screenshot หรือ Git Repository

---

## 3. สำรวจ `server.js`

Application โหลด `.env` สำหรับการรันบนเครื่อง แล้วอ่านค่าที่ผ่านการจัดการจาก `config.js`:

```javascript
import express from "express";
import "dotenv/config";
import config from "./config.js";

const app = express();
const PORT = config.app.port;
const NODE_ENV = config.app.environment;
const APP_NAME = config.app.name;
const LOG_LEVEL = config.app.logLevel;
```

Project มี Endpoint ต่อไปนี้:

| Method | Path | หน้าที่ |
| --- | --- | --- |
| `GET` | `/` | แสดงข้อมูล Application เบื้องต้น |
| `GET` | `/health` | ตรวจสอบสถานะ Service และ Environment |
| `GET` | `/config` | แสดง Configuration ที่ไม่ใช่ Secret |

Application Listen ที่ `0.0.0.0` เพื่อรับ Request ผ่าน Network Interface ของ Container:

```javascript
app.listen(PORT, "0.0.0.0", () => {
  console.log(`${APP_NAME} started`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Log Level: ${LOG_LEVEL}`);
  console.log(`Listening on port ${PORT}`);
});
```

> Endpoint `/config` ต้องแสดงเฉพาะค่าที่เปิดเผยได้ ห้ามส่ง `DATABASE_PASSWORD`, `JWT_SECRET` หรือ Secret อื่นกลับไปใน Response

---

## 4. รวม Configuration ไว้ใน `config.js`

แทนที่จะอ่าน `process.env` กระจายอยู่ทั่ว Application โปรเจกต์นี้รวม Configuration ไว้ใน Module เดียว:

```javascript
const config = {
  app: {
    name: process.env.APP_NAME || "my-api",
    port: Number(process.env.PORT ?? 3000),
    environment: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",
  },

  database: {
    host: requireEnv("DATABASE_HOST"),
    port: Number(process.env.DATABASE_PORT ?? 1433),
    name: requireEnv("DATABASE_NAME"),
    user: requireEnv("DATABASE_USER"),
    password: requireEnv("DATABASE_PASSWORD"),
  },
};
```

ข้อดีของ Config Module:

- มีจุดเดียวสำหรับอ่าน Environment Variables
- กำหนด Default Value ได้ชัดเจน
- แปลงชนิดข้อมูลได้ก่อนส่งให้ส่วนอื่นใช้
- Validate ค่าที่จำเป็นได้ตั้งแต่ Application เริ่มทำงาน
- ลดการเขียน `process.env.*` ซ้ำในหลายไฟล์

---

## 5. Fail Fast ด้วย `requireEnv()`

`config.js` มี Function สำหรับตรวจค่าที่จำเป็น:

```javascript
function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value;
}
```

ค่าต่อไปนี้จำเป็นสำหรับ Project ปัจจุบัน:

- `DATABASE_HOST`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`

หากขาดค่าใดค่าหนึ่ง Application จะหยุดตั้งแต่ Startup เรียกว่าแนวคิด **Fail Fast**

```text
Configuration ไม่ครบ
        │
        ▼
Application Startup
        │
        ▼
Exit พร้อม Error
```

วิธีนี้ดีกว่าปล่อยให้ Application เริ่มทำงาน แล้วค่อย Error เมื่อมี Request จริงเข้ามา

---

## 6. Environment Variables เป็น String

ค่าจาก `process.env` เป็น String โดยพื้นฐาน:

```javascript
console.log(typeof process.env.PORT); // "string"
```

จึงควรแปลงค่าที่ต้องใช้เป็น Number:

```javascript
const port = Number(process.env.PORT ?? 3000);
const databasePort = Number(
  process.env.DATABASE_PORT ?? 1433
);
```

เปรียบเทียบ:

```javascript
// อาจคืนค่า String หรือ Number
const PORT = process.env.PORT || 3000;

// คืนค่า Number เสมอเมื่อค่าถูกต้อง
const PORT = Number(process.env.PORT ?? 3000);
```

สำหรับงานจริง ควร Validate เพิ่มว่าเป็น Number ที่ถูกต้องและอยู่ในช่วงที่อนุญาต

---

## 7. ทดลองรันบนเครื่องด้วย `dotenv`

ไฟล์ `server.js` มีคำสั่ง:

```javascript
import "dotenv/config";
```

เมื่อรันบนเครื่อง `dotenv` จะอ่านไฟล์ `.env` แล้วเติมค่าลงใน `process.env`

```text
.env
  │
  ▼
dotenv
  │
  ▼
process.env
  │
  ▼
config.js
```

ติดตั้ง Dependencies และเริ่ม Application:

```bash
pnpm install
pnpm start
```

เปิด URL ตามค่า `PORT` ใน `.env`:

```text
http://localhost:<PORT>/health
```

ตัวอย่าง Response:

```json
{
  "status": "ok",
  "service": "my-test-api",
  "environment": "testing",
  "port": 4000
}
```

> การรัน Local ต้องมี Environment Variables ที่ `config.js` บังคับครบ มิฉะนั้น Application จะหยุดพร้อมข้อความ `Missing required environment variable`

---

## 8. Dockerfile

Dockerfile ปัจจุบัน:

```dockerfile
FROM node:22

WORKDIR /app

RUN npm install --global pnpm@12

COPY package*.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD [ "pnpm", "start" ]
```

| Instruction | หน้าที่ |
| --- | --- |
| `FROM node:22` | ใช้ Node.js 22 เป็น Base Image |
| `WORKDIR /app` | กำหนด Working Directory ภายใน Image |
| `RUN npm install --global pnpm@12` | ติดตั้ง `pnpm` ใน Image |
| `COPY package*.json pnpm-lock.yaml ./` | คัดลอกไฟล์ Dependency ก่อนเพื่อใช้ Build Cache |
| `RUN pnpm install --frozen-lockfile` | ติดตั้ง Dependency ตาม Lockfile |
| `COPY . .` | คัดลอก Source Code เข้า Image |
| `EXPOSE 3000` | ระบุ Default Container Port ของ Application |
| `CMD` | เริ่ม Application ด้วย `pnpm start` |

Dockerfile ไม่กำหนด Production Configuration หรือ Secret เพราะค่าเหล่านี้ควรถูกส่งเข้ามาตอน Runtime

> `EXPOSE 3000` ไม่ได้บังคับว่า Application ต้อง Listen ที่ Port `3000` หากส่ง `PORT=7000` Application จะ Listen ที่ `7000` และ Port Mapping ต้องเปลี่ยนตาม

---

## 9. `.dockerignore`

ไฟล์ `.dockerignore` ปัจจุบัน:

```dockerignore
node_modules/
.git
.env*
Dockerfile
npm-debug.log
```

บรรทัดสำคัญคือ:

```dockerignore
.env*
```

Pattern นี้ป้องกัน `.env`, `.env.development`, `.env.production` และไฟล์ชื่อขึ้นต้นด้วย `.env` ไม่ให้เข้าสู่ Docker Build Context

```text
Host
├── .env                 ไม่ส่งเข้า Build Context
├── .env.production      ไม่ส่งเข้า Build Context
├── node_modules/        ไม่ส่งเข้า Build Context
├── server.js            ส่งเข้า Build Context
└── config.js            ส่งเข้า Build Context
```

จุดประสงค์คือไม่ให้ Local Dependencies และ Configuration ที่อาจมี Secret ถูก Copy เข้า Image

---

## 10. Build Docker Image

เปิด Terminal ที่ Directory `workshop08-env` แล้ว Build Image:

```bash
docker build -t workshop08-api:1.0 .
```

ตรวจสอบ:

```bash
docker images workshop08-api
```

Image ที่ได้ไม่ควรรู้ว่า Production Database อยู่ที่ไหน หรือใช้ Password อะไร ค่าเหล่านั้นจะถูกส่งเข้ามาตอนสร้าง Container

```text
Source Code + Dependencies
            │
            ▼
     workshop08-api:1.0
            │
            │ Runtime Configuration
            ▼
         Container
```

---

## 11. Run ด้วย `--env-file`

Project ปัจจุบันบังคับ Database Configuration จึงควรส่งไฟล์ Environment ตอน Run:

```bash
docker run -d \
  --name workshop08 \
  --env-file .env.production \
  -p 9000:7000 \
  workshop08-api:1.0
```

หากใช้ PowerShell สามารถใช้คำสั่งบรรทัดเดียว:

```powershell
docker run -d --name workshop08 --env-file .env.production -p 9000:7000 workshop08-api:1.0
```

จากตัวอย่าง:

```text
Host Port 9000
      │
      │ -p 9000:7000
      ▼
Container Port 7000
      │
      ▼
Node.js Application
```

เปิด:

```text
http://localhost:9000/health
```

ตัวอย่าง Response:

```json
{
  "status": "ok",
  "service": "docker-production-api",
  "environment": "production",
  "port": 7000
}
```

---

## 12. ส่งค่าด้วย `-e`

Option `-e` ใช้ส่ง Environment Variable ทีละค่า:

```bash
docker rm -f workshop08

docker run -d \
  --name workshop08 \
  -e PORT=5000 \
  -e NODE_ENV=production \
  -e APP_NAME=company-api \
  -e LOG_LEVEL=warn \
  -e DATABASE_HOST=database \
  -e DATABASE_PORT=1433 \
  -e DATABASE_NAME=CompanyDB \
  -e DATABASE_USER=app_user \
  -e DATABASE_PASSWORD=workshop-placeholder \
  -p 8080:5000 \
  workshop08-api:1.0
```

เมื่อกำหนด `PORT=5000` Node.js จะ Listen ที่ Container Port `5000` ดังนั้น Port Mapping ต้องเป็น `-p 8080:5000`

Option `-e` เหมาะกับการส่งค่าไม่กี่ตัวหรือ Override ค่าเฉพาะจุด หากมีหลายค่าควรใช้ `--env-file`

> `workshop-placeholder` เป็นเพียงค่าตัวอย่าง ห้ามใช้เป็น Password จริง

---

## 13. ตรวจ Environment ภายใน Container

ดู Environment Variables ทั้งหมด:

```bash
docker exec workshop08 env
```

ดูเฉพาะค่าที่ต้องการ:

```bash
docker exec workshop08 printenv PORT
docker exec workshop08 printenv NODE_ENV
docker exec workshop08 printenv DATABASE_HOST
```

ตรวจ Log ของ Application:

```bash
docker logs workshop08
```

ควรเห็นข้อมูลลักษณะนี้:

```text
docker-production-api started
Environment: production
Log Level: warn
Listening on port 7000
```

> หลีกเลี่ยงการแสดง Environment ทั้งหมดบนหน้าจอที่แชร์หรือใน CI Log เพราะอาจมี Secret ปะปนอยู่

---

## 14. `--env-file` ไม่ได้ Copy ไฟล์เข้า Container

เมื่อใช้:

```bash
docker run --env-file .env.production ...
```

Docker อ่านคู่ `KEY=value` จากไฟล์บน Host แล้วส่งเข้า Environment ของ Container ไม่ได้ Mount หรือ Copy ไฟล์ `.env.production` เข้า `/app`

```text
.env.production บน Host
          │
          │ Docker อ่าน KEY=value
          ▼
Container Environment
          │
          ▼
process.env
```

ตรวจไฟล์ภายใน Application Directory:

```bash
docker exec workshop08 ls -la /app
```

ไม่ควรพบ `.env` หรือ `.env.production` เพราะ `.dockerignore` กันไฟล์เหล่านี้ออกจาก Build Context

แต่คำสั่งนี้ยังอ่านค่าได้:

```bash
docker exec workshop08 printenv APP_NAME
```

---

## 15. `dotenv` กับ Docker `--env-file`

ทั้งสองวิธีทำให้ค่าปรากฏใน `process.env` แต่ทำงานคนละ Layer

### Local Development

```text
.env
  │
  ▼
Node.js dotenv
  │
  ▼
process.env
```

### Docker Runtime

```text
.env.production
       │
       ▼
Docker --env-file
       │
       ▼
Container Environment
       │
       ▼
process.env
```

เมื่อ Docker ส่ง Environment Variables เข้ามาแล้ว Node.js ไม่จำเป็นต้องมีไฟล์ `.env` อยู่ใน Container

โดยค่าเริ่มต้น `dotenv` จะไม่ Override Environment Variable ที่ Process มีอยู่แล้ว จึงสามารถใช้ `dotenv` สำหรับ Local Development และใช้ Docker Injection สำหรับ Container ได้ร่วมกัน

---

## 16. แยกไฟล์ตาม Environment

Project มีไฟล์สำหรับหลาย Environment:

```text
.env.development
.env.test
.env.production
```

เลือกใช้ตอนสร้าง Container:

```bash
docker run --env-file .env.development ...
docker run --env-file .env.test ...
docker run --env-file .env.production ...
```

### สิ่งที่ต้องแก้ก่อนใช้ `.env.development`

ไฟล์ปัจจุบันมี Key:

```dotenv
NODE_DEV=development
```

แต่ Application อ่าน `NODE_ENV` จึงควรแก้เป็น:

```dotenv
NODE_ENV=development
```

นอกจากนี้ต้องเติมค่าที่ `config.js` บังคับให้ครบ:

```dotenv
DATABASE_HOST=localhost
DATABASE_PORT=1433
DATABASE_NAME=WorkshopDB
DATABASE_USER=app_user
DATABASE_PASSWORD=replace-with-local-value
```

ไฟล์ `.env.test` ปัจจุบันว่างอยู่ จึงต้องเพิ่มค่าที่จำเป็นก่อนนำไปใช้

---

## 17. Priority เมื่อค่าซ้ำกัน

สมมติ `.env.production` มี:

```dotenv
LOG_LEVEL=warn
```

แต่ Run ด้วย:

```bash
docker run \
  --env-file .env.production \
  -e LOG_LEVEL=debug \
  ...
```

ค่าจาก `-e` จะ Override ค่าจาก `--env-file`:

```text
.env.production
LOG_LEVEL=warn
       │
       ▼
-e LOG_LEVEL=debug
       │
       ▼
Container
LOG_LEVEL=debug
```

วิธีนี้เหมาะเมื่ออยากเปลี่ยนเพียงบางค่าโดยไม่แก้ไฟล์หลัก

---

## 18. Configuration กับ Secrets

Configuration และ Secret ต่างเป็นค่าที่ Application ต้องใช้ แต่มีระดับความอ่อนไหวต่างกัน:

| ประเภท | ตัวอย่าง | แนวทาง |
| --- | --- | --- |
| Configuration | `PORT`, `NODE_ENV`, `LOG_LEVEL` | ส่งตอน Runtime หรือกำหนด Default ที่ปลอดภัย |
| Secret | Password, API Key, JWT Secret | Inject ตอน Runtime และใช้ Secret Manager ใน Production |

สิ่งที่ไม่ควรทำ:

```dockerfile
ENV DATABASE_PASSWORD=SuperSecret123
ENV JWT_SECRET=my-secret
```

ไม่ควร Hardcode Secret ใน:

- Source Code
- Dockerfile
- Docker Image
- Git Repository
- API Response หรือ Application Log

แนวทางที่ควรใช้:

```text
Secret Manager / Deployment Platform
                │
                ▼
         Runtime Injection
                │
                ▼
            Container
```

Environment Variable ดีกว่าการ Bake Secret ลง Image แต่ไม่ใช่ Secret Vault ผู้ที่มีสิทธิ์สูงบน Docker Host อาจตรวจดู Environment ของ Container ได้

ระบบ Production มักใช้ Docker Secrets, Kubernetes Secrets, HashiCorp Vault, AWS Secrets Manager หรือ Azure Key Vault ตาม Platform ที่ใช้งาน

---

## 19. ทำไมไม่ควร Copy `.env` เข้า Image

หาก Dockerfile ใช้ `COPY . .` โดยไม่มี `.env*` ใน `.dockerignore` ไฟล์อาจเข้า Image:

```text
Docker Image
└── /app/.env
    ├── DATABASE_PASSWORD
    ├── JWT_SECRET
    └── SMTP_PASSWORD
```

Image อาจถูก Push ไป Registry, แชร์ให้ทีม, Cache บนหลายเครื่อง หรือ Deploy ไปหลาย Server ทำให้ Secret กระจายตามไปด้วย

การ Copy แล้วลบภายหลังไม่ปลอดภัย:

```dockerfile
COPY . .
RUN rm .env
```

Docker Image ประกอบด้วย Layers ข้อมูลจากคำสั่ง `COPY` อาจยังอยู่ใน Layer ก่อนหน้าแม้ Layer ถัดไปจะลบไฟล์แล้ว

> วิธีที่ถูกต้องคือไม่ส่ง Secret เข้า Build Context และไม่ Copy เข้า Image ตั้งแต่แรก

---

## 20. `.gitignore` กับ `.dockerignore`

สองไฟล์นี้ทำหน้าที่คนละอย่าง:

| ไฟล์ | ผู้ใช้งาน | หน้าที่ |
| --- | --- | --- |
| `.gitignore` | Git | ไม่ Track ไฟล์เข้า Repository |
| `.dockerignore` | Docker | ไม่ส่งไฟล์เข้า Build Context |

ควรมี Pattern สำหรับ Local Environment Files ใน `.gitignore` ของ Repository:

```gitignore
node_modules/
.env
.env.*
!.env.example
```

และใน `.dockerignore`:

```dockerignore
node_modules/
.env*
.git
```

> Git ไม่ Track ไฟล์ ไม่ได้หมายความว่า Docker จะไม่ Copy ไฟล์นั้นโดยอัตโนมัติ จึงควรตั้งค่าทั้งสองไฟล์

Repository ปัจจุบัน Ignore `node_modules` แล้ว แต่ควรเพิ่ม `.env` และ `.env.*` ใน `.gitignore` ก่อนใช้ `git add` เพื่อป้องกันไฟล์ Environment ถูก Commit โดยไม่ตั้งใจ

หาก `.env` เคยถูก Git Track ไปแล้ว การเพิ่ม `.gitignore` จะไม่ยกเลิกการ Track ต้องนำไฟล์ออกจาก Git Index โดยยังเก็บไฟล์ไว้ในเครื่อง:

```bash
git rm --cached workshop08-env/.env
git rm --cached workshop08-env/.env.development
git rm --cached workshop08-env/.env.production
git rm --cached workshop08-env/.env.test
```

จากนั้นตรวจสอบด้วย `git status` ก่อน Commit หากไฟล์เคยมี Secret จริงและเคยถูก Push ไป Remote แล้ว ควรเปลี่ยน Secret นั้นทันที เพราะการลบไฟล์ใน Commit ใหม่ไม่ได้ลบค่าออกจากประวัติ Git เดิม

### `.env.example`

สร้าง Template ที่ไม่มี Secret จริงเพื่อบอกสมาชิกทีมว่า Project ต้องการค่าใดบ้าง:

```dotenv
PORT=3000
NODE_ENV=development
APP_NAME=my-api
LOG_LEVEL=info

DATABASE_HOST=
DATABASE_PORT=1433
DATABASE_NAME=
DATABASE_USER=
DATABASE_PASSWORD=
```

ไฟล์ `.env.example` สามารถ Commit ได้เพราะมีเฉพาะชื่อ Key และค่าตัวอย่างที่ไม่ใช่ Secret

---

## 21. Build Time กับ Runtime

Docker มี Configuration สองช่วงหลัก:

| ช่วง | คำสั่ง/Instruction | ใช้สำหรับ |
| --- | --- | --- |
| Build Time | `ARG`, `--build-arg` | ค่าที่จำเป็นระหว่างสร้าง Image |
| Runtime | `ENV`, `-e`, `--env-file` | Configuration ของ Container |

ตัวอย่าง Build Argument:

```dockerfile
ARG APP_VERSION
RUN echo "Building version ${APP_VERSION}"
```

```bash
docker build \
  --build-arg APP_VERSION=1.5.0 \
  -t workshop08-api:1.5.0 .
```

ตัวอย่าง Runtime Environment:

```bash
docker run -e NODE_ENV=production workshop08-api:1.5.0
```

ค่าประเภท `PORT`, `DATABASE_HOST`, `LOG_LEVEL` และ Secret ส่วนใหญ่ควรเป็น Runtime Configuration

---

## 22. Image เดียว ใช้ได้หลาย Environment

สมมติ Build Image นี้เพียงครั้งเดียว:

```text
workshop08-api:1.0
```

เราสามารถ Deploy ไปหลาย Environment:

```bash
docker run --env-file .env.development workshop08-api:1.0
docker run --env-file .env.test workshop08-api:1.0
docker run --env-file .env.production workshop08-api:1.0
```

```text
               workshop08-api:1.0
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
           DEV         TEST        PROD
            │           │           │
         env A       env B       env C
```

Image เหมือนเดิมทุก Environment เปลี่ยนเฉพาะ Configuration ตอน Runtime

---

## 23. Mini Challenge 08

ใช้ `.env.production` สร้าง Container ตาม Architecture นี้:

```text
Browser
   │
   │ http://localhost:9000
   ▼
Host Port 9000
   │
   │ Port Mapping
   ▼
Container Port 7000
   │
   ▼
workshop08-api
```

เงื่อนไข:

1. Build Image ชื่อ `workshop08-api:3.0`
2. Run ด้วย `--env-file .env.production`
3. ใช้ Host Port `9000`
4. ใช้ Container Port `7000`
5. เปิด `/health` และ `/config` ได้
6. ตรวจ `NODE_ENV` และ `DATABASE_HOST` ด้วย `docker exec`
7. ตรวจว่าไม่มี `.env.production` อยู่ใน `/app`
8. ตรวจ Startup Log ด้วย `docker logs`
9. Override `LOG_LEVEL` เป็น `debug` ด้วย `-e`

<details>
<summary>ดูเฉลยคำสั่ง</summary>

```bash
docker build -t workshop08-api:3.0 .

docker run -d \
  --name workshop08 \
  --env-file .env.production \
  -e LOG_LEVEL=debug \
  -p 9000:7000 \
  workshop08-api:3.0
```

```bash
docker exec workshop08 printenv NODE_ENV
docker exec workshop08 printenv DATABASE_HOST
docker exec workshop08 printenv LOG_LEVEL
docker exec workshop08 ls -la /app
docker logs workshop08
```

เปิด:

```text
http://localhost:9000/health
http://localhost:9000/config
```

</details>

ผลของ `LOG_LEVEL` ต้องเป็น `debug` เพราะ `-e` Override ค่าจาก `.env.production`

---

## 24. Troubleshooting

### Container หยุดทันที

ตรวจสถานะและ Log:

```bash
docker ps -a
docker logs workshop08
```

หากพบข้อความลักษณะนี้:

```text
Missing required environment variable: DATABASE_HOST
```

แสดงว่า Environment File ขาดค่าที่ `config.js` บังคับ

### เปิด API ไม่ได้

ตรวจว่า Port Mapping ตรงกับค่า `PORT` ภายใน Container:

```bash
docker exec workshop08 printenv PORT
docker port workshop08
docker logs workshop08
```

ถ้า `PORT=7000` ต้องใช้ Mapping ลักษณะนี้:

```text
-p <HOST_PORT>:7000
```

### แก้ `.env` แล้วค่าใน Container ไม่เปลี่ยน

Environment Variables ถูกกำหนดตอนสร้าง Container ต้องลบและสร้าง Container ใหม่:

```bash
docker rm -f workshop08

docker run -d \
  --name workshop08 \
  --env-file .env.production \
  -p 9000:7000 \
  workshop08-api:1.0
```

ไม่จำเป็นต้อง Build Image ใหม่หากเปลี่ยนเฉพาะ Runtime Configuration

### ชื่อ Container ซ้ำ

```bash
docker rm -f workshop08
```

แล้วจึง Run ใหม่

---

## 25. Cleanup

ลบ Container:

```bash
docker rm -f workshop08
```

ลบ Image หากไม่ใช้งานแล้ว:

```bash
docker image rm workshop08-api:1.0 workshop08-api:3.0
```

ตรวจสอบ:

```bash
docker ps -a
docker images workshop08-api
```

---

## สรุป Workshop 08

จำหลักสำคัญเหล่านี้:

1. Configuration ควรถูกส่งผ่าน Environment Variables
2. Secret ไม่ควรถูก Hardcode ใน Source Code หรือ Dockerfile
3. `.env` เป็นไฟล์บน Host ไม่จำเป็นต้องอยู่ใน Container
4. ใช้ `.dockerignore` ป้องกัน `.env` เข้า Docker Image
5. ใช้ `.gitignore` ป้องกัน `.env` เข้า Git Repository
6. `.env.example` Commit ได้เมื่อไม่มี Secret จริง
7. `ARG` ใช้สำหรับ Build Time
8. `-e` และ `--env-file` ใช้สำหรับ Runtime
9. Validate ค่าที่จำเป็นและ Fail Fast เมื่อ Configuration ไม่ครบ
10. Build Image ครั้งเดียว แล้วเปลี่ยน Configuration ตอน Run

Architecture ที่เราเรียนมาถึงตอนนี้:

```text
                  Docker Image
                       │
Environment ───────────┤
                       ▼
                   Container
                       │
                       ▼
                    Node.js
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
     Network         Volume          Logs
        │              │
        ▼              ▼
   Other API       Persistent Data
```

Workshop ถัดไปคือ Docker Compose ซึ่งจะนำ Container, Network, Volume และ Environment Variables มารวมไว้ในไฟล์ `compose.yaml` แล้วจัดการทั้ง Stack ด้วยคำสั่งเดียว:

```bash
docker compose up -d
```
