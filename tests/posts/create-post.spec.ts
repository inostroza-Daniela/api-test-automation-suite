import { faker } from '@faker-js/faker';
import { expect, test } from '../../fixtures/api';
import { createdPostSchema, partialPostsPageSchema } from '../../schemas/post.schema';
import { partialUsersPageSchema } from '../../schemas/user.schema';
import { expectErrorResponse, expectJson } from '../../utils/assertions';
import { Tag } from '../../utils/tags';
import { buildPost, invalidAuthorCases } from '../../utils/test-data';

test.describe('POST /posts/add', { tag: Tag.Regression }, () => {
  let authorId: number;

  test.beforeAll(async ({ users }) => {
    const response = await users.list({
      limit: 1,
      skip: faker.number.int({ min: 0, max: 99 }),
      select: ['id'],
    });
    const [author] = expectJson(response, 200, partialUsersPageSchema).users;

    if (!author) {
      throw new Error('Se esperaba un usuario para usar como autor del post');
    }

    authorId = author.id;
  });

  test(
    'crea un post y devuelve todos los campos enviados',
    { tag: [Tag.Smoke, Tag.Critical] },
    async ({ posts }) => {
      const payload = buildPost(authorId);

      const response = await posts.create(payload);
      const created = expectJson(response, 201, createdPostSchema);

      expect(created).toMatchObject(payload);
    },
  );

  test('asigna el siguiente id correlativo al nuevo post', async ({ posts }) => {
    const listResponse = await posts.list({ limit: 1, select: ['id'] });
    const { total } = expectJson(listResponse, 200, partialPostsPageSchema);

    const response = await posts.create(buildPost(authorId));
    const created = expectJson(response, 201, createdPostSchema);

    expect(created.id).toBe(total + 1);
  });

  test('acepta un post solo con los campos obligatorios', async ({ posts }) => {
    const { title, body, userId } = buildPost(authorId);

    const response = await posts.create({ title, body, userId });
    const created = expectJson(response, 201, createdPostSchema);

    expect(created).toMatchObject({ title, body, userId });
  });

  for (const testCase of invalidAuthorCases) {
    test(`responde ${testCase.status} cuando ${testCase.name}`, async ({ posts }) => {
      const payload = { ...buildPost(authorId), userId: testCase.userId() };

      const response = await posts.create(payload);

      expectErrorResponse(response, testCase.status, testCase.message);
    });
  }
});
