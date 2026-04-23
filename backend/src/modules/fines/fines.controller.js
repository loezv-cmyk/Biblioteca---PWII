const prisma = require("../../prisma");
const logger = require("../../utils/logger");
const { createFineSchema, updateFineSchema } = require("./fines.schemas");

// GET /fines  (con filtros: ?userId=X, ?status=PENDING/PAID)
async function listFines(req, res) {
  try {
    const where = {};
    if (req.query.userId) {
      const n = Number(req.query.userId);
      if (!Number.isNaN(n)) where.userId = n;
    }
    if (req.query.status) where.status = req.query.status;

    const fines = await prisma.fine.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        loan: {
          select: {
            id: true,
            loanDate: true,
            returnDate: true,
            dueDate: true,
            loanitem: { include: { book: { select: { id: true, title: true, author: true } } } },
          },
        },
      },
    });
    res.json(fines);
  } catch (err) {
    logger.error("Error al listar multas", { error: err.message });
    res.status(500).json({ error: "Error al consultar multas" });
  }
}

// GET /fines/:id
async function getFine(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const fine = await prisma.fine.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        loan: true,
      },
    });
    if (!fine) return res.status(404).json({ error: "Multa no encontrada" });
    res.json(fine);
  } catch (err) {
    logger.error("Error al obtener multa", { error: err.message });
    res.status(500).json({ error: "Error al consultar multa" });
  }
}

// POST /fines
async function createFine(req, res) {
  logger.info("Creando multa", { body: req.body });
  try {
    const parsed = createFineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Body inválido", details: parsed.error.issues });
    }
    const { userId, loanId, amount, reason } = parsed.data;

    const [user, loan] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.loan.findUnique({ where: { id: loanId } }),
    ]);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    if (!loan) return res.status(404).json({ error: "Préstamo no encontrado" });

    const fine = await prisma.fine.create({
      data: { userId, loanId, amount, reason, status: "PENDING" },
    });

    logger.info("Multa creada", { fineId: fine.id, userId, amount });
    res.status(201).json(fine);
  } catch (err) {
    logger.error("Error al crear multa", { error: err.message });
    res.status(500).json({ error: "Error al crear multa" });
  }
}

// PUT /fines/:id  (ej: marcar como pagada)
async function updateFine(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const parsed = updateFineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Body inválido", details: parsed.error.issues });
    }

    const exists = await prisma.fine.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Multa no encontrada" });

    const data = { ...parsed.data };
    if (data.status === "PAID" && exists.status !== "PAID") {
      data.paidAt = new Date();
    }

    const updated = await prisma.fine.update({ where: { id }, data });
    logger.info("Multa actualizada", { fineId: id, changes: data });
    res.json(updated);
  } catch (err) {
    logger.error("Error al actualizar multa", { error: err.message });
    res.status(500).json({ error: "Error al actualizar multa" });
  }
}

// DELETE /fines/:id
async function deleteFine(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const exists = await prisma.fine.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Multa no encontrada" });

    await prisma.fine.delete({ where: { id } });
    logger.info("Multa eliminada", { fineId: id });
    res.json({ status: "ok", message: "Multa eliminada" });
  } catch (err) {
    logger.error("Error al eliminar multa", { error: err.message });
    res.status(500).json({ error: "Error al eliminar multa" });
  }
}

module.exports = { listFines, getFine, createFine, updateFine, deleteFine };
