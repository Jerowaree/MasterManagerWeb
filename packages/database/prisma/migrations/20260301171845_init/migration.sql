-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('active', 'inactive');

-- DropForeignKey
ALTER TABLE "Sale" DROP CONSTRAINT "Sale_companyId_customerId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_branchId_fkey";

-- AlterTable
ALTER TABLE "ProductStock" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "quantity" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SaleItem" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "address" TEXT,
ADD COLUMN     "appliesDetraction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankAccountType" TEXT,
ADD COLUMN     "bankCci" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "creditDays" INTEGER,
ADD COLUMN     "currency" TEXT DEFAULT 'PEN',
ADD COLUMN     "department" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "isRetentionAgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentCondition" TEXT DEFAULT 'cash',
ADD COLUMN     "province" TEXT,
ADD COLUMN     "status" "SupplierStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "taxRegime" TEXT,
ADD COLUMN     "tradeName" TEXT,
ALTER COLUMN "ruc" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashMovement_companyId_idx" ON "CashMovement"("companyId");

-- CreateIndex
CREATE INDEX "CashMovement_branchId_idx" ON "CashMovement"("branchId");

-- CreateIndex
CREATE INDEX "CashMovement_createdAt_idx" ON "CashMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_companyId_id_key" ON "CashMovement"("companyId", "id");

-- CreateIndex
CREATE INDEX "Supplier_documentType_documentNumber_idx" ON "Supplier"("documentType", "documentNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_branchId_fkey" FOREIGN KEY ("companyId", "branchId") REFERENCES "Branch"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_companyId_customerId_fkey" FOREIGN KEY ("companyId", "customerId") REFERENCES "Customer"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_companyId_branchId_fkey" FOREIGN KEY ("companyId", "branchId") REFERENCES "Branch"("companyId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "InventoryMovement_companyId_branchId_type_deletedAt_productId_c" RENAME TO "InventoryMovement_companyId_branchId_type_deletedAt_product_idx";

-- RenameIndex
ALTER INDEX "InventoryMovement_companyId_type_deletedAt_productId_createdAt_" RENAME TO "InventoryMovement_companyId_type_deletedAt_productId_create_idx";
