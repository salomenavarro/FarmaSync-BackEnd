-- AlterTable: agregar columnas como opcionales primero para migrar datos existentes
ALTER TABLE "dependientes"
ADD COLUMN "nombres" TEXT,
ADD COLUMN "apellidos" TEXT,
ADD COLUMN "correo_electronico" TEXT,
ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

-- Migrar el dato existente de nombre_completo a nombres y apellidos
UPDATE "dependientes"
SET
  "nombres" = COALESCE(NULLIF(split_part(trim("nombre_completo"), ' ', 1), ''), 'Sin nombre'),
  "apellidos" = COALESCE(NULLIF(trim(substring(trim("nombre_completo") from length(split_part(trim("nombre_completo"), ' ', 1)) + 1)), ''), 'Sin apellido');

-- Hacer obligatorias nombres y apellidos y eliminar nombre_completo
ALTER TABLE "dependientes"
ALTER COLUMN "nombres" SET NOT NULL,
ALTER COLUMN "apellidos" SET NOT NULL,
DROP COLUMN "nombre_completo";