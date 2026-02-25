ALTER TABLE "User"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "refreshTokenHash" TEXT;

ALTER TABLE "Sale"
ADD COLUMN "idempotencyKey" TEXT;

CREATE TABLE "SaleItem" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "saleId" UUID NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Sale_companyId_idempotencyKey_key" ON "Sale"("companyId", "idempotencyKey");
CREATE INDEX "SaleItem_companyId_idx" ON "SaleItem"("companyId");
CREATE INDEX "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX "SaleItem_productId_idx" ON "SaleItem"("productId");
CREATE INDEX "SaleItem_createdAt_idx" ON "SaleItem"("createdAt");

ALTER TABLE "SaleItem"
ADD CONSTRAINT "SaleItem_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SaleItem"
ADD CONSTRAINT "SaleItem_saleId_fkey"
FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
