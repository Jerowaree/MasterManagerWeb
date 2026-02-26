-- Harden tenant isolation with composite references (companyId + id)

CREATE UNIQUE INDEX IF NOT EXISTS "Branch_companyId_id_key" ON "Branch"("companyId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "Customer_companyId_id_key" ON "Customer"("companyId", "id");

CREATE UNIQUE INDEX IF NOT EXISTS "User_companyId_id_key" ON "User"("companyId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_companyId_id_key" ON "Supplier"("companyId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "Sale_companyId_id_key" ON "Sale"("companyId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "SaleItem_companyId_id_key" ON "SaleItem"("companyId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "Purchase_companyId_id_key" ON "Purchase"("companyId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryMovement_companyId_id_key" ON "InventoryMovement"("companyId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductStock_companyId_id_key" ON "ProductStock"("companyId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_companyId_id_key" ON "Subscription"("companyId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentLog_companyId_id_key" ON "PaymentLog"("companyId", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_companyId_id_key" ON "AuditLog"("companyId", "id");

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_branchId_fkey";
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_branchId_fkey";
ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_branchId_fkey";
ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_customerId_fkey";
ALTER TABLE "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_branchId_fkey";
ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_branchId_fkey";
ALTER TABLE "ProductStock" DROP CONSTRAINT IF EXISTS "ProductStock_branchId_fkey";

ALTER TABLE "User"
ADD CONSTRAINT "User_companyId_branchId_fkey"
FOREIGN KEY ("companyId", "branchId")
REFERENCES "Branch"("companyId", "id")
ON DELETE SET NULL
ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_companyId_branchId_fkey"
FOREIGN KEY ("companyId", "branchId")
REFERENCES "Branch"("companyId", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_companyId_branchId_fkey"
FOREIGN KEY ("companyId", "branchId")
REFERENCES "Branch"("companyId", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "Sale"
ADD CONSTRAINT "Sale_companyId_customerId_fkey"
FOREIGN KEY ("companyId", "customerId")
REFERENCES "Customer"("companyId", "id")
ON DELETE SET NULL
ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "Purchase"
ADD CONSTRAINT "Purchase_companyId_branchId_fkey"
FOREIGN KEY ("companyId", "branchId")
REFERENCES "Branch"("companyId", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "InventoryMovement"
ADD CONSTRAINT "InventoryMovement_companyId_branchId_fkey"
FOREIGN KEY ("companyId", "branchId")
REFERENCES "Branch"("companyId", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE
NOT VALID;

ALTER TABLE "ProductStock"
ADD CONSTRAINT "ProductStock_companyId_branchId_fkey"
FOREIGN KEY ("companyId", "branchId")
REFERENCES "Branch"("companyId", "id")
ON DELETE RESTRICT
ON UPDATE CASCADE
NOT VALID;
