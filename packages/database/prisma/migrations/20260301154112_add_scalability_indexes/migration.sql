-- AlterTable
ALTER TABLE "ProductStock" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "quantity" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SaleItem" ALTER COLUMN "id" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "InventoryMovement_companyId_type_deletedAt_productId_create_idx" ON "InventoryMovement"("companyId", "type", "deletedAt", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_companyId_branchId_type_deletedAt_product_idx" ON "InventoryMovement"("companyId", "branchId", "type", "deletedAt", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_companyId_status_deletedAt_createdAt_idx" ON "Sale"("companyId", "status", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_companyId_branchId_status_deletedAt_createdAt_idx" ON "Sale"("companyId", "branchId", "status", "deletedAt", "createdAt");
