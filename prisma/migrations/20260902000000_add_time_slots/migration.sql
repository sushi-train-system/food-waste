-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "startHour" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeSlot_storeId_idx" ON "TimeSlot"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlot_storeId_startHour_key" ON "TimeSlot"("storeId", "startHour");

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default slots for existing stores.
INSERT INTO "TimeSlot" ("id", "storeId", "startHour", "sortOrder", "updatedAt")
SELECT
  'slot_' || substr(md5(random()::text || clock_timestamp()::text || s."id" || v."startHour"::text), 1, 24),
  s."id",
  v."startHour",
  v."sortOrder",
  CURRENT_TIMESTAMP
FROM "Store" s
CROSS JOIN (
  VALUES
    (14, 0),
    (16, 1),
    (18, 2),
    (20, 3),
    (22, 4)
) AS v("startHour", "sortOrder")
ON CONFLICT ("storeId", "startHour") DO NOTHING;
