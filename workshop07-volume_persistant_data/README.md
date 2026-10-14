# Workshop 07: Docker Volume และ Persistent Data

> ถ้าลบ Container แล้วไฟล์ Database, Upload หรือ Config จะหายไหม?

คำตอบสั้น ๆ คือ **หายได้** หากไฟล์เหล่านั้นถูกเก็บไว้ใน filesystem ของ Container เพียงอย่างเดียว

Workshop นี้จะพาแยกข้อมูลสำคัญออกจาก Container ด้วย **Docker Volume** และ **Bind Mount** เพื่อให้เราลบและสร้าง Container ใหม่ได้โดยข้อมูลยังอยู่

---

## TL;DR

- **Container filesystem** — ข้อมูลผูกกับอายุของ Container; เมื่อลบ Container ข้อมูลก็หาย
- **Docker Volume** — Docker จัดการตำแหน่งเก็บข้อมูลให้ เหมาะกับ Database และข้อมูลถาวร
- **Bind Mount** — เชื่อมโฟลเดอร์บนเครื่อง Host เข้า Container เหมาะกับ Source Code และงาน Development

จำประโยคนี้ไว้:

> **Container ควรถูกลบและสร้างใหม่ได้ ส่วนข้อมูลสำคัญต้องแยกออกจาก Container**

---

## เป้าหมายการเรียนรู้

เมื่อจบ Workshop นี้ คุณจะสามารถ:

1. อธิบายได้ว่าทำไมข้อมูลใน Container จึงหายเมื่อลบ Container
2. สร้าง ตรวจสอบ ใช้งาน และลบ Docker Volume ได้
3. นำ Volume เดิมกลับมาใช้กับ Container ใหม่ได้
4. ใช้ Bind Mount เพื่อเชื่อมไฟล์บน Windows เข้า Container ได้
5. เลือกใช้ Volume หรือ Bind Mount ให้เหมาะกับงาน

## สิ่งที่ต้องมี

- Docker Desktop ทำงานอยู่
- PowerShell หรือ Command Prompt
- Port `8080`, `8081`, `8085` และ `8086` ว่างสำหรับการทดลอง

> [!NOTE]
> ตัวอย่างหลักใช้ **PowerShell** หากใช้ Command Prompt (CMD) จะมีคำสั่งทางเลือกให้ในส่วน Bind Mount

---

## 1. ปัญหา: ข้อมูลใน Container ไม่ถาวร

สร้าง Nginx Container:

```powershell
docker run -d --name volume-test nginx
```

เขียนข้อมูลลงใน filesystem ของ Container:

```powershell
docker exec volume-test sh -c "echo '<h1>My Important Data</h1>' > /usr/share/nginx/html/index.html"
docker exec volume-test cat /usr/share/nginx/html/index.html
```

ผลลัพธ์ควรเป็น:

```html
<h1>My Important Data</h1>
```

ถ้าเพียงแค่ `stop` แล้ว `start` ข้อมูลยังอยู่ เพราะยังเป็น Container ตัวเดิม:

```powershell
docker stop volume-test
docker start volume-test
```

แต่ถ้าลบ Container แล้วสร้างใหม่:

```powershell
docker rm -f volume-test
docker run -d --name volume-test nginx
docker exec volume-test cat /usr/share/nginx/html/index.html
```

หน้าเว็บจะกลับเป็นค่าเริ่มต้นของ Nginx เพราะ Container ใหม่มี filesystem ชุดใหม่

```text
Container เก่า
    │
    ├── index.html ที่เราแก้
    │
    └── ถูกลบ ──> filesystem และข้อมูลหายตามไปด้วย
```

ลบ Container ทดลองก่อนเข้าสู่ขั้นถัดไป:

```powershell
docker rm -f volume-test
```

---

## 2. Docker Volume คืออะไร?

Docker Volume คือพื้นที่เก็บข้อมูลที่มี lifecycle แยกจาก Container โดย Docker เป็นผู้จัดการตำแหน่งจัดเก็บให้

