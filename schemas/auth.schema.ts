import { z } from 'zod';
import { idSchema } from './common.schema';

export const jwtSchema = z.jwt();

export const tokenPairSchema = z.object({
  accessToken: jwtSchema,
  refreshToken: jwtSchema,
});

export const loginResponseSchema = tokenPairSchema.extend({
  id: idSchema,
  username: z.string().min(1),
  email: z.email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  gender: z.enum(['female', 'male']),
  image: z.url(),
});

export const jwtPayloadSchema = z.object({
  id: idSchema,
  username: z.string().min(1),
  email: z.email(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
});

export const credentialsPageSchema = z.object({
  users: z
    .array(z.object({ id: idSchema, username: z.string().min(1), password: z.string().min(1) }))
    .nonempty(),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
