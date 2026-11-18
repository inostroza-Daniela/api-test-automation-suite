import { faker } from '@faker-js/faker';
import { expect, test } from '../../fixtures/api';
import { jwtPayloadSchema, loginResponseSchema } from '../../schemas/auth.schema';
import {
  expectCookie,
  expectErrorResponse,
  expectJson,
  expectSchema,
} from '../../utils/assertions';
import { decodeJwtPayload } from '../../utils/jwt';
import { Tag } from '../../utils/tags';
import { invalidLoginCases } from '../../utils/test-data';

const MAX_TOKEN_LIFETIME_MINUTES = 30 * 24 * 60;

test.describe('POST /auth/login', { tag: Tag.Regression }, () => {
  test(
    'entrega un access token y un refresh token con credenciales válidas',
    { tag: [Tag.Smoke, Tag.Critical] },
    async ({ auth, credentials }) => {
      const response = await auth.login(credentials);
      const login = expectJson(response, 200, loginResponseSchema);

      expect(login.username.toLowerCase()).toBe(credentials.username.toLowerCase());
      expect(login.accessToken).not.toBe(login.refreshToken);
    },
  );

  test('guarda ambos tokens en cookies HttpOnly y Secure', async ({ auth, credentials }) => {
    const response = await auth.login(credentials);

    expectJson(response, 200, loginResponseSchema);
    expectCookie(response, 'accessToken', ['HttpOnly', 'Secure']);
    expectCookie(response, 'refreshToken', ['HttpOnly', 'Secure']);
  });

  test('firma un access token cuyos claims identifican al usuario', async ({
    auth,
    credentials,
  }) => {
    const response = await auth.login(credentials);
    const login = expectJson(response, 200, loginResponseSchema);

    const claims = expectSchema(decodeJwtPayload(login.accessToken), jwtPayloadSchema);

    expect(claims).toMatchObject({ id: login.id, username: login.username, email: login.email });
    expect(claims.exp * 1_000).toBeGreaterThan(Date.now());
  });

  test('respeta una duración personalizada del access token', async ({ auth, credentials }) => {
    const expiresInMins = faker.number.int({ min: 5, max: 180 });

    const response = await auth.login({ ...credentials, expiresInMins });
    const login = expectJson(response, 200, loginResponseSchema);
    const claims = expectSchema(decodeJwtPayload(login.accessToken), jwtPayloadSchema);

    expect(claims.exp - claims.iat).toBe(expiresInMins * 60);
  });

  test('no distingue mayúsculas de minúsculas en el username', async ({ auth, credentials }) => {
    const response = await auth.login({
      ...credentials,
      username: credentials.username.toUpperCase(),
    });
    const login = expectJson(response, 200, loginResponseSchema);

    expect(login.username.toLowerCase()).toBe(credentials.username.toLowerCase());
  });

  for (const testCase of invalidLoginCases) {
    test(
      `responde 400 cuando ${testCase.name}`,
      { tag: Tag.Critical },
      async ({ auth, credentials }) => {
        const response = await auth.login(testCase.payload(credentials));

        expectErrorResponse(response, 400, testCase.message);
      },
    );
  }

  test.fail(
    'responde 400 cuando la duración pedida del token supera el máximo',
    {
      tag: Tag.KnownDefect,
      annotation: {
        type: 'defecto',
        description:
          'Un expiresInMins fuera de rango devuelve 500 en vez de un error de validación 4xx',
      },
    },
    async ({ auth, credentials }) => {
      const response = await auth.login({
        ...credentials,
        expiresInMins: MAX_TOKEN_LIFETIME_MINUTES + 1,
      });

      expectErrorResponse(response, 400, /Maximum access token expire time/);
    },
  );
});
