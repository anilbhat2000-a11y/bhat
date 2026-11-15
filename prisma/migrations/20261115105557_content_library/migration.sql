-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LessonType" ADD VALUE 'IMAGE';
ALTER TYPE "LessonType" ADD VALUE 'HTML';

-- CreateTable
CREATE TABLE "library_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kind" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "source_file_key" TEXT,
    "file_name" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL DEFAULT 0,
    "conversion" TEXT,
    "conversion_error" TEXT,
    "uploaded_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "library_items_kind_idx" ON "library_items"("kind");

-- CreateIndex
CREATE INDEX "library_items_created_at_idx" ON "library_items"("created_at");
