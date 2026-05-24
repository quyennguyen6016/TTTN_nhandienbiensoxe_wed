ALTER TABLE "vehicles"
ADD COLUMN "normalized_plate_number" TEXT;

UPDATE "vehicles"
SET "normalized_plate_number" = regexp_replace(upper("plate_number"), '[^A-Z0-9]', '', 'g')
WHERE "normalized_plate_number" IS NULL;

ALTER TABLE "vehicles"
ALTER COLUMN "normalized_plate_number" SET NOT NULL;

CREATE UNIQUE INDEX "vehicles_normalized_plate_number_key"
ON "vehicles"("normalized_plate_number");

CREATE INDEX "vehicles_normalized_plate_number_idx"
ON "vehicles"("normalized_plate_number");

ALTER TABLE "recognition_logs"
ADD COLUMN "normalized_plate_number" TEXT;

UPDATE "recognition_logs"
SET "normalized_plate_number" = regexp_replace(upper("plate_number"), '[^A-Z0-9]', '', 'g')
WHERE "normalized_plate_number" IS NULL;

ALTER TABLE "recognition_logs"
ALTER COLUMN "normalized_plate_number" SET NOT NULL;

CREATE INDEX "recognition_logs_normalized_plate_number_idx"
ON "recognition_logs"("normalized_plate_number");
