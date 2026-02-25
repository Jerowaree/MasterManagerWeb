ALTER TABLE "Sale"
ADD COLUMN "idempotencyHash" TEXT,
ADD COLUMN "idempotencyFirstSeenAt" TIMESTAMP(3),
ADD COLUMN "idempotencyLastSeenAt" TIMESTAMP(3),
ADD COLUMN "idempotencyReplayCount" INTEGER NOT NULL DEFAULT 0;
