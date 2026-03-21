import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12)
});

export const smartObjectiveSchema = z.object({
  title: z.string().min(2),
  specific: z.string().min(2),
  measurable: z.string().min(2),
  achievable: z.string().min(2),
  relevant: z.string().min(2),
  timeBound: z.string().min(2)
});

export const smartObjectiveReviewSchema = z.object({
  approved: z.boolean(),
  comment: z.string().optional()
});

export const smartObjectiveReorderSchema = z.object({
  ids: z.array(z.string())
});

export const prospectSchema = z.object({
  companyName: z.string().min(2),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  sector: z.string().optional(),
  notes: z.string().optional()
});
