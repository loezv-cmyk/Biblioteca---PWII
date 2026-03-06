const express  = require("express");
const bcrypt   = require("bcrypt");
const jwt      = require("jsonwebtoken");
const prisma   = require("../prisma");
const { z }    = require("zod");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "biblioteca_secret_key";

const loginSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(1, "Password requerido"),
});

const registerSchema = z.object({
  name:     z.string().min(1, "Nombre requerido"),
  email:    z.string().email("Email inválido"),
  password: z.string().min(6, "Password mínimo 6 caracteres"),
});

router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Datos inválidos", details: parsed.error.issues });
    }

    const { name, email, password } = parsed.data;

    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hash, role: "USER" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json({ message: "Usuario registrado correctamente", user });
  } catch (err) {
    console.error(err);
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ese email ya está registrado" });
    }
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

module.exports = router;