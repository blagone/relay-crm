import { z } from "zod";

const optionalEmail = z.string().trim().max(254, "Почта слишком длинная").refine(
  (value) => value === "" || z.email().safeParse(value).success,
  "Введите корректную почту",
);

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя клиента").max(120, "Имя слишком длинное"),
  company: z.string().trim().max(160, "Название компании слишком длинное"),
  email: optionalEmail,
  phone: z.string().trim().max(40, "Телефон слишком длинный"),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
