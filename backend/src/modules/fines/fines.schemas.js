const { z } = require("zod");

const createFineSchema = z.object({
  userId: z.number().int().positive(),
  loanId: z.number().int().positive(),
  amount: z.number().positive(),
  reason: z.string().min(1, "reason es requerido"),
});

const updateFineSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(1).optional(),
  status: z.enum(["PENDING", "PAID"]).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Envía al menos un campo para actualizar",
});

module.exports = { createFineSchema, updateFineSchema };
