import express from "express"

const app = express();

const PORT = 3002;

const USERS_API_URL =
  process.env.USERS_API_URL || "http://users-api:3001";

const orders = [
  {
    id: 100,
    product: "Keyboard",
    quantity: 1,
    userId: 1,
  },
  {
    id: 101,
    product: "Mouse",
    quantity: 2,
    userId: 2,
  },
];

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "orders-api",
  });
});

app.get("/orders/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const order = orders.find((o) => o.id === id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const response = await fetch(
      `${USERS_API_URL}/users/${order.userId}`
    );

    if (!response.ok) {
      throw new Error("Cannot get user");
    }

    const user = await response.json();

    res.json({
      ...order,
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Cannot communicate with users-api",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Orders API running on port ${PORT}`);
});