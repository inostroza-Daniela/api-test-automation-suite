import { z } from 'zod';
import { deletionShape, idSchema, pageMetaShape } from './common.schema';

const coordinatesSchema = z.object({
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

const addressSchema = z.object({
  address: z.string(),
  city: z.string(),
  state: z.string(),
  stateCode: z.string(),
  postalCode: z.string(),
  coordinates: coordinatesSchema,
  country: z.string(),
});

export const userRoleSchema = z.enum(['admin', 'moderator', 'user']);

export const userSchema = z.object({
  id: idSchema,
  firstName: z.string(),
  lastName: z.string(),
  maidenName: z.string(),
  age: z.number().int().nonnegative().nullable(),
  gender: z.string(),
  email: z.string(),
  phone: z.string(),
  username: z.string(),
  password: z.string(),
  birthDate: z.string(),
  image: z.string(),
  bloodGroup: z.string(),
  height: z.number().nullable(),
  weight: z.number().nullable(),
  eyeColor: z.string(),
  hair: z.object({ color: z.string(), type: z.string() }),
  ip: z.string(),
  address: addressSchema,
  macAddress: z.string(),
  university: z.string(),
  bank: z.object({
    cardExpire: z.string(),
    cardNumber: z.string(),
    cardType: z.string(),
    currency: z.string(),
    iban: z.string(),
  }),
  company: z.object({
    department: z.string(),
    name: z.string(),
    title: z.string(),
    address: addressSchema,
  }),
  ein: z.string(),
  ssn: z.string(),
  userAgent: z.string(),
  crypto: z.object({ coin: z.string(), wallet: z.string(), network: z.string() }),
  role: userRoleSchema,
});

export const storedUserSchema = userSchema.extend({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  age: z.number().int().positive(),
  gender: z.enum(['female', 'male']),
  email: z.email(),
  username: z.string().min(1),
  image: z.url(),
});

export const usersPageSchema = z.object({
  users: z.array(storedUserSchema),
  ...pageMetaShape,
});

export const partialUsersPageSchema = z.object({
  users: z.array(z.looseObject({ id: idSchema })),
  ...pageMetaShape,
});

export const deletedUserSchema = storedUserSchema.extend(deletionShape);

export type User = z.infer<typeof userSchema>;
export type StoredUser = z.infer<typeof storedUserSchema>;
