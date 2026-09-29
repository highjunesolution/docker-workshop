เราจะเรียน Docker แบบ Workshop ต่อเนื่องจาก 0 → Deploy งานจริง เน้นทำมากกว่าท่องจำ และจะผูกกับงานที่คุณใช้อยู่ เช่น Node.js / ASP.NET Core / SQL Server / Nginx / Ubuntu Server ด้วย
เป้าหมายสุดท้ายคือให้คุณเห็นโปรเจกต์แล้วตอบได้ว่า
ตัวนี้ควร Dockerize ยังไง, service ไหนแยก container, network ยังไง, volume อยู่ไหน, deploy server ยังไง และ debug ตอนพังยังไง

Roadmap: Docker Beginner → Real Work
Workshop	หัวข้อ	สิ่งที่จะทำ
01	Docker Basic	Image, Container, Docker Engine, Registry
02	Docker CLI	run, ps, stop, rm, logs, exec
03	Images	pull, inspect, tag, layers
04	Dockerfile	สร้าง image ของเราเอง
05	Node.js + Docker	Dockerize Express API
06	Port & Network	container คุยกันอย่างไร
07	Volume	ทำให้ข้อมูลไม่หาย
08	Environment	.env, environment variables
09	Docker Compose	หลาย container ในคำสั่งเดียว
10	Node + PostgreSQL	API + Database
11	ASP.NET Core	Dockerize .NET MVC/API
12	SQL Server	.NET + SQL Server containers
13	Nginx	Reverse Proxy
14	Production Dockerfile	multi-stage build
15	Health Check	ตรวจ service ว่ายังทำงานอยู่ไหม
16	Logging & Debug	logs, inspect, stats, exec
17	Security	non-root, secrets, image hygiene
18	Docker Registry	Docker Hub / Private Registry
19	Ubuntu Server	Deploy จริงบน Linux
20	CI/CD	Git → Build → Deploy
Final Project	Production Stack	Nginx + API + DB + Compose