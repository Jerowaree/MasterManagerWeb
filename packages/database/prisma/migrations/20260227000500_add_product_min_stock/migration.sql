ALTER TABLE "Product"
ADD COLUMN "minStock" DECIMAL(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX "Product_minStock_idx" ON "Product"("minStock");
