-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "departments" TEXT[] DEFAULT ARRAY[]::TEXT[];
