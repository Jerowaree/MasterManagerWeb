CREATE TABLE "ProductStock" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "companyId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductStock_companyId_branchId_productId_key"
ON "ProductStock"("companyId", "branchId", "productId");

CREATE INDEX "ProductStock_companyId_idx" ON "ProductStock"("companyId");
CREATE INDEX "ProductStock_branchId_idx" ON "ProductStock"("branchId");
CREATE INDEX "ProductStock_productId_idx" ON "ProductStock"("productId");

ALTER TABLE "ProductStock"
ADD CONSTRAINT "ProductStock_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductStock"
ADD CONSTRAINT "ProductStock_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill stock snapshot from historical movements
INSERT INTO "ProductStock" ("companyId", "branchId", "productId", "quantity", "createdAt", "updatedAt")
SELECT
  im."companyId",
  im."branchId",
  im."productId",
  COALESCE(
    SUM(
      CASE
        WHEN im."type" = 'in' THEN im."quantity"
        WHEN im."type" = 'out' THEN -im."quantity"
        ELSE 0
      END
    ),
    0
  ) AS "quantity",
  NOW(),
  NOW()
FROM "InventoryMovement" im
WHERE im."deletedAt" IS NULL
GROUP BY im."companyId", im."branchId", im."productId"
ON CONFLICT ("companyId", "branchId", "productId") DO UPDATE
SET "quantity" = EXCLUDED."quantity",
    "updatedAt" = NOW();
