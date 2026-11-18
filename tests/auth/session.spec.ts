import { faker } from '@faker-js/faker';
import { expect, test } from '../../fixtures/api';
import { loginResponseSchema, tokenPairSchema } from '../../schemas/auth.schema';
import { storedUserSchema } from '../../schemas/user.schema';
import { expectErrorResponse, expectJson } from '../../utils/assertions';
import { withTamperedSignature } from '../../utils/jwt';
import { Tag } from '../../utils/tags';

test.describe('GET /auth/me', { tag: Tag.Regression }, () => {
  test(
    'devuelve el usuario autenticado con un bearer token válido',
    { tag: [Tag.Smoke, Tag.Critical] },
    async ({ auth, session }) => {
      const response = await auth.currentUser(session.accessToken);
      const user = expectJson(response, 200, storedUserSchema);

      expect(user).toMatchObject({ id: session.userId, username: session.username });
    },
  );

  test('autentica con la cookie de access token que deja el login', async ({
    auth,
    credentials,
  }) => {
    const loginResponse = await auth.login(credentials);
    const login = expectJson(loginResponse, 200, loginResponseSchema);

    const response = await auth.currentUser();
    const user = expectJson(response, 200, storedUserSchema);

    expect(user.id).toBe(login.id);
  });

  test('responde 401 si no se envía access token', { tag: Tag.Critical }, async ({ auth }) => {
    const response = await auth.currentUser();

    expectErrorResponse(response, 401, 'Access Token is required');
  });

  test('responde 401 con un access token malformado', { tag: Tag.Critical }, async ({ auth }) => {
    const response = await auth.currentUser(faker.string.alphanumeric(40));

    expectErrorResponse(response, 401, 'Invalid/Expired Token!');
  });

  test.fail(
    'responde 401 con un access token de firma alterada',
    {
      tag: [Tag.KnownDefect, Tag.Critical],
      annotation: {
        type: 'defecto',
        description: 'Un JWT bien formado con firma inválida devuelve 500 en vez de 401',
      },
    },
    async ({ auth, session }) => {
      const response = await auth.currentUser(withTamperedSignature(session.accessToken));

      expectErrorResponse(response, 401, /invalid/i);
    },
  );
});

test.describe('POST /auth/refresh', { tag: Tag.Regression }, () => {
  test(
    'canjea un refresh token por un par de tokens válidos',
    { tag: [Tag.Smoke, Tag.Critical] },
    async ({ auth, session }) => {
      const response = await auth.refresh({ refreshToken: session.refreshToken });
      const tokens = expectJson(response, 200, tokenPairSchema);

      const meResponse = await auth.currentUser(tokens.accessToken);
      const user = expectJson(meResponse, 200, storedUserSchema);

      expect(user.id).toBe(session.userId);
    },
  );

  test('responde 401 si no se envía refresh token', async ({ auth }) => {
    const response = await auth.refresh({});

    expectErrorResponse(response, 401, 'Refresh token required');
  });

  test('responde 403 con un refresh token inválido', async ({ auth }) => {
    const response = await auth.refresh({ refreshToken: faker.string.alphanumeric(64) });

    expectErrorResponse(response, 403, 'Invalid refresh token');
  });
});
