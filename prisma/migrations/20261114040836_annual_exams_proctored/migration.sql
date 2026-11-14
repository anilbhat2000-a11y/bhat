-- AlterTable
ALTER TABLE "assessments" ALTER COLUMN "proctor_max_violations" SET DEFAULT 5;

-- Company decision (2026-11-14): annual exams are proctored, and the 5th violation ends
-- the attempt.
UPDATE "assessments" SET "proctored" = true, "proctor_max_violations" = 5 WHERE "cadence" = 'ANNUAL';
