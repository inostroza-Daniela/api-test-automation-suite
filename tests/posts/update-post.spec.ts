import { faker } from '@faker-js/faker';
import { expect, test } from '../../fixtures/api';
import {
  deletedPostSchema,
  postSchema,
  postsPageSchema,
  updatedPostSchema,
  type Post,
} from '../../schemas/post.schema';
import {
  expectErrorResponse,
  expectJson,
  expectRecentTimestamp,
  expectSchema,
} from '../../utils/assertions';
import { Tag } from '../../utils/tags';
import { buildPost, nonExistentId } from '../../utils/test-data';

test.describe('PUT, PATCH y DELETE /posts/:id', { tag: Tag.Regression }, () => {
  let original: Post;

  test.beforeEach(async ({ posts }) => {
    const response = await posts.list({ limit: 1, skip: faker.number.int({ min: 0, max: 99 }) });
    const [post] = expectJson(response, 200, postsPageSchema).posts;

    if (!post) {
      throw new Error('Se esperaba un post para modificar');
    }

    original = post;
  });

  test(
    'PATCH cambia el título y mantiene el resto de los campos',
    { tag: Tag.Critical },
    async ({ posts }) => {
      const title = buildPost(original.userId).title;

      const response = await posts.update(original.id, { title });
      const updated = expectJson(response, 200, updatedPostSchema);

      expect(updated).toEqual({
        id: original.id,
        title,
        body: original.body,
        tags: original.tags,
        reactions: original.reactions,
        userId: original.userId,
      });
    },
  );

  test('PUT aplica todos los campos enviados', async ({ posts }) => {
    const payload = buildPost(original.userId);

    const response = await posts.replace(original.id, payload);
    const updated = expectJson(response, 200, updatedPostSchema);

    expect(updated).toEqual({ id: original.id, ...payload });
  });

  test('responde 404 al actualizar un post que no existe', async ({ posts }) => {
    const id = nonExistentId();
    const response = await posts.update(id, { title: buildPost(original.userId).title });

    expectErrorResponse(response, 404, `Post with id '${id}' not found`);
  });

  test(
    'DELETE marca el post como eliminado y devuelve su último estado',
    { tag: [Tag.Smoke, Tag.Critical] },
    async ({ posts }) => {
      const response = await posts.remove(original.id);
      const deleted = expectJson(response, 200, deletedPostSchema);

      expect(deleted).toMatchObject(original);
      expectRecentTimestamp(deleted.deletedOn);
    },
  );

  test('responde 404 al eliminar un post que no existe', async ({ posts }) => {
    const id = nonExistentId();
    const response = await posts.remove(id);

    expectErrorResponse(response, 404, `Post with id '${id}' not found`);
  });

  test.fail(
    'la respuesta de PATCH mantiene el contador de views del post',
    {
      tag: Tag.KnownDefect,
      annotation: {
        type: 'defecto',
        description: 'PATCH /posts/:id omite el campo "views" del recurso actualizado',
      },
    },
    async ({ posts }) => {
      const response = await posts.update(original.id, { title: buildPost(original.userId).title });
      const updated = expectSchema(response.body, postSchema);

      expect(updated.views).toBe(original.views);
    },
  );
});
