CREATE INDEX "Sale_companyId_status_deletedAt_createdAt_idx"
ON "Sale"("companyId", "status", "deletedAt", "createdAt");

CREATE INDEX "Sale_companyId_branchId_status_deletedAt_createdAt_idx"
ON "Sale"("companyId", "branchId", "status", "deletedAt", "createdAt");

CREATE INDEX "InventoryMovement_companyId_type_deletedAt_productId_createdAt_idx"
ON "InventoryMovement"("companyId", "type", "deletedAt", "productId", "createdAt");

CREATE INDEX "InventoryMovement_companyId_branchId_type_deletedAt_productId_createdAt_idx"
ON "InventoryMovement"("companyId", "branchId", "type", "deletedAt", "productId", "createdAt");
