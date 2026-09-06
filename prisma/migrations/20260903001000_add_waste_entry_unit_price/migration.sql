ALTER TABLE "WasteEntry" ADD COLUMN "unitPriceAud" DOUBLE PRECISION;

UPDATE "WasteEntry"
SET "unitPriceAud" = "MenuItem"."priceAud"
FROM "MenuItem"
WHERE "WasteEntry"."menuItemId" = "MenuItem"."id";

UPDATE "WasteEntry"
SET "unitPriceAud" = 0
WHERE "unitPriceAud" IS NULL;

ALTER TABLE "WasteEntry" ALTER COLUMN "unitPriceAud" SET NOT NULL;
