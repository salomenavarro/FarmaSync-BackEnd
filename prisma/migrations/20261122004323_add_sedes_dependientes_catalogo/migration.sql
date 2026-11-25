-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_role_id_fkey";

-- DropIndex
DROP INDEX "idx_password_reset_token";

-- DropIndex
DROP INDEX "idx_user_sessions_token_hash";

-- DropIndex
DROP INDEX "idx_users_correo";

-- DropIndex
DROP INDEX "idx_users_documento";

-- AlterTable
ALTER TABLE "password_reset_tokens" ALTER COLUMN "token" SET DATA TYPE TEXT,
ALTER COLUMN "expira_en" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "creado_en" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "nombre" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "user_sessions" ALTER COLUMN "token_hash" SET DATA TYPE TEXT,
ALTER COLUMN "ip_address" SET DATA TYPE TEXT,
ALTER COLUMN "ultima_actividad" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "expira_en" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "creado_en" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "sede_id" INTEGER,
ALTER COLUMN "nombre_completo" SET DATA TYPE TEXT,
ALTER COLUMN "numero_documento" SET DATA TYPE TEXT,
ALTER COLUMN "correo" SET DATA TYPE TEXT,
ALTER COLUMN "telefono" SET DATA TYPE TEXT,
ALTER COLUMN "password_hash" SET DATA TYPE TEXT,
ALTER COLUMN "intentos_fallidos" SET DATA TYPE INTEGER,
ALTER COLUMN "bloqueado_hasta" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "creado_en" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "actualizado_en" DROP DEFAULT,
ALTER COLUMN "actualizado_en" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "sedes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "zona" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependientes" (
    "id" SERIAL NOT NULL,
    "titular_id" INTEGER NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "tipo_documento" TEXT NOT NULL,
    "numero_documento" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dependientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicamentos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre_generico" TEXT NOT NULL,
    "presentacion" TEXT NOT NULL,
    "concentracion" TEXT,
    "requiere_orden" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_sedes" (
    "id" SERIAL NOT NULL,
    "sede_id" INTEGER NOT NULL,
    "medicamento_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_stock" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "medicamento_id" INTEGER NOT NULL,
    "notificado" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dependientes_numero_documento_key" ON "dependientes"("numero_documento");

-- CreateIndex
CREATE UNIQUE INDEX "medicamentos_codigo_key" ON "medicamentos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_sedes_sede_id_medicamento_id_key" ON "inventario_sedes"("sede_id", "medicamento_id");

-- CreateIndex
CREATE UNIQUE INDEX "alertas_stock_user_id_medicamento_id_notificado_key" ON "alertas_stock"("user_id", "medicamento_id", "notificado");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependientes" ADD CONSTRAINT "dependientes_titular_id_fkey" FOREIGN KEY ("titular_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_sedes" ADD CONSTRAINT "inventario_sedes_sede_id_fkey" FOREIGN KEY ("sede_id") REFERENCES "sedes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_sedes" ADD CONSTRAINT "inventario_sedes_medicamento_id_fkey" FOREIGN KEY ("medicamento_id") REFERENCES "medicamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_stock" ADD CONSTRAINT "alertas_stock_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_stock" ADD CONSTRAINT "alertas_stock_medicamento_id_fkey" FOREIGN KEY ("medicamento_id") REFERENCES "medicamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
