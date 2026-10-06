import express from "express"
const app = express();
const PORT = 3001;

const users = [
    {
        id:1,
        name: "James",
        department: "IT"
    },
    {
        id: 2,
        name: "Kevin",
        department: "Engineering",
    }
];

app.get("/users/:id", (req, res) => {
  const id = Number(req.params.id);

  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  res.json(user);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Users API running on port ${PORT}`);
});