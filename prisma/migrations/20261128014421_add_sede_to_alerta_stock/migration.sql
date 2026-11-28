/*
  Warnings:

  - A unique constraint covering the columns `[user_id,medicamento_id,sede_id,notificado]` on the table `alertas_stock` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "alertas_stock_user_id_medicamento_id_notificado_key";

-- AlterTable
ALTER TABLE "alertas_stock" ADD COLUMN     "sede_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "alertas_stock_user_id_medicamento_id_sede_id_notificado_key" ON "alertas_stock"("user_id", "medicamento_id", "sede_id", "notificado");

-- AddForeignKey
ALTER TABLE "alertas_stock" ADD CONSTRAINT "alertas_stock_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
