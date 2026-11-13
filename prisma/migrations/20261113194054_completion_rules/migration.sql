-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "min_video_watch_percent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "require_assessment_pass" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "lesson_progress" ADD COLUMN     "duration_seconds" INTEGER,
ADD COLUMN     "watched_seconds" INTEGER NOT NULL DEFAULT 0;
