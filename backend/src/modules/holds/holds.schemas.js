const { z } = require("zod");

const createHoldSchema = z.object({
  userId: z.number().int().positive(),
  bookId: z.number().int().positive(),
});

const updateHoldSchema = z.object({
  status: z.enum(["WAITING", "NOTIFIED", "CANCELLED", "FULFILLED"]).optional(),
  position: z.number().int().positive().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Envía al menos un campo para actualizar",
});

module.exports = { createHoldSchema, updateHoldSchema };
