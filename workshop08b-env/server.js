import "dotenv/config";
import express from "express";
import { config } from "./config.js";

const app = express();
const PORT = config.app.port;
const NODE_ENV = config.app.environment;
const APP_NAME = config.app.name;
const LOG_LEVEL = config.app.logLevel;

app.get("/", (_req, res)=>{
  res.json({
    success:true,
    app: config.app
  })
})

app.get("/health", (_, res)=>{
  res.status(200).json({
    success: true,
    message: "Server is running",
    environment: NODE_ENV,
  })
});

app.get("/config", (_, res)=>{
  res.status(200).json({
    success:true,
    config:{
      app: config.app,
      datatabase: {
        ...config.database,
        password: "*******"
      }
    }
  })
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`${APP_NAME} started`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Log Level: ${LOG_LEVEL}`);
  console.log(`Listening on port ${PORT}`);
});
