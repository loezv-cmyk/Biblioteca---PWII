const { z } = require("zod");

const createUserSchema = z.object({
  name: z.string().min(1, "name es requerido"),
  email: z.string().email("email inválido"),
  password: z.string().min(6, "password mínimo 6 caracteres"),
  role: z.string().optional(), // "USER" por default
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.string().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Envía al menos un campo para actualizar",
});

module.exports = { createUserSchema, updateUserSchema };