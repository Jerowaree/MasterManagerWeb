CREATE TABLE "Product" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "productId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "price" DECIMAL(12, 2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_companyId_id_key" ON "Product"("companyId", "id");
CREATE UNIQUE INDEX "Product_companyId_productId_key" ON "Product"("companyId", "productId");
CREATE INDEX "Product_companyId_idx" ON "Product"("companyId");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

ALTER TABLE "Product"
ADD CONSTRAINT "Product_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Product" (
  "id",
  "companyId",
  "productId",
  "name",
  "category",
  "price",
  "createdAt",
  "updatedAt"
)
SELECT
  (
    SUBSTRING(md5(ps."companyId"::text || ':' || ps."productId") FROM 1 FOR 8) || '-' ||
    SUBSTRING(md5(ps."companyId"::text || ':' || ps."productId") FROM 9 FOR 4) || '-' ||
    SUBSTRING(md5(ps."companyId"::text || ':' || ps."productId") FROM 13 FOR 4) || '-' ||
    SUBSTRING(md5(ps."companyId"::text || ':' || ps."productId") FROM 17 FOR 4) || '-' ||
    SUBSTRING(md5(ps."companyId"::text || ':' || ps."productId") FROM 21 FOR 12)
  )::UUID,
  ps."companyId",
  ps."productId",
  ps."productId",
  'Sin categoria',
  COALESCE(latest."unitCost", 0.01)::DECIMAL(12, 2),
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT "companyId", "productId"
  FROM "ProductStock"
) ps
LEFT JOIN LATERAL (
  SELECT "unitCost"
  FROM "InventoryMovement" im
  WHERE im."companyId" = ps."companyId"
    AND im."productId" = ps."productId"
    AND im."type" = 'in'
    AND im."deletedAt" IS NULL
  ORDER BY im."createdAt" DESC
  LIMIT 1
) latest ON TRUE
ON CONFLICT ("companyId", "productId") DO NOTHING;
