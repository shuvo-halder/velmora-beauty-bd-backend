-- AlterTable
ALTER TABLE "ReturnItem" ADD COLUMN "warehouseId" TEXT;

-- CreateIndex
CREATE INDEX "ReturnItem_warehouseId_idx" ON "ReturnItem"("warehouseId");

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
