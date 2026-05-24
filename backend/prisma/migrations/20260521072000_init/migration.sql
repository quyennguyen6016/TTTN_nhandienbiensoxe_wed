-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "RecognitionSource" AS ENUM ('IMAGE_UPLOAD', 'CAMERA_FRAME', 'CAMERA_STREAM');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "plate_number" TEXT NOT NULL,
    "owner_id" INTEGER,
    "vehicle_type" TEXT,
    "brand" TEXT,
    "color" TEXT,
    "province" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cameras" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "source_url" TEXT,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cameras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recognition_logs" (
    "id" SERIAL NOT NULL,
    "plate_number" TEXT NOT NULL,
    "vehicle_id" INTEGER,
    "camera_id" INTEGER,
    "source" "RecognitionSource" NOT NULL DEFAULT 'IMAGE_UPLOAD',
    "province_code" TEXT,
    "province" TEXT,
    "owner_name_snapshot" TEXT,
    "confidence" DOUBLE PRECISION,
    "bbox" JSONB,
    "image_path" TEXT,
    "annotated_image_path" TEXT,
    "raw_result" JSONB,
    "recognized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recognition_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "vehicles"("plate_number");

-- CreateIndex
CREATE INDEX "vehicles_plate_number_idx" ON "vehicles"("plate_number");

-- CreateIndex
CREATE INDEX "recognition_logs_plate_number_idx" ON "recognition_logs"("plate_number");

-- CreateIndex
CREATE INDEX "recognition_logs_recognized_at_idx" ON "recognition_logs"("recognized_at");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recognition_logs" ADD CONSTRAINT "recognition_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recognition_logs" ADD CONSTRAINT "recognition_logs_camera_id_fkey" FOREIGN KEY ("camera_id") REFERENCES "cameras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
