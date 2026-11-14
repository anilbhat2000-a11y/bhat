-- AlterEnum
ALTER TYPE "LessonType" ADD VALUE 'DOCUMENT';

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "conversion" TEXT,
ADD COLUMN     "source_file_key" TEXT,
ADD COLUMN     "source_file_name" TEXT;
