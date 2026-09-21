type DatabaseEnvironment = {
  [key: string]: string | undefined;
  TEST_DATABASE_URL?: string;
  DATABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
};

export function resolveIsolatedTestDatabaseUrl(env: DatabaseEnvironment): string | undefined {
  const testDatabaseUrl = env.TEST_DATABASE_URL?.trim();
  if (!testDatabaseUrl) return undefined;

  const testTarget = parsePostgresTarget(testDatabaseUrl, "TEST_DATABASE_URL");
  if (!isExplicitTestTarget(testTarget)) {
    throw new Error(
      "UNSAFE_TEST_DATABASE_URL: use a dedicated database or schema whose name contains 'test'.",
    );
  }

  const productionDatabaseUrl = env.DATABASE_URL?.trim();
  if (productionDatabaseUrl) {
    const productionTarget = parsePostgresTarget(productionDatabaseUrl, "DATABASE_URL");
    if (sameApplicationTarget(testTarget, productionTarget)) {
      throw new Error(
        "UNSAFE_TEST_DATABASE_URL: TEST_DATABASE_URL resolves to the configured application database server.",
      );
    }
  }

  const productionProjectRef = supabaseProjectRefFromApiUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  if (productionProjectRef && productionProjectRef === testTarget.supabaseProjectRef) {
    throw new Error(
      "UNSAFE_TEST_DATABASE_URL: TEST_DATABASE_URL resolves to the configured production Supabase project.",
    );
  }

  return testDatabaseUrl;
}

export async function clearTrackedIdsAfterSuccessfulCleanup(
  trackedIds: Record<string, Set<string>>,
  cleanup: () => Promise<void>,
) {
  await cleanup();
  for (const ids of Object.values(trackedIds)) ids.clear();
}

type PostgresTarget = {
  hostname: string;
  port: string;
  database: string;
  schema: string;
  supabaseProjectRef?: string;
};

function parsePostgresTarget(value: string, variableName: string): PostgresTarget {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(`${variableName} must use the PostgreSQL protocol.`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!url.hostname || !database) {
    throw new Error(`${variableName} must include a hostname and database name.`);
  }

  return {
    hostname: normalizeHostname(url.hostname),
    port: url.port || "5432",
    database: database.toLowerCase(),
    schema: (url.searchParams.get("schema") ?? "public").toLowerCase(),
    supabaseProjectRef: supabaseProjectRef(url),
  };
}

function isExplicitTestTarget(target: PostgresTarget) {
  return hasTestMarker(target.database) || hasTestMarker(target.schema);
}

function hasTestMarker(value: string) {
  return /(^|[-_])tests?($|[-_])/.test(value);
}

function sameApplicationTarget(left: PostgresTarget, right: PostgresTarget) {
  if (left.supabaseProjectRef && right.supabaseProjectRef) {
    return left.supabaseProjectRef === right.supabaseProjectRef;
  }

  const sameDatabaseServer =
    left.hostname === right.hostname &&
    left.port === right.port &&
    left.database === right.database;
  if (!sameDatabaseServer) return false;

  const bothLocal = isLocalHostname(left.hostname) && isLocalHostname(right.hostname);
  return !bothLocal || left.schema === right.schema;
}

function supabaseProjectRef(url: URL) {
  const directMatch = normalizeHostname(url.hostname).match(/^db\.([^.]+)\.supabase\.co$/);
  if (directMatch) return directMatch[1];

  const username = decodeURIComponent(url.username).toLowerCase();
  const poolerMatch = username.match(/^postgres\.([a-z0-9-]+)$/);
  return poolerMatch?.[1];
}

function supabaseProjectRefFromApiUrl(value?: string) {
  if (!value?.trim()) return undefined;

  try {
    const hostname = normalizeHostname(new URL(value).hostname);
    return hostname.match(/^([^.]+)\.supabase\.co$/)?.[1];
  } catch {
    return undefined;
  }
}

function normalizeHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.+$/, "");
  if (["localhost", "127.0.0.1", "[::1]", "::1"].includes(normalized)) return "loopback";
  return normalized;
}

function isLocalHostname(hostname: string) {
  return hostname === "loopback";
}
