CREATE TABLE "MenuItemPriceHistory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "priceAud" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemPriceHistory_pkey" PRIMARY KEY ("id")
);

INSERT INTO "MenuItemPriceHistory" (
    "id",
    "storeId",
    "menuItemId",
    "priceAud",
    "effectiveFrom"
)
SELECT
    'cmph_' || "id",
    "storeId",
    "id",
    "priceAud",
    '0001-01-01'
FROM "MenuItem"
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "MenuItemPriceHistory_menuItemId_effectiveFrom_key"
    ON "MenuItemPriceHistory"("menuItemId", "effectiveFrom");

CREATE INDEX "MenuItemPriceHistory_storeId_menuItemId_effectiveFrom_idx"
    ON "MenuItemPriceHistory"("storeId", "menuItemId", "effectiveFrom");

ALTER TABLE "MenuItemPriceHistory"
    ADD CONSTRAINT "MenuItemPriceHistory_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuItemPriceHistory"
    ADD CONSTRAINT "MenuItemPriceHistory_menuItemId_fkey"
    FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
