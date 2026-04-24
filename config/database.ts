import path from 'path';
import type { Core } from '@strapi/strapi';

const supportedClients = ['sqlite', 'postgres', 'mysql'] as const;
type SupportedClient = (typeof supportedClients)[number];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Database => {
  const rawClient = env('DATABASE_CLIENT', 'sqlite');
  const client = (supportedClients.includes(rawClient as SupportedClient) ? rawClient : 'sqlite') as SupportedClient;
  const sslEnabled = env.bool('DATABASE_SSL', false);
  const sslConfig = sslEnabled
    ? {
        key: env('DATABASE_SSL_KEY', undefined),
        cert: env('DATABASE_SSL_CERT', undefined),
        ca: env('DATABASE_SSL_CA', undefined),
        capath: env('DATABASE_SSL_CAPATH', undefined),
        cipher: env('DATABASE_SSL_CIPHER', undefined),
        rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
      }
    : undefined;

  const connections: Record<SupportedClient, Omit<Core.Config.Database['connection'], 'client' | 'acquireConnectionTimeout'>> = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: sslConfig,
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: sslConfig,
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  const selectedConnection = connections[client];

  return {
    connection: {
      client,
      ...selectedConnection,
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  } as Core.Config.Database;
};

export default config;
