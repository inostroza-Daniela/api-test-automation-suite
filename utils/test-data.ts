import { faker } from '@faker-js/faker';
import type { Credentials } from '../services/auth.service';
import type { ListQuery } from './list-query';
import type { PostPayload } from '../services/posts.service';
import type { UserPayload } from '../services/users.service';

export function buildUser(overrides: Partial<UserPayload> = {}): UserPayload {
  const gender = faker.helpers.arrayElement(['female', 'male'] as const);
  const firstName = faker.person.firstName(gender);
  const lastName = faker.person.lastName();
  const age = faker.number.int({ min: 18, max: 80 });

  return {
    firstName,
    lastName,
    age,
    gender,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    phone: faker.phone.number({ style: 'international' }),
    username: faker.internet.username({ firstName, lastName }).toLowerCase(),
    password: faker.internet.password({ length: 16 }),
    birthDate: faker.date.birthdate({ mode: 'age', min: age, max: age }).toISOString().slice(0, 10),
    role: 'user',
    company: {
      name: faker.company.name(),
      department: faker.commerce.department(),
      title: faker.person.jobTitle(),
    },
    ...overrides,
  };
}

export function buildUserChanges(): Pick<UserPayload, 'lastName' | 'age'> {
  return {
    lastName: faker.person.lastName(),
    age: faker.number.int({ min: 18, max: 80 }),
  };
}

export function buildPost(userId: number, overrides: Partial<PostPayload> = {}): PostPayload {
  return {
    title: faker.lorem.sentence({ min: 3, max: 8 }).replace(/\.$/, ''),
    body: faker.lorem.paragraphs(2),
    userId,
    tags: faker.helpers.uniqueArray(() => faker.word.noun().toLowerCase(), 3),
    reactions: {
      likes: faker.number.int({ min: 0, max: 500 }),
      dislikes: faker.number.int({ min: 0, max: 100 }),
    },
    ...overrides,
  };
}

export function unknownUsername(): string {
  return `${faker.internet.username().toLowerCase()}_${faker.string.alphanumeric(10)}`;
}

export interface InvalidLoginCase {
  name: string;
  payload: (valid: Credentials) => Record<string, unknown>;
  message: string;
}

export const invalidLoginCases: readonly InvalidLoginCase[] = [
  {
    name: 'falta el username',
    payload: ({ password }) => ({ password }),
    message: 'Username and password required',
  },
  {
    name: 'falta la contraseña',
    payload: ({ username }) => ({ username }),
    message: 'Username and password required',
  },
  {
    name: 'el body está vacío',
    payload: () => ({}),
    message: 'Username and password required',
  },
  {
    name: 'la contraseña es incorrecta',
    payload: ({ username }) => ({ username, password: faker.internet.password({ length: 20 }) }),
    message: 'Invalid credentials',
  },
  {
    name: 'el username no existe',
    payload: ({ password }) => ({ username: unknownUsername(), password }),
    message: 'Invalid credentials',
  },
  {
    name: 'el username no es un string',
    payload: ({ password }) => ({ username: faker.number.int({ min: 1, max: 9999 }), password }),
    message: 'Username is not valid',
  },
];

export interface InvalidQueryCase {
  name: string;
  query: ListQuery;
  message: RegExp;
}

export const invalidListQueryCases: readonly InvalidQueryCase[] = [
  { name: 'limit es negativo', query: { limit: '-1' }, message: /Invalid 'limit'/ },
  { name: 'limit no es numérico', query: { limit: 'ten' }, message: /Invalid 'limit'/ },
  { name: 'skip es negativo', query: { skip: '-5' }, message: /Invalid 'skip'/ },
  { name: 'skip no es numérico', query: { skip: 'first' }, message: /Invalid 'skip'/ },
  {
    name: 'order no es asc ni desc',
    query: { sortBy: 'id', order: 'upwards' },
    message: /Invalid 'order'/,
  },
];

export const paginationWindows: readonly { limit: number; skip: number }[] = [
  { limit: 5, skip: 0 },
  { limit: 10, skip: 20 },
  { limit: 1, skip: 99 },
];

export interface InvalidAuthorCase {
  name: string;
  userId: () => unknown;
  status: number;
  message: RegExp;
}

export const invalidAuthorCases: readonly InvalidAuthorCase[] = [
  {
    name: 'falta el userId',
    userId: () => undefined,
    status: 400,
    message: /User id is required/,
  },
  {
    name: 'el userId no es numérico',
    userId: () => nonNumericId(),
    status: 400,
    message: /Invalid user id/,
  },
  {
    name: 'el userId no corresponde a un usuario existente',
    userId: () => nonExistentId(),
    status: 404,
    message: /User with id '\d+' not found/,
  },
];

export function nonExistentId(): number {
  return faker.number.int({ min: 100_000, max: 999_999 });
}

export function nonNumericId(): string {
  return faker.string.alpha(8);
}
