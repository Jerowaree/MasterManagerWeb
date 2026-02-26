-- CreateEnum
CREATE TYPE "ElectronicDocumentType" AS ENUM ('factura', 'boleta');

-- CreateEnum
CREATE TYPE "ElectronicDocumentStatus" AS ENUM ('pending', 'processing', 'accepted', 'rejected', 'error', 'not_applicable');

-- CreateTable
CREATE TABLE "ElectronicDocument" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "saleId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "countryCode" TEXT NOT NULL,
  "documentType" "ElectronicDocumentType" NOT NULL,
  "series" TEXT NOT NULL,
  "correlative" TEXT NOT NULL,
  "status" "ElectronicDocumentStatus" NOT NULL DEFAULT 'pending',
  "externalId" TEXT,
  "digestValue" TEXT,
  "cdrCode" TEXT,
  "cdrDescription" TEXT,
  "payload" JSONB,
  "response" JSONB,
  "issuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "ElectronicDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ElectronicDocument_companyId_id_key"
ON "ElectronicDocument"("companyId", "id");

CREATE UNIQUE INDEX "ElectronicDocument_companyId_saleId_documentType_key"
ON "ElectronicDocument"("companyId", "saleId", "documentType");

CREATE UNIQUE INDEX "ElectronicDocument_companyId_series_correlative_key"
ON "ElectronicDocument"("companyId", "series", "correlative");

CREATE INDEX "ElectronicDocument_companyId_idx"
ON "ElectronicDocument"("companyId");

CREATE INDEX "ElectronicDocument_status_createdAt_idx"
ON "ElectronicDocument"("status", "createdAt");

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_companyId_saleId_fkey"
FOREIGN KEY ("companyId", "saleId") REFERENCES "Sale"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ElectronicDocument"
ADD CONSTRAINT "ElectronicDocument_companyId_branchId_fkey"
FOREIGN KEY ("companyId", "branchId") REFERENCES "Branch"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
