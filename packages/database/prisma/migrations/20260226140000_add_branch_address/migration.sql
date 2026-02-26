-- Add optional address to branches for map-based location capture
ALTER TABLE "Branch"
ADD COLUMN "address" TEXT;
