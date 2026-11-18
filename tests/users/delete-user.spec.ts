import { faker } from '@faker-js/faker';
import { expect, test } from '../../fixtures/api';
import { deletedUserSchema, usersPageSchema, type StoredUser } from '../../schemas/user.schema';
import { expectErrorResponse, expectJson, expectRecentTimestamp } from '../../utils/assertions';
import { Tag } from '../../utils/tags';
import { nonExistentId, nonNumericId } from '../../utils/test-data';

test.describe('DELETE /users/:id', { tag: Tag.Regression }, () => {
  let target: StoredUser;

  test.beforeEach(async ({ users }) => {
    const response = await users.list({ limit: 1, skip: faker.number.int({ min: 0, max: 99 }) });
    const [user] = expectJson(response, 200, usersPageSchema).users;

    if (!user) {
      throw new Error('Se esperaba un usuario para eliminar');
    }

    target = user;
  });

  test(
    'marca el usuario como eliminado y devuelve su último estado',
    { tag: [Tag.Smoke, Tag.Critical] },
    async ({ users }) => {
      const response = await users.remove(target.id);
      const deleted = expectJson(response, 200, deletedUserSchema);

      expect(deleted).toMatchObject(target);
      expectRecentTimestamp(deleted.deletedOn);
    },
  );

  test('responde 404 al eliminar un usuario que no existe', async ({ users }) => {
    const id = nonExistentId();
    const response = await users.remove(id);

    expectErrorResponse(response, 404, `User with id '${id}' not found`);
  });

  test('responde 400 cuando el id de usuario no es numérico', async ({ users }) => {
    const id = nonNumericId();
    const response = await users.remove(id);

    expectErrorResponse(response, 400, `Invalid user id '${id}'`);
  });
});
