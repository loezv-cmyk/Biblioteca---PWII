require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const booksRoutes = require("./routes/books.routes");
const usersRoutes = require("./routes/users.routes");
const loansRoutes = require("./routes/loans.routes");
const authRoutes  = require("./routes/auth.routes");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/auth",  authRoutes);
app.use("/books", booksRoutes);
app.use("/users", usersRoutes);
app.use("/loans", loansRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor funcionando" });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});