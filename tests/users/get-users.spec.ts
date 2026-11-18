import { faker } from '@faker-js/faker';
import { expect, test } from '../../fixtures/api';
import {
  partialUsersPageSchema,
  storedUserSchema,
  usersPageSchema,
  type StoredUser,
} from '../../schemas/user.schema';
import {
  expectErrorResponse,
  expectJson,
  expectPageWindow,
  expectSecurityHeaders,
  expectSortedBy,
} from '../../utils/assertions';
import { Tag } from '../../utils/tags';
import {
  invalidListQueryCases,
  nonExistentId,
  nonNumericId,
  paginationWindows,
} from '../../utils/test-data';

test.describe('GET /users', { tag: Tag.Regression }, () => {
  let reference: StoredUser;
  let total: number;

  test.beforeAll(async ({ users }) => {
    const response = await users.list({ limit: 1, skip: faker.number.int({ min: 0, max: 99 }) });
    const page = expectJson(response, 200, usersPageSchema);
    const [user] = page.users;

    if (!user) {
      throw new Error('Se esperaba al menos un usuario para usar como referencia');
    }

    reference = user;
    total = page.total;
  });

  test(
    'devuelve la primera página de usuarios con un contrato válido',
    { tag: [Tag.Smoke, Tag.Critical] },
    async ({ users }) => {
      const response = await users.list();
      const page = expectJson(response, 200, usersPageSchema);

      expectSecurityHeaders(response);
      expect(page.total).toBeGreaterThan(0);
      expectPageWindow(page, page.users.length, { limit: 30, skip: 0 });
    },
  );

  for (const window of paginationWindows) {
    test(`devuelve ${window.limit} usuario(s) con skip ${window.skip}`, async ({ users }) => {
      const response = await users.list(window);
      const page = expectJson(response, 200, usersPageSchema);

      expectPageWindow(page, page.users.length, window);
    });
  }

  test('devuelve la última página incompleta cuando skip se acerca al total', async ({ users }) => {
    const window = { limit: 10, skip: total - 3 };
    const response = await users.list({ ...window, select: ['id'] });
    const page = expectJson(response, 200, partialUsersPageSchema);

    expectPageWindow(page, page.users.length, window);
  });

  test('devuelve todos los usuarios cuando limit es 0', async ({ users }) => {
    const response = await users.list({ limit: 0, select: ['id'] });
    const page = expectJson(response, 200, partialUsersPageSchema);

    expect(page.users).toHaveLength(page.total);
    expect(new Set(page.users.map((user) => user.id)).size).toBe(page.total);
  });

  test('devuelve solo los campos seleccionados más el id', async ({ users }) => {
    const response = await users.list({ limit: 5, select: ['firstName', 'email'] });
    const page = expectJson(response, 200, partialUsersPageSchema);

    for (const user of page.users) {
      expect(Object.keys(user).sort()).toEqual(['email', 'firstName', 'id']);
    }
  });

  for (const order of ['asc', 'desc'] as const) {
    test(`ordena los usuarios por edad en orden ${order}`, async ({ users }) => {
      const response = await users.list({ sortBy: 'age', order, limit: 50 });
      const page = expectJson(response, 200, usersPageSchema);

      expectSortedBy(page.users, (user) => user.age, order);
    });
  }

  test('devuelve un usuario por id', { tag: Tag.Smoke }, async ({ users }) => {
    const response = await users.getById(reference.id);
    const user = expectJson(response, 200, storedUserSchema);

    expect(user).toEqual(reference);
  });

  test('busca usuarios por nombre', async ({ users }) => {
    const term = reference.firstName.toLowerCase();
    const response = await users.search(term, { limit: 0 });
    const page = expectJson(response, 200, usersPageSchema);

    expect(page.users.map((user) => user.id)).toContain(reference.id);

    for (const user of page.users) {
      const searchable = [user.firstName, user.lastName, user.email, user.username]
        .join(' ')
        .toLowerCase();
      expect(searchable).toContain(term);
    }
  });

  test('filtra usuarios por un campo anidado', async ({ users }) => {
    const color = reference.hair.color;
    const response = await users.filter('hair.color', color, { limit: 0 });
    const page = expectJson(response, 200, usersPageSchema);

    expect(page.users.map((user) => user.id)).toContain(reference.id);

    for (const user of page.users) {
      expect(user.hair.color).toBe(color);
    }
  });

  test('responde 404 con un id de usuario que no existe', async ({ users }) => {
    const id = nonExistentId();
    const response = await users.getById(id);

    expectErrorResponse(response, 404, `User with id '${id}' not found`);
  });

  test('responde 400 con un id de usuario no numérico', async ({ users }) => {
    const id = nonNumericId();
    const response = await users.getById(id);

    expectErrorResponse(response, 400, `Invalid user id '${id}'`);
  });

  for (const testCase of invalidListQueryCases) {
    test(`responde 400 cuando ${testCase.name}`, async ({ users }) => {
      const response = await users.list(testCase.query);

      expectErrorResponse(response, 400, testCase.message);
    });
  }
});
