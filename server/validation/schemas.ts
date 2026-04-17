import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email is invalid."),
  password: z.string().nonempty("Password is required."),
  remember: z.boolean().optional(),
});

export const registerSchema = loginSchema.extend({
  username: z.string().nonempty("Username is required."),
});
