import { faker } from '@faker-js/faker';
import { expect, test } from '../../fixtures/api';
import {
  partialPostsPageSchema,
  postsPageSchema,
  tagListSchema,
  type Post,
} from '../../schemas/post.schema';
import { expectErrorResponse, expectJson } from '../../utils/assertions';
import { Tag } from '../../utils/tags';
import { nonExistentId } from '../../utils/test-data';

test.describe('GET /posts con filtros', { tag: Tag.Regression }, () => {
  let reference: Post;
  let referenceTag: string;

  test.beforeAll(async ({ posts }) => {
    const response = await posts.list({ limit: 1, skip: faker.number.int({ min: 0, max: 99 }) });
    const [post] = expectJson(response, 200, postsPageSchema).posts;

    const tag = post?.tags.at(0);

    if (!post || !tag) {
      throw new Error('Se esperaba un post con tags para usar como referencia');
    }

    reference = post;
    referenceTag = tag;
  });

  test('devuelve solo los posts del usuario indicado', { tag: Tag.Smoke }, async ({ posts }) => {
    const response = await posts.byUser(reference.userId, { limit: 0 });
    const page = expectJson(response, 200, postsPageSchema);

    expect(page.posts.map((post) => post.id)).toContain(reference.id);

    for (const post of page.posts) {
      expect(post.userId).toBe(reference.userId);
    }
  });

  test('responde 404 al filtrar por un usuario que no existe', async ({ posts }) => {
    const userId = nonExistentId();
    const response = await posts.byUser(userId);

    expectErrorResponse(response, 404, `User with id '${userId}' not found`);
  });

  test('devuelve solo los posts que tienen el tag pedido', async ({ posts }) => {
    const response = await posts.byTag(referenceTag, { limit: 0 });
    const page = expectJson(response, 200, postsPageSchema);

    expect(page.posts.map((post) => post.id)).toContain(reference.id);

    for (const post of page.posts) {
      expect(post.tags.map((value) => value.toLowerCase())).toContain(referenceTag.toLowerCase());
    }
  });

  test('lista todos los tags del post de referencia', async ({ posts }) => {
    const response = await posts.tagList();
    const tags = expectJson(response, 200, tagListSchema);

    expect(tags).toEqual(expect.arrayContaining(reference.tags));
  });

  test('busca posts por una palabra del body', async ({ posts }) => {
    const term = reference.body
      .toLowerCase()
      .split(/[^a-z]+/)
      .reduce((longest, word) => (word.length > longest.length ? word : longest), '');

    const response = await posts.search(term, { limit: 0 });
    const page = expectJson(response, 200, postsPageSchema);

    expect(page.posts.map((post) => post.id)).toContain(reference.id);

    for (const post of page.posts) {
      expect(post.body.toLowerCase()).toContain(term);
    }
  });

  test('combina el filtro por usuario con paginación y selección de campos', async ({ posts }) => {
    const response = await posts.byUser(reference.userId, { limit: 1, select: ['title'] });
    const page = expectJson(response, 200, partialPostsPageSchema);

    expect(page.posts).toHaveLength(1);
    expect(Object.keys(page.posts[0] ?? {}).sort()).toEqual(['id', 'title']);
  });
});
