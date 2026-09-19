-- Application-owned operator authorization and immutable operational audits.
CREATE TABLE "AdminMembership" (
  "id" UUID NOT NULL,
  "supabaseUserId" UUID NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AdminMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminMembership_supabaseUserId_key" ON "AdminMembership"("supabaseUserId");
CREATE INDEX "AdminMembership_isActive_idx" ON "AdminMembership"("isActive");

CREATE TABLE "AdminAuditEvent" (
  "id" UUID NOT NULL,
  "membershipId" UUID NOT NULL,
  "actorSupabaseUserId" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "context" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminAuditEvent_membershipId_fkey"
    FOREIGN KEY ("membershipId") REFERENCES "AdminMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AdminAuditEvent_actorSupabaseUserId_createdAt_idx"
  ON "AdminAuditEvent"("actorSupabaseUserId", "createdAt");
CREATE INDEX "AdminAuditEvent_entityType_entityId_createdAt_idx"
  ON "AdminAuditEvent"("entityType", "entityId", "createdAt");

-- These tables are application-private even when a Supabase project exposes
-- the public schema through the Data API. No RLS policy is created.
ALTER TABLE "AdminMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditEvent" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "AdminMembership", "AdminAuditEvent" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "AdminMembership", "AdminAuditEvent" FROM authenticated;
  END IF;
END $$;

CREATE FUNCTION public.reject_admin_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Admin audit events are immutable';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_admin_audit_event_mutation() FROM PUBLIC;

CREATE TRIGGER "AdminAuditEvent_immutable"
BEFORE UPDATE OR DELETE ON "AdminAuditEvent"
FOR EACH ROW
EXECUTE FUNCTION public.reject_admin_audit_event_mutation();
