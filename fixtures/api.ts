import { faker } from '@faker-js/faker';
import { test as base, type APIRequestContext } from '@playwright/test';
import { credentialsPageSchema, loginResponseSchema } from '../schemas/auth.schema';
import { AuthService, type Credentials } from '../services/auth.service';
import { PostsService } from '../services/posts.service';
import { UsersService } from '../services/users.service';
import { ApiClient } from '../utils/api-client';
import { expectJson } from '../utils/assertions';
import { redact } from '../utils/redact';

export interface Session {
  userId: number;
  username: string;
  accessToken: string;
  refreshToken: string;
}

interface TestFixtures {
  fakerSeed: number;
  api: ApiClient;
  users: UsersService;
  posts: PostsService;
  auth: AuthService;
}

interface WorkerFixtures {
  credentials: Credentials;
  session: Session;
}

async function withWorkerClient<T>(
  context: APIRequestContext,
  action: (client: ApiClient) => Promise<T>,
): Promise<T> {
  try {
    return await action(new ApiClient(context));
  } finally {
    await context.dispose();
  }
}

function resolveFakerSeed(): number {
  const configured = Number(process.env.FAKER_SEED);
  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : Math.floor(Math.random() * 1_000_000_000) + 1;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  fakerSeed: [
    async ({}, use, testInfo) => {
      const seed = resolveFakerSeed();
      faker.seed(seed);
      testInfo.annotations.push({ type: 'semilla-faker', description: String(seed) });
      await use(seed);
    },
    { auto: true },
  ],

  api: async ({ request }, use, testInfo) => {
    const client = new ApiClient(request);

    await use(client);

    if (testInfo.status !== testInfo.expectedStatus && client.history.length > 0) {
      await testInfo.attach('api-exchanges.json', {
        body: JSON.stringify(redact(client.history), null, 2),
        contentType: 'application/json',
      });
    }
  },

  users: async ({ api }, use) => {
    await use(new UsersService(api));
  },

  posts: async ({ api }, use) => {
    await use(new PostsService(api));
  },

  auth: async ({ api }, use) => {
    await use(new AuthService(api));
  },

  credentials: [
    async ({ playwright }, use, workerInfo) => {
      const { TEST_USERNAME, TEST_PASSWORD } = process.env;

      if (TEST_USERNAME && TEST_PASSWORD) {
        await use({ username: TEST_USERNAME, password: TEST_PASSWORD });
        return;
      }

      const context = await playwright.request.newContext(workerInfo.project.use);
      const credentials = await withWorkerClient(context, async (client) => {
        const response = await new UsersService(client).list({
          limit: 1,
          select: ['username', 'password'],
        });
        const user = expectJson(response, 200, credentialsPageSchema).users.at(0);

        if (!user) {
          throw new Error('La API no devolvió usuarios para obtener las credenciales de prueba');
        }

        return { username: user.username, password: user.password };
      });

      await use(credentials);
    },
    { scope: 'worker' },
  ],

  session: [
    async ({ playwright, credentials }, use, workerInfo) => {
      const context = await playwright.request.newContext(workerInfo.project.use);
      const session = await withWorkerClient(context, async (client) => {
        const response = await new AuthService(client).login(credentials);
        const login = expectJson(response, 200, loginResponseSchema);
        return {
          userId: login.id,
          username: login.username,
          accessToken: login.accessToken,
          refreshToken: login.refreshToken,
        };
      });

      await use(session);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
