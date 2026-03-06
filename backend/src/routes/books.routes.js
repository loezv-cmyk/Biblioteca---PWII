const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

const { updateBook, deleteBook } = require("../modules/books/books.controller");

/**
 * GET /books
 * Devuelve todos los libros
 */
router.get("/", async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      orderBy: { id: "asc" },
    });
    res.json(books);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al consultar libros" });
  }
});

/**
 * POST /books
 * Crea un libro
 */
router.post("/", async (req, res) => {
  try {
    const { title, author } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: "title y author son requeridos" });
    }

    const book = await prisma.book.create({
      data: { title, author },
    });

    res.status(201).json(book);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear libro" });
  }
});

/**
 * PUT /books/:id
 * Actualiza un libro
 */
router.put("/:id", updateBook);

/**
 * DELETE /books/:id
 * Elimina un libro
 */
router.delete("/:id", deleteBook);

module.exports = router;