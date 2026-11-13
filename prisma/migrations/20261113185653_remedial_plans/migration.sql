-- CreateEnum
CREATE TYPE "RemedialStatus" AS ENUM ('OPEN', 'DONE');

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "retake_delay_hours" INTEGER NOT NULL DEFAULT 24;

-- CreateTable
CREATE TABLE "remedial_plans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "course_id" TEXT,
    "attempt_id" TEXT NOT NULL,
    "retake_after" TIMESTAMP(3) NOT NULL,
    "status" "RemedialStatus" NOT NULL DEFAULT 'OPEN',
    "manager_comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "remedial_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "remedial_plans_user_id_status_idx" ON "remedial_plans"("user_id", "status");

-- AddForeignKey
ALTER TABLE "remedial_plans" ADD CONSTRAINT "remedial_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remedial_plans" ADD CONSTRAINT "remedial_plans_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
