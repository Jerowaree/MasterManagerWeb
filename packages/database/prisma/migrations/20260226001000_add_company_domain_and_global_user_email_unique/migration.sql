-- Add configurable tenant email domain
ALTER TABLE "Company" ADD COLUMN "emailDomain" TEXT;

UPDATE "Company"
SET "emailDomain" = CASE
  WHEN length(regexp_replace(lower("name"), '[^a-z0-9]+', '', 'g')) > 0
    THEN regexp_replace(lower("name"), '[^a-z0-9]+', '', 'g') || '.com'
  ELSE 'empresa' || substr(replace("id"::text, '-', ''), 1, 8) || '.com'
END;

ALTER TABLE "Company" ALTER COLUMN "emailDomain" SET NOT NULL;

-- Ensure global uniqueness for login email
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
