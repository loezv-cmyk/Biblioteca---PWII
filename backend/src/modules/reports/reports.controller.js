const prisma = require("../../prisma");
const logger = require("../../utils/logger");

/**
 * REPORTE 1: Libros más prestados.
 * Cruza loanitem + book. Indicador: ranking de demanda.
 * GET /reports/most-borrowed-books?limit=10
 */
async function mostBorrowedBooks(req, res) {
  try {
    const limit = Number(req.query.limit) || 10;

    const grouped = await prisma.loanitem.groupBy({
      by: ["bookId"],
      _sum: { qty: true },
      orderBy: { _sum: { qty: "desc" } },
      take: limit,
    });

    const bookIds = grouped.map(g => g.bookId);
    const books = await prisma.book.findMany({ where: { id: { in: bookIds } } });

    const result = grouped.map(g => {
      const b = books.find(x => x.id === g.bookId);
      return {
        bookId: g.bookId,
        title: b?.title ?? "(eliminado)",
        author: b?.author ?? "-",
        totalLoans: g._sum.qty ?? 0,
      };
    });

    logger.info("Reporte: libros más prestados generado", { count: result.length });
    res.json({ report: "Libros más prestados", data: result });
  } catch (err) {
    logger.error("Error en reporte mostBorrowedBooks", { error: err.message });
    res.status(500).json({ error: "Error al generar reporte" });
  }
}

/**
 * REPORTE 2: Usuarios con más multas (pendientes y pagadas).
 * Cruza fine + user. Indicador: usuarios problemáticos.
 * GET /reports/users-with-most-fines
 */
async function usersWithMostFines(req, res) {
  try {
    const grouped = await prisma.fine.groupBy({
      by: ["userId"],
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    const userIds = grouped.map(g => g.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const result = grouped.map(g => {
      const u = users.find(x => x.id === g.userId);
      return {
        userId: g.userId,
        name: u?.name ?? "(eliminado)",
        email: u?.email ?? "-",
        totalFines: g._count.id,
        totalAmount: g._sum.amount ?? 0,
      };
    });

    logger.info("Reporte: usuarios con más multas generado", { count: result.length });
    res.json({ report: "Usuarios con más multas", data: result });
  } catch (err) {
    logger.error("Error en reporte usersWithMostFines", { error: err.message });
    res.status(500).json({ error: "Error al generar reporte" });
  }
}

/**
 * REPORTE 3: Préstamos vencidos / activos sin devolver.
 * Cruza loan + user + loanitem + book. Indicador: morosidad.
 * GET /reports/overdue-loans
 */
async function overdueLoans(req, res) {
  try {
    const now = new Date();

    const loans = await prisma.loan.findMany({
      where: {
        status: "ACTIVE",
        dueDate: { lt: now },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        loanitem: { include: { book: { select: { id: true, title: true, author: true } } } },
      },
      orderBy: { dueDate: "asc" },
    });

    const result = loans.map(l => ({
      loanId: l.id,
      user: l.user,
      loanDate: l.loanDate,
      dueDate: l.dueDate,
      daysOverdue: l.dueDate ? Math.floor((now - l.dueDate) / (1000 * 60 * 60 * 24)) : 0,
      books: l.loanitem.map(it => ({
        bookId: it.bookId,
        title: it.book?.title,
        qty: it.qty,
      })),
    }));

    logger.info("Reporte: préstamos vencidos generado", { count: result.length });
    res.json({ report: "Préstamos vencidos", count: result.length, data: result });
  } catch (err) {
    logger.error("Error en reporte overdueLoans", { error: err.message });
    res.status(500).json({ error: "Error al generar reporte" });
  }
}

/**
 * REPORTE 4: Resumen general del sistema (dashboard).
 * Cruza casi todas las tablas. Indicadores múltiples para toma de decisiones.
 * GET /reports/dashboard
 */
async function dashboardSummary(req, res) {
  try {
    const now = new Date();

    const [
      totalUsers,
      totalAdmins,
      totalBooks,
      totalStock,
      activeLoans,
      returnedLoans,
      overdueLoansCount,
      pendingFines,
      paidFines,
      pendingFinesAmount,
      activeHolds,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.book.count(),
      prisma.book.aggregate({ _sum: { stock: true } }),
      prisma.loan.count({ where: { status: "ACTIVE" } }),
      prisma.loan.count({ where: { status: "RETURNED" } }),
      prisma.loan.count({ where: { status: "ACTIVE", dueDate: { lt: now } } }),
      prisma.fine.count({ where: { status: "PENDING" } }),
      prisma.fine.count({ where: { status: "PAID" } }),
      prisma.fine.aggregate({ where: { status: "PENDING" }, _sum: { amount: true } }),
      prisma.hold.count({ where: { status: "WAITING" } }),
    ]);

    const result = {
      usuarios: { miembros: totalUsers, administradores: totalAdmins },
      libros:   { titulos: totalBooks, copiasTotales: totalStock._sum.stock ?? 0 },
      prestamos: {
        activos: activeLoans,
        devueltos: returnedLoans,
        vencidos: overdueLoansCount,
      },
      multas: {
        pendientes: pendingFines,
        pagadas: paidFines,
        montoPendiente: pendingFinesAmount._sum.amount ?? 0,
      },
      listaEspera: { activas: activeHolds },
      generadoEn: now,
    };

    logger.info("Reporte: dashboard generado");
    res.json({ report: "Dashboard general", data: result });
  } catch (err) {
    logger.error("Error en reporte dashboard", { error: err.message });
    res.status(500).json({ error: "Error al generar reporte" });
  }
}

/**
 * REPORTE 5 (extra): Actividad por usuario.
 * Cruza loan + fine + hold para un userId específico.
 * GET /reports/user-activity/:userId
 */
async function userActivity(req, res) {
  try {
    const userId = Number(req.params.userId);
    if (Number.isNaN(userId)) return res.status(400).json({ error: "userId inválido" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const [loans, fines, holds] = await Promise.all([
      prisma.loan.findMany({
        where: { userId },
        include: { loanitem: { include: { book: true } } },
        orderBy: { loanDate: "desc" },
      }),
      prisma.fine.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.hold.findMany({
        where: { userId },
        include: { book: { select: { id: true, title: true } } },
      }),
    ]);

    const result = {
      user,
      resumen: {
        totalPrestamos: loans.length,
        prestamosActivos: loans.filter(l => l.status === "ACTIVE").length,
        totalMultas: fines.length,
        multasPendientes: fines.filter(f => f.status === "PENDING").length,
        montoPendiente: fines.filter(f => f.status === "PENDING")
                              .reduce((acc, f) => acc + f.amount, 0),
        listasEsperaActivas: holds.filter(h => h.status === "WAITING").length,
      },
      prestamos: loans,
      multas: fines,
      listasEspera: holds,
    };

    logger.info("Reporte: actividad de usuario generado", { userId });
    res.json({ report: "Actividad del usuario", data: result });
  } catch (err) {
    logger.error("Error en reporte userActivity", { error: err.message });
    res.status(500).json({ error: "Error al generar reporte" });
  }
}

module.exports = {
  mostBorrowedBooks,
  usersWithMostFines,
  overdueLoans,
  dashboardSummary,
  userActivity,
};
