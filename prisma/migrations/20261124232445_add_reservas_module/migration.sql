-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('PENDIENTE', 'ENTREGADA', 'CANCELADA_USUARIO', 'EXPIRADA');

-- CreateTable
CREATE TABLE "reservas" (
    "id" SERIAL NOT NULL,
    "codigo_reserva" TEXT NOT NULL,
    "codigo_qr" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "dependiente_id" INTEGER,
    "sede_id" INTEGER NOT NULL,
    "medicamento_id" INTEGER NOT NULL,
    "numero_orden_medica" TEXT NOT NULL,
    "fecha_recogida" TIMESTAMP(3) NOT NULL,
    "fecha_limite" TIMESTAMP(3) NOT NULL,
    "prorroga_solicitada" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservas_codigo_reserva_key" ON "reservas"("codigo_reserva");

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_dependiente_id_fkey" FOREIGN KEY ("dependiente_id") REFERENCES "dependientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_medicamento_id_fkey" FOREIGN KEY ("medicamento_id") REFERENCES "medicamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
