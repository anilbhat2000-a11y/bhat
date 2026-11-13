-- AlterTable
ALTER TABLE "lesson_progress" ADD COLUMN     "checked_item_ids" JSONB NOT NULL DEFAULT '[]';
