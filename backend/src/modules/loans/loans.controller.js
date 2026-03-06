const prisma = require("../../prisma");
const { createLoanSchema } = require("./loans.schemas");

// GET /loans
async function listLoans(req, res) {
  try {
    const loans = await prisma.loan.findMany({
      orderBy: { id: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        loanitem: { include: { book: true } },
      },
    });
    res.json(loans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar préstamos" });
  }
}

// POST /loans  (crea loan + loanitems + descuenta stock)
async function createLoan(req, res) {
  try {
    const parsed = createLoanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Body inválido", details: parsed.error.issues });
    }

    const { userId, items } = parsed.data;

    // Verifica usuario existe
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    // Validar stock de cada book
    const bookIds = items.map(i => i.bookId);
    const books = await prisma.book.findMany({ where: { id: { in: bookIds } } });

    if (books.length !== bookIds.length) {
      return res.status(400).json({ error: "Uno o más books no existen" });
    }

    for (const it of items) {
      const b = books.find(x => x.id === it.bookId);
      if (b.stock < it.qty) {
        return res.status(409).json({ error: `Stock insuficiente para bookId=${it.bookId}` });
      }
    }

    // Transacción: crea loan, crea items, descuenta stock
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: { userId, status: "ACTIVE" },
      });

      await tx.loanitem.createMany({
        data: items.map(it => ({
          loanId: loan.id,
          bookId: it.bookId,
          qty: it.qty,
        })),
      });

      // Descontar stock
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

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear préstamo" });
  }
}

// PUT /loans/:id/return  (marca devuelto + regresa stock)
async function returnLoan(req, res) {
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

    const updated = await prisma.$transaction(async (tx) => {
      // Regresar stock
      for (const it of loan.loanitem) {
        await tx.book.update({
          where: { id: it.bookId },
          data: { stock: { increment: it.qty } },
        });
      }

      // Marcar loan como devuelto
      await tx.loan.update({
        where: { id },
        data: { status: "RETURNED", returnDate: new Date() },
      });

      return tx.loan.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true } },
          loanitem: { include: { book: true } },
        },
      });
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al devolver préstamo" });
  }
}

module.exports = { listLoans, createLoan, returnLoan };