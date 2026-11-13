-- AlterEnum
ALTER TYPE "AttemptStatus" ADD VALUE 'AWAITING_GRADING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'FILL_BLANK';
ALTER TYPE "QuestionType" ADD VALUE 'MATCHING';
ALTER TYPE "QuestionType" ADD VALUE 'SHORT_ANSWER';

-- AlterTable
ALTER TABLE "assessment_attempts" ADD COLUMN     "graded_at" TIMESTAMP(3),
ADD COLUMN     "graded_by_id" TEXT,
ADD COLUMN     "manual_grades" JSONB,
ADD COLUMN     "proctor_events" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "reviewer_note" TEXT;

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "proctor_max_violations" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "proctored" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "scenario" TEXT;
