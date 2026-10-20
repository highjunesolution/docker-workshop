import express from "express";
import "dotenv/config";
import config from "./config.js"

const app = express();
const PORT = config.app.port
const NODE_ENV = config.app.environment
const APP_NAME = config.app.name
const LOG_LEVEL = config.app.logLevel

app.get("/", (req, res) => {
  res.json({
    message: "Docker Environment Workshop",
    appName: APP_NAME,
    environment: NODE_ENV,
    logLevel: LOG_LEVEL,
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: APP_NAME,
    environment: NODE_ENV,
    port: PORT,
  });
});

app.get("/config", (req, res)=>{
  res.json({
    appName: APP_NAME,
    nodeEnv: NODE_ENV,
    logLevel: LOG_LEVEL,
    port: PORT
  })
})



app.listen(PORT, "0.0.0.0", () => {
  console.log(`${APP_NAME} started`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Log Level: ${LOG_LEVEL}`);
  console.log(`Listening on port ${PORT}`);
});

