-- CreateTable
CREATE TABLE "ai_drafts" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "title" TEXT NOT NULL,
    "course_id" TEXT,
    "lesson_id" TEXT,
    "request" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "model" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "ai_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_drafts_created_at_idx" ON "ai_drafts"("created_at");
