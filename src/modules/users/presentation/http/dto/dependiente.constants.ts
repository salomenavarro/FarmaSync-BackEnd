// Fuente única de los valores permitidos en el backend. El front tiene
// su espejo en features/grupo-familiar/schemas/dependiente.constants.ts:
// si se agrega un valor aquí, hay que agregarlo allá también.
// En Clean Architecture, esta constante vive en la capa de presentación/HTTP
// para respaldar la validación del borde (DTOs) sin mezclar reglas de dominio.
export const TIPOS_DOCUMENTO = ['RC', 'TI', 'CC'] as const;

// Códigos estables: la API no depende de textos con tildes y barras
// ("Hijo / Hija"); esas etiquetas son responsabilidad del front.
export const PARENTESCOS = ['HIJO', 'PADRE_MADRE', 'ABUELO', 'OTRO'] as const;