```text
Container A ──เขียนข้อมูล──> Docker Volume
     │                             │
     └── ลบได้                     └── ข้อมูลยังอยู่
                                   │
Container B <──ใช้ข้อมูลเดิม───────┘
```

หลักสำคัญคือ:

```text
Container lifecycle ≠ Volume lifecycle
```

Container จะถูกลบและสร้างใหม่กี่ครั้งก็ได้ ตราบใดที่ Container ใหม่ mount Volume เดิม ข้อมูลก็ยังนำกลับมาใช้ได้

---

## 3. สร้างและตรวจสอบ Volume

```powershell
# ดู Volume ที่มีอยู่
docker volume ls

# สร้าง Named Volume
docker volume create workshop07-data

# ตรวจสอบรายการและรายละเอียด
docker volume ls
docker volume inspect workshop07-data
```

ผลลัพธ์จาก `docker volume ls` จะมี Volume ที่เพิ่งสร้าง:

```text
DRIVER    VOLUME NAME
local     workshop07-data
```

ส่วน `docker volume inspect` จะแสดงข้อมูลลักษณะนี้:

```json
[
  {
    "Driver": "local",
    "Name": "workshop07-data",
    "Mountpoint": "...",
    "Scope": "local"
  }
]
```

โดยทั่วไปเราไม่จำเป็นต้องแก้ไข `Mountpoint` โดยตรง เพราะ Docker จัดการตำแหน่งจริงของ Volume ให้แล้ว

---

## 4. Mount Volume เข้า Container

นำ `workshop07-data` ไปเชื่อมกับ `/usr/share/nginx/html` ภายใน Container:

```powershell
docker run -d `
  --name nginx-volume `
  -p 8080:80 `
  -v workshop07-data:/usr/share/nginx/html `
  nginx
```

หรือเขียนบรรทัดเดียว:

```powershell
docker run -d --name nginx-volume -p 8080:80 -v workshop07-data:/usr/share/nginx/html nginx
```

รูปแบบของ `-v` คือ:

```text
-v VOLUME_NAME:CONTAINER_PATH

workshop07-data ──mount──> /usr/share/nginx/html
```

### เมื่อ Volume ถูก Mount ทับ Path

Nginx image มีไฟล์อยู่ที่ `/usr/share/nginx/html` อยู่แล้ว แต่เมื่อ mount Volume ที่ path นี้ การอ่านและเขียนผ่าน path ดังกล่าวจะเชื่อมกับ Volume

```text
ก่อน Mount                         หลัง Mount

Container                         Container
└── /usr/share/nginx/html         └── /usr/share/nginx/html
    └── index.html                    └── workshop07-data
```

> [!IMPORTANT]
> ครั้งแรกที่นำ **Volume ว่าง** ไป mount ทับ directory ที่มีไฟล์อยู่ Docker จะคัดลอกไฟล์เดิมจาก Container เข้า Volume โดยอัตโนมัติ แต่ถ้า Volume มีข้อมูลอยู่แล้ว ข้อมูลใน Volume จะเป็นข้อมูลที่มองเห็นผ่าน path นั้น จึงควรตรวจสอบ path ปลายทางให้ถูกต้องก่อนใช้งานจริง

---

## 5. พิสูจน์ว่า Volume เก็บข้อมูลไว้ได้

เขียนหน้าเว็บใหม่ผ่าน path ที่เชื่อมกับ Volume:

```powershell
docker exec nginx-volume sh -c "echo '<h1>Hello Docker Volume</h1>' > /usr/share/nginx/html/index.html"
docker exec nginx-volume cat /usr/share/nginx/html/index.html
```

