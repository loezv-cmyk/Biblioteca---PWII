const { z } = require("zod");

// Para crear
const createBookSchema = z.object({
  title: z.string().min(1, "title es requerido"),
  author: z.string().min(1, "author es requerido"),
});

// Para actualizar (parcial)
const updateBookSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Debes enviar al menos un campo: title o author",
});

module.exports = { createBookSchema, updateBookSchema };