const prisma = require("../../prisma");
const { updateBookSchema } = require("./books.schemas");

// PUT /books/:id  (actualiza)
async function updateBook(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const parseResult = updateBookSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Body inválido",
        details: parseResult.error.issues,
      });
    }

    // Verificar si existe (mejor UX)
    const exists = await prisma.book.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Libro no encontrado" });
    }

    const updated = await prisma.book.update({
      where: { id },
      data: parseResult.data,
    });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: "Error interno" });
  }
}

// DELETE /books/:id  (elimina)
async function deleteBook(req, res) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const exists = await prisma.book.findUnique({ where: { id } });
    if (!exists) {
      return res.status(404).json({ error: "Libro no encontrado" });
    }

    await prisma.book.delete({ where: { id } });

    return res.json({ status: "ok", message: "Libro eliminado" });
  } catch (err) {
    return res.status(500).json({ error: "Error interno" });
  }
}

module.exports = { updateBook, deleteBook };