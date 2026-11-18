import { z } from 'zod';

export const idSchema = z.number().int().positive();

export const pageMetaShape = {
  total: z.number().int().nonnegative(),
  skip: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
};

export const errorSchema = z.object({
  message: z.string().min(1),
});

export const deletionShape = {
  isDeleted: z.literal(true),
  deletedOn: z.iso.datetime(),
};

export type PageMeta = z.infer<z.ZodObject<typeof pageMetaShape>>;
