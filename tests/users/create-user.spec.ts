import { faker } from '@faker-js/faker';
import { expect, test } from '../../fixtures/api';
import { partialUsersPageSchema, userRoleSchema, userSchema } from '../../schemas/user.schema';
import { expectJson } from '../../utils/assertions';
import { Tag } from '../../utils/tags';
import { buildUser } from '../../utils/test-data';

test.describe('POST /users/add', { tag: Tag.Regression }, () => {
  test(
    'crea un usuario y devuelve todos los campos enviados',
    { tag: [Tag.Smoke, Tag.Critical] },
    async ({ users }) => {
      const payload = buildUser();

      const response = await users.create(payload);
      const created = expectJson(response, 201, userSchema);

      expect(created).toMatchObject(payload);
    },
  );

  test('asigna el siguiente id correlativo al nuevo usuario', async ({ users }) => {
    const listResponse = await users.list({ limit: 1, select: ['id'] });
    const { total } = expectJson(listResponse, 200, partialUsersPageSchema);

    const response = await users.create(buildUser());
    const created = expectJson(response, 201, userSchema);

    expect(created.id).toBe(total + 1);
  });

  for (const role of userRoleSchema.options) {
    test(`crea un usuario con rol ${role}`, async ({ users }) => {
      const payload = buildUser({ role });

      const response = await users.create(payload);
      const created = expectJson(response, 201, userSchema);

      expect(created.role).toBe(role);
      expect(created.username).toBe(payload.username);
    });
  }

  test('completa los campos omitidos con los valores por defecto del servidor', async ({
    users,
  }) => {
    const payload = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    };

    const response = await users.create(payload);
    const created = expectJson(response, 201, userSchema);

    expect(created).toMatchObject({
      ...payload,
      role: 'user',
      email: '',
      age: null,
      hair: { color: '', type: '' },
    });
  });
});
