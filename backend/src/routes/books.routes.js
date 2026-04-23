const express = require("express");
const prisma = require("../prisma");
const logger = require("../utils/logger");
const { z } = require("zod");

const router = express.Router();

const { updateBook, deleteBook } = require("../modules/books/books.controller");

// Schema independiente para POST en backend (validación independiente del front)
const createBookSchema = z.object({
  title:  z.string().min(1, "title es requerido"),
  author: z.string().min(1, "author es requerido"),
  genre:  z.string().optional(),
  isbn:   z.string().optional(),
  stock:  z.number().int().nonnegative().optional(),
});

/**
 * GET /books  -> todos los libros
 */
router.get("/", async (req, res) => {
  try {
    const books = await prisma.book.findMany({ orderBy: { id: "asc" } });
    res.json(books);
  } catch (err) {
    logger.error("Error al listar libros", { error: err.message });
    res.status(500).json({ error: "Error al consultar libros" });
  }
});

/**
 * GET /books/:id -> un libro por id
 */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ error: "ID inválido" });

    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) return res.status(404).json({ error: "Libro no encontrado" });
    res.json(book);
  } catch (err) {
    logger.error("Error al obtener libro", { error: err.message });
    res.status(500).json({ error: "Error al consultar libro" });
  }
});

/**
 * POST /books -> crea un libro (con validación independiente)
 */
router.post("/", async (req, res) => {
  logger.info("Creando libro", { body: req.body });
  try {
    const parsed = createBookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Body inválido", details: parsed.error.issues });
    }

    const book = await prisma.book.create({ data: parsed.data });
    logger.info("Libro creado", { bookId: book.id });
    res.status(201).json(book);
  } catch (err) {
    logger.error("Error al crear libro", { error: err.message });
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ya existe un libro con ese ISBN" });
    }
    res.status(500).json({ error: "Error al crear libro" });
  }
});

router.put("/:id", updateBook);
router.delete("/:id", deleteBook);

module.exports = router;
