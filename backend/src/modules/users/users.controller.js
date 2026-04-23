const prisma = require("../../prisma");
const bcrypt = require("bcrypt");
const { createUserSchema, updateUserSchema } = require("./users.schemas");

// GET /users
async function listUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { id: "asc" },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar usuarios" });
  }
}

// POST /users
async function createUser(req, res) {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Body inválido", details: parsed.error.issues });
    }

    const { name, email, password, role } = parsed.data;

    const hash = await bcrypt.hash(password, 10);

    const created = await prisma.user.create({
      data: { name, email, password: hash, role: role ?? undefined },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);

    // Email duplicado (unique)
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ese email ya está registrado" });
    }

    res.status(500).json({ error: "Error al crear usuario" });
  }
}

// PUT /users/:id
async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Body inválido", details: parsed.error.issues });
    }

    const exists = await prisma.user.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Usuario no encontrado" });

    const data = { ...parsed.data };

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    if (err.code === "P2002") return res.status(409).json({ error: "Ese email ya está registrado" });
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
}

// DELETE /users/:id
async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const exists = await prisma.user.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Usuario no encontrado" });

    await prisma.user.delete({ where: { id } });
    res.json({ status: "ok", message: "Usuario eliminado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser };