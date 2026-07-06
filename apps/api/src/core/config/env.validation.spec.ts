import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const baseEnv = {
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/app_db',
    JWT_SECRET: 'a-production-secret-that-is-long-enough',
  };

  it('requires WEB_URL in production for explicit CORS origin control', () => {
    expect(() =>
      validateEnv({
        ...baseEnv,
        NODE_ENV: 'production',
      }),
    ).toThrow('WEB_URL must be a full URL and is required in production');
  });

  it('accepts explicit production API docs opt-in flag', () => {
    const env = validateEnv({
      ...baseEnv,
      NODE_ENV: 'production',
      WEB_URL: 'https://app.example.com',
      API_DOCS_ENABLED: 'true',
      NESTLENS_ENABLED: 'false',
    });

    expect(env.API_DOCS_ENABLED).toBe('true');
    expect(env.NESTLENS_ENABLED).toBe('false');
  });
});
