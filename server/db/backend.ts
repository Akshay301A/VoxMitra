export type DatabaseBackend = 'json' | 'postgres';

export type DatabaseConfiguration =
  | { backend: 'json' }
  | { backend: 'postgres'; connectionString: string };

export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConfigurationError';
  }
}

export function readDatabaseConfiguration(
  env: Readonly<Record<string, string | undefined>> = process.env
): DatabaseConfiguration {
  const configuredBackend = env.VOXMITRA_DATABASE?.trim().toLowerCase() || 'json';

  if (configuredBackend === 'json') {
    return { backend: 'json' };
  }

  if (configuredBackend !== 'postgres') {
    throw new DatabaseConfigurationError(
      'VOXMITRA_DATABASE must be either "json" or "postgres".'
    );
  }

  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new DatabaseConfigurationError(
      'DATABASE_URL is required when VOXMITRA_DATABASE=postgres.'
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(connectionString);
  } catch {
    throw new DatabaseConfigurationError(
      'DATABASE_URL must be a valid PostgreSQL connection URL.'
    );
  }

  if (
    (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') ||
    !parsedUrl.hostname ||
    parsedUrl.pathname.length <= 1
  ) {
    throw new DatabaseConfigurationError(
      'DATABASE_URL must be a valid PostgreSQL connection URL.'
    );
  }

  return { backend: 'postgres', connectionString };
}
