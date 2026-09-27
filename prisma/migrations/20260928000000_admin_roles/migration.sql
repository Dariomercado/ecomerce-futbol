-- Preserve current operators explicitly; future memberships are least privileged.
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'EDITOR');
ALTER TABLE "AdminMembership" ADD COLUMN "role" "AdminRole";
UPDATE "AdminMembership" SET "role" = 'ADMIN';
ALTER TABLE "AdminMembership" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "AdminMembership" ALTER COLUMN "role" SET DEFAULT 'EDITOR';
