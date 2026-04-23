const prisma = require("../../prisma");
const logger = require("../../utils/logger");
const { createLoanSchema } = require("./loans.schemas");

// Duración por defecto de un préstamo en días
const LOAN_DAYS = 14;

// GET /loans  (con filtros opcionales: ?userId=X, ?status=ACTIVE)
async function listLoans(req, res) {
  try {
    const where = {};

    if (req.query.userId) {
      const userId = Number(req.query.userId);
      if (!Number.isNaN(userId)) where.userId = userId;
    }

    if (req.query.status) {
      where.status = req.query.status; // "ACTIVE", "RETURNED", "OVERDUE"
    }

    const loans = await prisma.loan.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        loanitem: { include: { book: true } },
      },
    });

    res.json(loans);
  } catch (err) {
    logger.error("Error al listar préstamos", { error: err.message });
    res.status(500).json({ error: "Error al consultar préstamos" });
  }
}

// GET /loans/:id
async function getLoan(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        loanitem: { include: { book: true } },
      },
    });

    if (!loan) return res.status(404).json({ error: "Préstamo no encontrado" });
    res.json(loan);
  } catch (err) {
    logger.error("Error al obtener préstamo", { error: err.message });
    res.status(500).json({ error: "Error al consultar préstamo" });
  }
}

// POST /loans  (crea loan + loanitems + descuenta stock + calcula dueDate)
async function createLoan(req, res) {
  logger.info("Creando préstamo", { body: req.body });
  try {
    const parsed = createLoanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Body inválido", details: parsed.error.issues });
    }

    const { userId, items } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const bookIds = items.map(i => i.bookId);
    const books = await prisma.book.findMany({ where: { id: { in: bookIds } } });

    if (books.length !== bookIds.length) {
      return res.status(400).json({ error: "Uno o más libros no existen" });
    }

    for (const it of items) {
      const b = books.find(x => x.id === it.bookId);
      if (b.stock < it.qty) {
        return res.status(409).json({ error: `Stock insuficiente para bookId=${it.bookId}` });
      }
    }

    // Fecha de devolución programada: hoy + LOAN_DAYS días
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: { userId, status: "ACTIVE", dueDate },
      });

      await tx.loanitem.createMany({
        data: items.map(it => ({
          loanId: loan.id,
          bookId: it.bookId,
          qty: it.qty,
        })),
      });

      for (const it of items) {
        await tx.book.update({
          where: { id: it.bookId },
          data: { stock: { decrement: it.qty } },
        });
      }

      return tx.loan.findUnique({
        where: { id: loan.id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          loanitem: { include: { book: true } },
        },
      });
    });

    logger.info("Préstamo creado", { loanId: result.id, userId });
    res.status(201).json(result);
  } catch (err) {
    logger.error("Error al crear préstamo", { error: err.message });
    res.status(500).json({ error: "Error al crear préstamo" });
  }
}

// PUT /loans/:id/return  (marca devuelto + regresa stock + crea multa si hay atraso)
async function returnLoan(req, res) {
  logger.info("Devolviendo préstamo", { loanId: req.params.id });
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { loanitem: true },
    });

    if (!loan) return res.status(404).json({ error: "Préstamo no encontrado" });
    if (loan.status === "RETURNED") {
      return res.status(409).json({ error: "El préstamo ya está devuelto" });
    }

    const now = new Date();

    // ¿Hay atraso?
    let fineCreated = null;
    if (loan.dueDate && now > loan.dueDate) {
      const daysLate = Math.ceil((now - loan.dueDate) / (1000 * 60 * 60 * 24));
      const amount = daysLate * 10; // $10 por día de atraso

      fineCreated = {
        userId: loan.userId,
        loanId: loan.id,
        amount,
        reason: `Devolución con ${daysLate} día(s) de atraso`,
        status: "PENDING",
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const it of loan.loanitem) {
        await tx.book.update({
          where: { id: it.bookId },
          data: { stock: { increment: it.qty } },
        });
      }

      await tx.loan.update({
        where: { id },
        data: { status: "RETURNED", returnDate: now },
      });

      if (fineCreated) {
        await tx.fine.create({ data: fineCreated });
      }

      return tx.loan.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          loanitem: { include: { book: true } },
          fine: true,
        },
      });
    });

    if (fineCreated) {
      logger.warn("Préstamo devuelto con atraso - multa generada", {
        loanId: id,
        amount: fineCreated.amount,
      });
    } else {
      logger.info("Préstamo devuelto a tiempo", { loanId: id });
    }

    res.json(updated);
  } catch (err) {
    logger.error("Error al devolver préstamo", { error: err.message });
    res.status(500).json({ error: "Error al devolver préstamo" });
  }
}

// DELETE /loans/:id (solo admin; cancela préstamo y regresa stock)
async function deleteLoan(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { loanitem: true },
    });
    if (!loan) return res.status(404).json({ error: "Préstamo no encontrado" });

    await prisma.$transaction(async (tx) => {
      // Si estaba activo, regresa el stock
      if (loan.status === "ACTIVE") {
        for (const it of loan.loanitem) {
          await tx.book.update({
            where: { id: it.bookId },
            data: { stock: { increment: it.qty } },
          });
        }
      }
      // Borrar items primero (FK)
      await tx.loanitem.deleteMany({ where: { loanId: id } });
      await tx.loan.delete({ where: { id } });
    });

    logger.info("Préstamo eliminado", { loanId: id });
    res.json({ status: "ok", message: "Préstamo eliminado" });
  } catch (err) {
    logger.error("Error al eliminar préstamo", { error: err.message });
    res.status(500).json({ error: "Error al eliminar préstamo" });
  }
}

module.exports = { listLoans, getLoan, createLoan, returnLoan, deleteLoan };
