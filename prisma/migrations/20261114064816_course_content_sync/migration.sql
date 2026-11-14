-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "content_hash" TEXT,
ADD COLUMN     "content_source" TEXT,
ADD COLUMN     "sources" JSONB NOT NULL DEFAULT '[]';

-- Courses created by the seed have no "course.create" audit event (admins' courses do).
-- Mark them as seed-managed unless an admin has since changed their lessons or modules.
UPDATE "courses" c SET "content_source" = 'seed'
WHERE NOT EXISTS (SELECT 1 FROM "audit_events" a WHERE a."action" = 'course.create' AND a."entity_id" = c."id")
  AND NOT EXISTS (
    SELECT 1 FROM "audit_events" a
    WHERE a."action" IN ('lesson.add', 'lesson.upload', 'lesson.reorder', 'lesson.delete', 'lesson.update', 'lesson.assign-modules', 'module.add', 'module.delete', 'caption.attach')
      AND (a."entity_id" = c."id" OR a."after"->>'courseId' = c."id" OR a."before"->>'courseId' = c."id")
  );
