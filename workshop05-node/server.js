require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res) => {
  res.json({
    message: "Hello from docker Node.js API",
  });
});

app.get("/info", (req, res)=>{
  res.json({
    app: "Docker Workshop",
    workshop: 5,
    runtime: "Node.js",
    environment: "Docker"
  })
})

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "workshop05-node-api",
    port,
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, "0.0.0.0", () =>
  console.log(`Server is running on port ${port}`),
);
