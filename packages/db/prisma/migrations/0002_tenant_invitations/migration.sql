-- Create tenant invitations table
CREATE TABLE "TenantInvitation" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "invitedById" UUID,
  "role" "UserRole" NOT NULL DEFAULT 'TENANT',
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "acceptedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "TenantInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "TenantInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "TenantInvitation_token_key" ON "TenantInvitation" ("token");
CREATE UNIQUE INDEX "TenantInvitation_tenantId_email_key" ON "TenantInvitation" ("tenantId", "email");
