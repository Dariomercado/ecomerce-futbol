import { describe, expect, it } from "vitest";

import {
  clearTrackedIdsAfterSuccessfulCleanup,
  resolveIsolatedTestDatabaseUrl,
} from "./database-target-safety";

describe("isolated PostgreSQL test target", () => {
  it("skips integration tests when TEST_DATABASE_URL is absent", () => {
    expect(resolveIsolatedTestDatabaseUrl({ DATABASE_URL: productionUrl })).toBeUndefined();
  });

  it("accepts an explicitly isolated local test database", () => {
    const testUrl = "postgresql://tester:secret@localhost:5432/ecomerce_futbol_test?schema=public";

    expect(
      resolveIsolatedTestDatabaseUrl({ TEST_DATABASE_URL: testUrl, DATABASE_URL: productionUrl }),
    ).toBe(testUrl);
  });

  it("rejects a target without a test database or schema marker", () => {
    expect(() =>
      resolveIsolatedTestDatabaseUrl({
        TEST_DATABASE_URL: "postgresql://tester:secret@localhost:5432/ecomerce_futbol?schema=public",
      }),
    ).toThrow("UNSAFE_TEST_DATABASE_URL");
  });

  it("rejects the configured application database even when the credentials differ", () => {
    expect(() =>
      resolveIsolatedTestDatabaseUrl({
        TEST_DATABASE_URL: "postgresql://test_user:test@db.example.com:5432/store_test",
        DATABASE_URL: "postgresql://app:prod@db.example.com:5432/store_test",
      }),
    ).toThrow("configured application database server");
  });

  it("allows a dedicated test schema on the configured local database", () => {
    const testUrl = "postgresql://test:test@localhost:5432/store?schema=integration_test";

    expect(
      resolveIsolatedTestDatabaseUrl({
        TEST_DATABASE_URL: testUrl,
        DATABASE_URL: "postgresql://app:prod@localhost:5432/store?schema=public",
      }),
    ).toBe(testUrl);
  });

  it("rejects the same local database and test schema", () => {
    expect(() =>
      resolveIsolatedTestDatabaseUrl({
        TEST_DATABASE_URL: "postgresql://test:test@localhost:5432/store?schema=integration_test",
        DATABASE_URL: "postgresql://app:prod@localhost:5432/store?schema=integration_test",
      }),
    ).toThrow("configured application database server");
  });

  it("rejects the same local database and schema across hostname and IPv4 aliases", () => {
    expect(() =>
      resolveIsolatedTestDatabaseUrl({
        TEST_DATABASE_URL:
          "postgresql://test:test@127.0.0.1:5432/store?schema=integration_test",
        DATABASE_URL:
          "postgresql://app:prod@localhost:5432/store?schema=integration_test",
      }),
    ).toThrow("configured application database server");
  });

  it("rejects the same local database and schema across IPv6 and hostname aliases", () => {
    expect(() =>
      resolveIsolatedTestDatabaseUrl({
        TEST_DATABASE_URL:
          "postgresql://test:test@[::1]:5432/store?schema=integration_test",
        DATABASE_URL:
          "postgresql://app:prod@localhost:5432/store?schema=integration_test",
      }),
    ).toThrow("configured application database server");
  });

  it("allows a distinct test schema across IPv6 and hostname aliases", () => {
    const testUrl = "postgresql://test:test@[::1]:5432/store?schema=integration_test";

    expect(
      resolveIsolatedTestDatabaseUrl({
        TEST_DATABASE_URL: testUrl,
        DATABASE_URL: "postgresql://app:prod@localhost:5432/store?schema=public",
      }),
    ).toBe(testUrl);
  });

  it("rejects the production Supabase project across direct and pooler endpoints", () => {
    expect(() =>
      resolveIsolatedTestDatabaseUrl({
        TEST_DATABASE_URL:
          "postgresql://postgres.productionref:test@aws-0-region.pooler.supabase.com:5432/postgres?schema=integration_test",
        DATABASE_URL:
          "postgresql://postgres:prod@db.productionref.supabase.co:5432/postgres?schema=public",
      }),
    ).toThrow("configured application database server");
  });

  it("rejects the production Supabase project identified by its public API URL", () => {
    expect(() =>
      resolveIsolatedTestDatabaseUrl({
        TEST_DATABASE_URL:
          "postgresql://postgres.productionref:test@aws-0-region.pooler.supabase.com:5432/postgres?schema=integration_test",
        NEXT_PUBLIC_SUPABASE_URL: "https://productionref.supabase.co",
      }),
    ).toThrow("configured production Supabase project");
  });

  it("normalizes terminal dots when comparing Supabase database hosts", () => {
    expect(() =>
      resolveIsolatedTestDatabaseUrl({
        TEST_DATABASE_URL:
          "postgresql://postgres:test@db.productionref.supabase.co.:5432/postgres?schema=integration_test",
        DATABASE_URL:
          "postgresql://postgres:prod@db.productionref.supabase.co:5432/postgres?schema=public",
      }),
    ).toThrow("configured application database server");
  });

  it("normalizes terminal dots when comparing the Supabase API project", () => {
    expect(() =>
      resolveIsolatedTestDatabaseUrl({
        TEST_DATABASE_URL:
          "postgresql://postgres:test@db.productionref.supabase.co.:5432/postgres?schema=integration_test",
        NEXT_PUBLIC_SUPABASE_URL: "https://productionref.supabase.co",
      }),
    ).toThrow("configured production Supabase project");
  });
});

describe("tracked PostgreSQL fixture cleanup", () => {
  it("retains IDs when cleanup fails so the failure remains retryable and visible", async () => {
    const tracked = { orderIds: new Set(["order-1"]), productIds: new Set(["product-1"]) };

    await expect(
      clearTrackedIdsAfterSuccessfulCleanup(tracked, async () => {
        throw new Error("cleanup failed");
      }),
    ).rejects.toThrow("cleanup failed");
    expect([...tracked.orderIds]).toEqual(["order-1"]);
    expect([...tracked.productIds]).toEqual(["product-1"]);
  });

  it("clears only explicitly tracked IDs after cleanup succeeds", async () => {
    const tracked = { orderIds: new Set(["order-1"]), productIds: new Set(["product-1"]) };

    await clearTrackedIdsAfterSuccessfulCleanup(tracked, async () => undefined);

    expect(tracked.orderIds).toHaveLength(0);
    expect(tracked.productIds).toHaveLength(0);
  });
});

const productionUrl = "postgresql://app:prod@db.example.com:5432/ecomerce_futbol?schema=public";
