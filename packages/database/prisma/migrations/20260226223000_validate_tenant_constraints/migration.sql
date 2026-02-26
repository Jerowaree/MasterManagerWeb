ALTER TABLE "User" VALIDATE CONSTRAINT "User_companyId_branchId_fkey";
ALTER TABLE "Customer" VALIDATE CONSTRAINT "Customer_companyId_branchId_fkey";
ALTER TABLE "Sale" VALIDATE CONSTRAINT "Sale_companyId_branchId_fkey";
ALTER TABLE "Sale" VALIDATE CONSTRAINT "Sale_companyId_customerId_fkey";
ALTER TABLE "Purchase" VALIDATE CONSTRAINT "Purchase_companyId_branchId_fkey";
ALTER TABLE "InventoryMovement" VALIDATE CONSTRAINT "InventoryMovement_companyId_branchId_fkey";
ALTER TABLE "ProductStock" VALIDATE CONSTRAINT "ProductStock_companyId_branchId_fkey";
