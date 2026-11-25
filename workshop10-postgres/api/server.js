import "dotenv/config";
import express from "express";
import { Pool } from "pg";

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

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      api: "healthy",
      database: "connected",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.get("/api/employees", async (_req, res) => {
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
    const { employeeCode, name, department } = req.body;
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
      [employeeCode, name, department],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Cannot create employee",
    });
  }
});

app.get("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `
        SELECT
          id,
          employee_code,
          name,
          department
        FROM employees
        WHERE id = $1
      `,
      [Number(id)]
    )

    if(!result.rowCount) {
      return res.status(404).json({
        message: "Employee not found"
      })
    }

    res.status(200).json(result.rows[0])
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Cannot find employee",
    });
  }
})


app.listen(PORT, "0.0.0.0", () => {
  console.log(`API is running on http://localhost:${PORT}`);
});
