# Backend FarmaSync

- Stack: Node.js, NestJS, PostgreSQL y Prisma.
- Arquitectura: monolito modular con Clean Architecture.
- El dominio no depende de NestJS, Prisma ni HTTP.
- Todo input HTTP debe validarse en el borde y toda escritura multi-paso debe ser transaccional.
- No implementar RF/HU funcionales hasta actualizar el contrato y la spec correspondiente.
