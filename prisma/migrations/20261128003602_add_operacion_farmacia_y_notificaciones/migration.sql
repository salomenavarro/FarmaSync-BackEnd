/*
  Warnings:

  - A unique constraint covering the columns `[codigo_ean]` on the table `medicamentos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('CONFIRMACION_RESERVA', 'MEDICAMENTO_LISTO', 'VENCIMIENTO_24H', 'VENCIMIENTO_2H', 'PRORROGA', 'EXPIRACION', 'REABASTECIMIENTO', 'RETRASO_ALISTAMIENTO', 'INCONSISTENCIA_LOTE', 'CANCELACION_FARMACIA');

-- CreateEnum
CREATE TYPE "CategoriaNotificacion" AS ENUM ('RESERVA', 'MEDICAMENTO', 'INCIDENCIA');

-- CreateEnum
CREATE TYPE "PrioridadNotificacion" AS ENUM ('INFORMATIVA', 'IMPORTANTE', 'URGENTE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoReserva" ADD VALUE 'LISTA_PARA_RETIRO';
ALTER TYPE "EstadoReserva" ADD VALUE 'RECHAZADA_FARMACIA';

-- AlterTable
ALTER TABLE "medicamentos" ADD COLUMN     "codigo_ean" TEXT;

-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "alerta_retraso_enviada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alistado_en" TIMESTAMP(3),
ADD COLUMN     "alistado_por_id" INTEGER,
ADD COLUMN     "entregado_en" TIMESTAMP(3),
ADD COLUMN     "entregado_por_id" INTEGER,
ADD COLUMN     "metodo_alistamiento" TEXT,
ADD COLUMN     "motivo_rechazo" TEXT,
ADD COLUMN     "recordatorio_24h_enviado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recordatorio_2h_enviado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "categoria" "CategoriaNotificacion" NOT NULL,
    "prioridad" "PrioridadNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha_lectura" TIMESTAMP(3),
    "reserva_id" INTEGER,
    "codigo_reserva" TEXT,
    "medicamento_id" INTEGER,
    "medicamento_nombre" TEXT,
    "medicamento_codigo" TEXT,
    "sede_id" INTEGER,
    "sede_nombre" TEXT,
    "fecha_vencimiento" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificaciones_user_id_leida_idx" ON "notificaciones"("user_id", "leida");

-- CreateIndex
CREATE UNIQUE INDEX "medicamentos_codigo_ean_key" ON "medicamentos"("codigo_ean");

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_alistado_por_id_fkey" FOREIGN KEY ("alistado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_entregado_por_id_fkey" FOREIGN KEY ("entregado_por_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
