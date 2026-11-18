import { faker } from '@faker-js/faker';
import { expect, test } from '../../fixtures/api';
import { postSchema, postsPageSchema, type Post } from '../../schemas/post.schema';
import {
  expectErrorResponse,
  expectJson,
  expectPageWindow,
  expectSecurityHeaders,
  expectSortedBy,
} from '../../utils/assertions';
import { Tag } from '../../utils/tags';
import { nonExistentId, nonNumericId, paginationWindows } from '../../utils/test-data';

test.describe('GET /posts', { tag: Tag.Regression }, () => {
  let reference: Post;

  test.beforeAll(async ({ posts }) => {
    const response = await posts.list({ limit: 1, skip: faker.number.int({ min: 0, max: 99 }) });
    const [post] = expectJson(response, 200, postsPageSchema).posts;

    if (!post) {
      throw new Error('Se esperaba al menos un post para usar como referencia');
    }

    reference = post;
  });

  test(
    'devuelve la primera página de posts con un contrato válido',
    { tag: [Tag.Smoke, Tag.Critical] },
    async ({ posts }) => {
      const response = await posts.list();
      const page = expectJson(response, 200, postsPageSchema);

      expectSecurityHeaders(response);
      expect(page.total).toBeGreaterThan(0);
      expectPageWindow(page, page.posts.length, { limit: 30, skip: 0 });
    },
  );

  for (const window of paginationWindows) {
    test(`devuelve ${window.limit} post(s) con skip ${window.skip}`, async ({ posts }) => {
      const response = await posts.list(window);
      const page = expectJson(response, 200, postsPageSchema);

      expectPageWindow(page, page.posts.length, window);
    });
  }

  for (const order of ['asc', 'desc'] as const) {
    test(`ordena los posts por views en orden ${order}`, async ({ posts }) => {
      const response = await posts.list({ sortBy: 'views', order, limit: 50 });
      const page = expectJson(response, 200, postsPageSchema);

      expectSortedBy(page.posts, (post) => post.views, order);
    });
  }

  test('devuelve un post por id', { tag: Tag.Smoke }, async ({ posts }) => {
    const response = await posts.getById(reference.id);
    const post = expectJson(response, 200, postSchema);

    expect(post).toEqual(reference);
  });

  test('responde 404 con un id de post que no existe', async ({ posts }) => {
    const id = nonExistentId();
    const response = await posts.getById(id);

    expectErrorResponse(response, 404, `Post with id '${id}' not found`);
  });

  test('responde 400 con un id de post no numérico', async ({ posts }) => {
    const id = nonNumericId();
    const response = await posts.getById(id);

    expectErrorResponse(response, 400, `Invalid post id '${id}'`);
  });
});