เปิด [http://localhost:8080](http://localhost:8080) แล้วควรเห็นข้อความ `Hello Docker Volume`

จากนั้นลบ Container และตรวจสอบว่า Volume ยังอยู่:

```powershell
docker rm -f nginx-volume
docker ps -a
docker volume ls
```

สร้าง Container ใหม่และ mount Volume เดิม:

```powershell
docker run -d --name nginx-volume-new -p 8080:80 -v workshop07-data:/usr/share/nginx/html nginx
docker exec nginx-volume-new cat /usr/share/nginx/html/index.html
```

ถ้าเห็นผลลัพธ์นี้ แสดงว่าข้อมูลถูกเก็บแบบ Persistent สำเร็จ:

```html
<h1>Hello Docker Volume</h1>
```

---

## 6. ตรวจสอบ Mount ของ Container

ดูรายละเอียดทั้งหมด:

```powershell
docker inspect nginx-volume-new
```

หาส่วน `Mounts` ซึ่งจะมีข้อมูลประมาณนี้:

```json
"Mounts": [
  {
    "Type": "volume",
    "Name": "workshop07-data",
    "Destination": "/usr/share/nginx/html"
  }
]
```

หากต้องการดูเฉพาะข้อมูล Mount:

```powershell
docker inspect --format '{{json .Mounts}}' nginx-volume-new
```

---

## 7. `-v` กับ `--mount` ต่างกันอย่างไร?

`-v` สั้นและสะดวก:

```powershell
docker run -d --name nginx-volume2 -v workshop07-data:/usr/share/nginx/html nginx
```

`--mount` ยาวกว่า แต่อ่านความหมายได้ชัดเจน:

```powershell
docker run -d `
  --name nginx-volume2 `
  --mount source=workshop07-data,target=/usr/share/nginx/html `
  nginx
```

| รูปแบบ | จุดเด่น | เหมาะกับ |
|---|---|---|
| `-v source:target` | สั้นและพิมพ์เร็ว | การทดลองหรือคำสั่งทั่วไป |
| `--mount source=...,target=...` | อ่านง่ายและระบุ option ชัดเจน | Script และงานที่ต้องการความชัดเจน |

> [!TIP]
> ในงานจริงควรรู้จักทั้งสองแบบ แต่ `--mount` มักอ่านและตรวจสอบได้ง่ายกว่าเมื่อคำสั่งซับซ้อน

ลบ Container ทดลองตัวที่สองเมื่อใช้งานเสร็จ:

```powershell
docker rm -f nginx-volume2
```

---

## 8. Named Volume กับ Anonymous Volume

### Named Volume

ระบุชื่อที่สื่อความหมายได้เอง:

```powershell
docker run -v db-data:/app/data my-api
```

ตัวอย่างชื่อที่ดี ได้แก่ `postgres-data`, `sqlserver-data` และ `uploads-data`

### Anonymous Volume

ระบุเฉพาะ path ภายใน Container:

```powershell
docker run -v /app/data my-api
```

Docker จะสร้าง Volume ที่มีชื่อยาวอัตโนมัติ เช่น `a79de118f...`

| ประเภท | ตัวอย่าง | การจัดการ |
|---|---|---|
| Named Volume | `db-data:/var/lib/data` | หาและนำกลับมาใช้ได้ง่าย |
| Anonymous Volume | `/var/lib/data` | ชื่อจำยากและติดตามยากกว่า |

สำหรับข้อมูลที่เราต้องดูแลเอง ควรเลือก **Named Volume** เป็นหลัก

---

## 9. Bind Mount คืออะไร?

Bind Mount คือการนำไฟล์หรือโฟลเดอร์จริงบนเครื่อง Host เชื่อมเข้าไปยัง path ภายใน Container

```text
Windows Host                         Container
D:\project\website ──Bind Mount──> /usr/share/nginx/html
```

เมื่อแก้ไฟล์บน Windows, Container จะเห็นการเปลี่ยนแปลงทันที จึงเหมาะกับงาน Development

### ทดลองกับโฟลเดอร์ Workshop นี้

เปิด PowerShell แล้วเข้าโฟลเดอร์ที่มีไฟล์ `index.html`:

```powershell
cd D:\skill\docker\docker-workshop\workshop07-volume_persistant_data
```

รัน Nginx โดย bind mount โฟลเดอร์ปัจจุบัน:

```powershell
docker run -d `
  --name nginx-bind `
  -p 8081:80 `
  --mount "type=bind,source=$($PWD.Path),target=/usr/share/nginx/html" `
  nginx
```

เปิด [http://localhost:8081](http://localhost:8081) แล้วหน้าเว็บควรแสดงเนื้อหาจากไฟล์ `index.html` ในโฟลเดอร์นี้

ลองแก้ `index.html` แล้ว Refresh Browser การเปลี่ยนแปลงจะแสดงทันที โดยไม่ต้อง `docker build` หรือ `docker restart`

หากใช้ Command Prompt (CMD) ใช้คำสั่งนี้แทน:

```bat
docker run -d --name nginx-bind -p 8081:80 -v "%cd%:/usr/share/nginx/html" nginx
```

> [!NOTE]
> Bind Mount เป็นการเชื่อมข้อมูลชุดเดียวกัน ไม่ใช่การ Copy ไฟล์เข้า Container ดังนั้นการแก้ไขจาก Host หรือ Container อาจส่งผลถึงกันได้

---

## 10. Volume หรือ Bind Mount: ควรเลือกอะไร?

| หัวข้อ | Docker Volume | Bind Mount |
|---|---:|---:|
| Docker จัดการตำแหน่ง Storage | ✅ | ❌ |
| เลือกโฟลเดอร์บน Host เอง | ❌ | ✅ |
| เหมาะกับ Database | ✅ แนะนำ | ใช้ได้บางกรณี |
| เหมาะกับ Source Code ตอนพัฒนา | ไม่ค่อยเหมาะ | ✅ |
| เหมาะกับ Persistent Data ใน Production | ✅ | ต้องจัดการสิทธิ์และ path เอง |
| เปิดและแก้ไฟล์จาก Host ได้สะดวก | ไม่เน้น | ✅ |

จำง่าย ๆ:

```text
Database / Upload / Application Data ──> Docker Volume
Source Code / Local Config ตอน Dev ────> Bind Mount
```

### ตัวอย่าง: ระบบอัปโหลดไฟล์

ถ้า API บันทึกไฟล์ลง `/app/uploads` โดยไม่มี mount ไฟล์อาจหายเมื่อลบ Container

```powershell
docker run -d -v uploads-data:/app/uploads my-api
```

### ตัวอย่าง: Database

Database ต้องเก็บไฟล์ไว้นอก lifecycle ของ Container เช่น SQL Server:

```text
SQL Server Container
        │
        ▼
Docker Volume
        │
        ▼
Database Files
```

ตัวอย่างแนวคิดในการ mount:

```text
-v sqlserver-data:/var/opt/mssql
```

สรุปสั้น ๆ:

```text
Container = Disposable
Data      = Persistent
```

---

## 11. Challenge: Volume Persistence

ลองทำด้วยตัวเองก่อนเปิดดูเฉลย

### โจทย์

1. สร้าง Volume ชื่อ `challenge07-data`
2. รัน Nginx ที่ Port `8085`
3. สร้าง `index.html` ที่มีข้อความ `Persistent Data Workshop 07`
4. ลบ Container
5. สร้าง Container ใหม่โดยใช้ Volume เดิม
6. ตรวจว่าข้อมูลยังอยู่ที่ [http://localhost:8085](http://localhost:8085)

<details>
<summary>ดูเฉลย</summary>

```powershell
docker volume create challenge07-data
docker run -d --name challenge07 -p 8085:80 -v challenge07-data:/usr/share/nginx/html nginx
docker exec challenge07 sh -c "echo '<h1>Persistent Data Workshop 07</h1>' > /usr/share/nginx/html/index.html"
docker rm -f challenge07
docker run -d --name challenge07-new -p 8085:80 -v challenge07-data:/usr/share/nginx/html nginx
docker exec challenge07-new cat /usr/share/nginx/html/index.html
```

</details>

---

## 12. Challenge: Bind Mount

### โจทย์

1. สร้างโฟลเดอร์ `challenge07-bind`
2. สร้าง `index.html` ที่มีข้อความ `Bind Mount Version 1`
3. Bind Mount โฟลเดอร์เข้า Nginx และเปิดที่ Port `8086`
4. แก้ข้อความเป็น `Bind Mount Version 2`
5. Refresh Browser โดยไม่ Build Image และไม่ Restart Container

<details>
<summary>ดูแนวทางสำหรับ PowerShell</summary>

```powershell
New-Item -ItemType Directory -Path challenge07-bind -Force
Set-Content -Path .\challenge07-bind\index.html -Value '<h1>Bind Mount Version 1</h1>'
Set-Location .\challenge07-bind

docker run -d `
  --name bind-test `
  -p 8086:80 `
  --mount "type=bind,source=$($PWD.Path),target=/usr/share/nginx/html" `
  nginx
```

เปิด [http://localhost:8086](http://localhost:8086) จากนั้นแก้ `index.html` และ Refresh Browser

</details>

---

## 13. Cleanup

หยุดและลบ Container ที่สร้างใน Workshop:

```powershell
docker rm -f nginx-volume-new nginx-bind challenge07-new bind-test
```

หากบางชื่อไม่มีอยู่ Docker อาจแสดงข้อความ Error ซึ่งไม่กระทบกับ Container อื่น

ลบ Volume เมื่อแน่ใจว่าไม่ต้องการข้อมูลแล้ว:

```powershell
docker volume rm workshop07-data challenge07-data
```

ถ้า Volume ยังถูกใช้งานอยู่ Docker จะไม่ยอมลบ ให้ตรวจสอบและลบ Container ที่ใช้งาน Volume นั้นก่อน

### ระวัง `docker volume prune`

```powershell
docker volume prune
```

คำสั่งนี้ใช้ลบ Volume ที่ Docker มองว่าไม่ได้ใช้งาน ซึ่งอาจมี Database, Upload หรือข้อมูลสำคัญอยู่

> [!CAUTION]
> อย่าใช้ `docker volume prune` หรือ `docker system prune` เพียงเพราะต้องการ “ล้าง Docker ให้สะอาด” โดยเฉพาะบน Production ควรตรวจสอบรายการที่จะลบและสำรองข้อมูลก่อนเสมอ

---

## สรุปคำสั่งสำคัญ

```powershell
# สร้างและดู Volume
docker volume create my-data
docker volume ls
docker volume inspect my-data

# ใช้ Named Volume
docker run -v my-data:/app/data IMAGE_NAME

# ใช้ Bind Mount บน PowerShell
docker run --mount "type=bind,source=$($PWD.Path),target=/app" IMAGE_NAME

# ตรวจสอบ Mount
docker inspect CONTAINER_NAME

# ลบ Volume
docker volume rm my-data
```

## ภาพรวมทั้ง Workshop

```text
ไม่มี Mount
Container ──ถูกลบ──> Data หาย

Docker Volume
Container ──mount──> Volume ──> Persistent Data

Bind Mount
Windows Folder ──mount──> Container Path
```

เส้นทางการเรียนรู้ของเราตอนนี้:

```text
01 Image / Container
         ↓
02 Logs / Exec / Inspect
         ↓
03 Port Mapping
         ↓
04 Dockerfile
         ↓
05 Node.js Container
         ↓
06 Docker Network
         ↓
07 Volume / Persistent Data  ← ตอนนี้
         ↓
08 Environment & Configuration
         ↓
09 Docker Compose
```

Workshop ถัดไปจะพูดถึง Environment Variables, `.env`, Config และ Secrets เพื่อให้ค่าอย่าง `PORT`, `DATABASE_URL` และ `NODE_ENV` เปลี่ยนไปตามแต่ละ Environment ได้โดยไม่ต้องแก้ Source Code
