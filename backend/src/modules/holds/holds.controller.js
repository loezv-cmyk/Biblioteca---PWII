const prisma = require("../../prisma");
const logger = require("../../utils/logger");
const { createHoldSchema, updateHoldSchema } = require("./holds.schemas");

// GET /holds  (con filtros opcionales: ?userId=X, ?bookId=X, ?status=X)
async function listHolds(req, res) {
  try {
    const where = {};
    if (req.query.userId) {
      const n = Number(req.query.userId);
      if (!Number.isNaN(n)) where.userId = n;
    }
    if (req.query.bookId) {
      const n = Number(req.query.bookId);
      if (!Number.isNaN(n)) where.bookId = n;
    }
    if (req.query.status) where.status = req.query.status;

    const holds = await prisma.hold.findMany({
      where,
      orderBy: [{ bookId: "asc" }, { position: "asc" }],
      include: {
        user: { select: { id: true, name: true, email: true } },
        book: { select: { id: true, title: true, author: true, genre: true } },
      },
    });
    res.json(holds);
  } catch (err) {
    logger.error("Error al listar holds", { error: err.message });
    res.status(500).json({ error: "Error al consultar lista de espera" });
  }
}

// GET /holds/:id
async function getHold(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const hold = await prisma.hold.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        book: { select: { id: true, title: true, author: true, genre: true } },
      },
    });
    if (!hold) return res.status(404).json({ error: "Hold no encontrado" });
    res.json(hold);
  } catch (err) {
    logger.error("Error al obtener hold", { error: err.message });
    res.status(500).json({ error: "Error al consultar hold" });
  }
}

// POST /holds
async function createHold(req, res) {
  logger.info("Creando hold", { body: req.body });
  try {
    const parsed = createHoldSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Body inválido", details: parsed.error.issues });
    }
    const { userId, bookId } = parsed.data;

    const [user, book] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.book.findUnique({ where: { id: bookId } }),
    ]);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    if (!book) return res.status(404).json({ error: "Libro no encontrado" });

    const existing = await prisma.hold.findFirst({
      where: { userId, bookId, status: { in: ["WAITING", "NOTIFIED"] } },
    });
    if (existing) {
      return res.status(409).json({ error: "Ya estás en la lista de espera de este libro" });
    }

    const last = await prisma.hold.findFirst({
      where: { bookId, status: "WAITING" },
      orderBy: { position: "desc" },
    });
    const position = last ? last.position + 1 : 1;

    const hold = await prisma.hold.create({
      data: { userId, bookId, position, status: "WAITING" },
    });

    logger.info("Hold creado", { holdId: hold.id, userId, bookId, position });
    res.status(201).json(hold);
  } catch (err) {
    logger.error("Error al crear hold", { error: err.message });
    res.status(500).json({ error: "Error al crear hold" });
  }
}

// PUT /holds/:id
async function updateHold(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const parsed = updateHoldSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Body inválido", details: parsed.error.issues });
    }

    const exists = await prisma.hold.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Hold no encontrado" });

    const updated = await prisma.hold.update({
      where: { id },
      data: parsed.data,
    });

    logger.info("Hold actualizado", { holdId: id, changes: parsed.data });
    res.json(updated);
  } catch (err) {
    logger.error("Error al actualizar hold", { error: err.message });
    res.status(500).json({ error: "Error al actualizar hold" });
  }
}

// DELETE /holds/:id  (cuando eliminas, re-acomoda posiciones de la fila)
async function deleteHold(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const hold = await prisma.hold.findUnique({ where: { id } });
    if (!hold) return res.status(404).json({ error: "Hold no encontrado" });

    await prisma.$transaction(async (tx) => {
      // Borrar el hold
      await tx.hold.delete({ where: { id } });

      // Re-acomodar posiciones de los siguientes en la fila
      await tx.hold.updateMany({
        where: {
          bookId: hold.bookId,
          status: "WAITING",
          position: { gt: hold.position },
        },
        data: { position: { decrement: 1 } },
      });
    });

    logger.info("Hold eliminado y cola reordenada", { holdId: id });
    res.json({ status: "ok", message: "Lista de espera cancelada" });
  } catch (err) {
    logger.error("Error al eliminar hold", { error: err.message });
    res.status(500).json({ error: "Error al eliminar hold" });
  }
}

module.exports = { listHolds, getHold, createHold, updateHold, deleteHold };
