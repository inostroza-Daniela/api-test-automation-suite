import { faker } from '@faker-js/faker';
import { expect, test } from '../../fixtures/api';
import { userSchema, usersPageSchema, type StoredUser } from '../../schemas/user.schema';
import { expectErrorResponse, expectJson } from '../../utils/assertions';
import { Tag } from '../../utils/tags';
import { buildUser, buildUserChanges, nonExistentId, nonNumericId } from '../../utils/test-data';

test.describe('PUT y PATCH /users/:id', { tag: Tag.Regression }, () => {
  let original: StoredUser;

  test.beforeEach(async ({ users }) => {
    const response = await users.list({ limit: 1, skip: faker.number.int({ min: 0, max: 99 }) });
    const [user] = expectJson(response, 200, usersPageSchema).users;

    if (!user) {
      throw new Error('Se esperaba un usuario para actualizar');
    }

    original = user;
  });

  test(
    'PATCH cambia solo los campos enviados',
    { tag: [Tag.Smoke, Tag.Critical] },
    async ({ users }) => {
      const changes = buildUserChanges();

      const response = await users.update(original.id, changes);
      const updated = expectJson(response, 200, userSchema);

      expect(updated).toEqual({ ...original, ...changes });
    },
  );

  test('PUT aplica los campos enviados y mantiene los campos anidados que omite', async ({
    users,
  }) => {
    const payload = buildUser({ role: original.role });

    const response = await users.replace(original.id, payload);
    const updated = expectJson(response, 200, userSchema);

    expect(updated).toMatchObject({ ...payload, id: original.id });
    expect(updated.company.address).toEqual(original.company.address);
  });

  test.fail(
    'PUT actualiza el usuario de la ruta aunque el body traiga otro id',
    {
      tag: [Tag.KnownDefect, Tag.Critical],
      annotation: {
        type: 'defecto',
        description: 'Un "id" en el body reemplaza el parámetro :id de la ruta',
      },
    },
    async ({ users }) => {
      const payload = { ...buildUser(), id: nonExistentId() };

      const response = await users.replace(original.id, payload);
      const updated = expectJson(response, 200, userSchema);

      expect(updated.id).toBe(original.id);
    },
  );

  test('responde 404 al actualizar un usuario que no existe', async ({ users }) => {
    const id = nonExistentId();
    const response = await users.update(id, buildUserChanges());

    expectErrorResponse(response, 404, `User with id '${id}' not found`);
  });

  test('responde 400 cuando el id de usuario no es numérico', async ({ users }) => {
    const id = nonNumericId();
    const response = await users.replace(id, buildUser());

    expectErrorResponse(response, 400, `Invalid user id '${id}'`);
  });
});
