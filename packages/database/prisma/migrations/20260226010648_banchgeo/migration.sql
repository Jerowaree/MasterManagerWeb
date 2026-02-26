-- Guarded migration: this file was generated out of order in history.
-- Execute statements only if target tables/indexes already exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'ProductStock'
  ) THEN
    ALTER TABLE "ProductStock"
      ALTER COLUMN "id" DROP DEFAULT,
      ALTER COLUMN "quantity" DROP DEFAULT,
      ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'SaleItem'
  ) THEN
    ALTER TABLE "SaleItem"
      ALTER COLUMN "id" DROP DEFAULT;
  END IF;

  IF to_regclass('"InventoryMovement_companyId_branchId_type_deletedAt_productId_c"') IS NOT NULL THEN
    ALTER INDEX "InventoryMovement_companyId_branchId_type_deletedAt_productId_c"
      RENAME TO "InventoryMovement_companyId_branchId_type_deletedAt_product_idx";
  END IF;

  IF to_regclass('"InventoryMovement_companyId_type_deletedAt_productId_createdAt_"') IS NOT NULL THEN
    ALTER INDEX "InventoryMovement_companyId_type_deletedAt_productId_createdAt_"
      RENAME TO "InventoryMovement_companyId_type_deletedAt_productId_create_idx";
  END IF;
END $$;
