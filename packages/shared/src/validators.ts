import { z } from "zod";

export const rolSchema = z.enum(["admin", "antrenor", "veli", "ogrenci"]);

export const performansSchema = z.object({
  hiz: z.number().min(0).max(100),
  sut: z.number().min(0).max(100),
  pas: z.number().min(0).max(100),
  dripling: z.number().min(0).max(100),
  dayaniklilik: z.number().min(0).max(100),
  oyunZekasi: z.number().min(0).max(100),
  disiplin: z.number().min(0).max(100)
});

