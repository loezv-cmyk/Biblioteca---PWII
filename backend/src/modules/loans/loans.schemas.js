const { z } = require("zod");

const createLoanSchema = z.object({
  userId: z.number().int().positive(),
  items: z.array(
    z.object({
      bookId: z.number().int().positive(),
      qty: z.number().int().positive().default(1),
    })
  ).min(1, "Debes enviar al menos 1 libro"),
});

module.exports = { createLoanSchema };