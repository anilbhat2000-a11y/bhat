-- CreateEnum
CREATE TYPE "TrainingGoal" AS ENUM ('SALES_ENABLEMENT', 'SOFT_SKILLS', 'CUSTOMER_ENABLEMENT', 'PROCESS_WORKFLOW', 'COMPLIANCE', 'ONBOARDING', 'TECHNICAL_SKILLS', 'LEADERSHIP');

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "goals" "TrainingGoal"[],
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "template_key" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_courses" (
    "id" TEXT NOT NULL,
    "path_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "learning_path_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_path_assignments" (
    "id" TEXT NOT NULL,
    "path_id" TEXT NOT NULL,
    "target_type" "AssignmentTarget" NOT NULL,
    "target_value" TEXT NOT NULL,
    "due_at" TIMESTAMP(3),
    "assigned_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_path_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_paths_template_key_key" ON "learning_paths"("template_key");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_courses_path_id_course_id_key" ON "learning_path_courses"("path_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_assignments_path_id_target_type_target_value_key" ON "learning_path_assignments"("path_id", "target_type", "target_value");

-- AddForeignKey
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_path_assignments" ADD CONSTRAINT "learning_path_assignments_path_id_fkey" FOREIGN KEY ("path_id") REFERENCES "learning_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE;
