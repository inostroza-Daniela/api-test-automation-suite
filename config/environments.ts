export const environmentNames = ['production', 'local'] as const;

export type EnvironmentName = (typeof environmentNames)[number];

export interface Environment {
  name: EnvironmentName;
  baseURL: string;
}

const defaultBaseUrls: Record<EnvironmentName, string> = {
  production: 'https://dummyjson.com',
  local: 'http://localhost:8888',
};

const isEnvironmentName = (value: string): value is EnvironmentName =>
  (environmentNames as readonly string[]).includes(value);

export function resolveEnvironment(env: NodeJS.ProcessEnv = process.env): Environment {
  const name = env.TEST_ENV?.trim() || 'production';

  if (!isEnvironmentName(name)) {
    throw new Error(
      `TEST_ENV desconocido: "${name}". Valores permitidos: ${environmentNames.join(', ')}.`,
    );
  }

  const baseURL = env.BASE_URL?.trim() || defaultBaseUrls[name];

  if (!URL.canParse(baseURL)) {
    throw new Error(`BASE_URL "${baseURL}" no es una URL absoluta válida.`);
  }

  return { name, baseURL: baseURL.replace(/\/+$/, '') };
}
