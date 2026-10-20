function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value
}

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

export default config;
