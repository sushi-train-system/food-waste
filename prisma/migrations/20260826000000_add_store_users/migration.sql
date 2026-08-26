-- CreateEnum
CREATE TYPE "StoreRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "authUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreUser" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "role" "StoreRole" NOT NULL DEFAULT 'STAFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_email_key" ON "AppUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_authUserId_key" ON "AppUser"("authUserId");

-- CreateIndex
CREATE INDEX "StoreUser_storeId_idx" ON "StoreUser"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreUser_userId_storeId_key" ON "StoreUser"("userId", "storeId");

-- AddForeignKey
ALTER TABLE "StoreUser" ADD CONSTRAINT "StoreUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreUser" ADD CONSTRAINT "StoreUser_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
