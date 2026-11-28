import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de FarmaSync...');

  // 1. Crear los 3 Roles principales
  const rolePaciente = await prisma.role.upsert({
    where: { id: 1 },
    update: { name: 'PACIENTE' },
    create: { id: 1, name: 'PACIENTE' },
  });

  const roleFarmaceutico = await prisma.role.upsert({
    where: { id: 2 },
    update: { name: 'FARMACEUTICO' },
    create: { id: 2, name: 'FARMACEUTICO' },
  });

  const roleAdmin = await prisma.role.upsert({
    where: { id: 3 },
    update: { name: 'ADMINISTRADOR_EPS' },
    create: { id: 3, name: 'ADMINISTRADOR_EPS' },
  });

  console.log('Roles creados:', {
    paciente: rolePaciente.id,
    farmaceutico: roleFarmaceutico.id,
    admin: roleAdmin.id,
  });

  // 2. Crear Sedes de Farmacia (con coordenadas para cercanía y alternativas)
  const sedeNorte = await prisma.sede.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nombre: 'FarmaSync Sede Bello Centro',
      ciudad: 'Bello',
      zona: 'Centro',
      direccion: 'Calle 50 # 49-20, Bello, Antioquia',
      latitud: 6.3373,
      longitud: -75.5579,
    },
  });

  const sedeNiquia = await prisma.sede.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nombre: 'FarmaSync Sede Niquía',
      ciudad: 'Bello',
      zona: 'Norte',
      direccion: 'Diagonal 55 # 37-41, Bello, Antioquia',
      latitud: 6.3489,
      longitud: -75.5446,
    },
  });

  const sedeMedellin = await prisma.sede.upsert({
    where: { id: 3 },
    update: {},
    create: {
      nombre: 'FarmaSync Sede Medellín Poblado',
      ciudad: 'Medellín',
      zona: 'Sur',
      direccion: 'Carrera 43A # 11-50, Medellín, Antioquia',
      latitud: 6.2106,
      longitud: -75.5712,
    },
  });

  console.log('Sedes creadas:', [sedeNorte.nombre, sedeNiquia.nombre, sedeMedellin.nombre]);

  // 3. Crear Cuentas Iniciales (Administrador EPS y Farmacéutico de prueba)
  const passwordHash = await bcrypt.hash('Admin1234*', 10);

  const adminUser = await prisma.user.upsert({
    where: { numeroDocumento: '1000000001' },
    update: {},
    create: {
      nombreCompleto: 'Administrador General EPS',
      numeroDocumento: '1000000001',
      correo: 'admin@farmasync.com',
      telefono: '3001112233',
      passwordHash,
      roleId: roleAdmin.id,
      sedeId: null,
    },
  });

  const farmaceuticoUser = await prisma.user.upsert({
    where: { numeroDocumento: '1000000002' },
    update: {},
    create: {
      nombreCompleto: 'Carlos Farmacéutico Sede Bello',
      numeroDocumento: '1000000002',
      correo: 'farmaceutico.bello@farmasync.com',
      telefono: '3004445566',
      passwordHash,
      roleId: roleFarmaceutico.id,
      sedeId: sedeNorte.id,
    },
  });

  console.log('Usuarios empleados creados:', {
    admin: adminUser.numeroDocumento,
    farmaceutico: farmaceuticoUser.numeroDocumento,
  });

  // 4. Crear Medicamentos del Catálogo
  const acetaminofen = await prisma.medicamento.upsert({
    where: { codigo: 'MED-001' },
    update: {},
    create: {
      codigo: 'MED-001',
      nombreGenerico: 'Acetaminofén',
      presentacion: 'Tableta recubierta',
      concentracion: '500 mg',
      requiereOrden: false,
    },
  });

  const ibuprofeno = await prisma.medicamento.upsert({
    where: { codigo: 'MED-002' },
    update: {},
    create: {
      codigo: 'MED-002',
      nombreGenerico: 'Ibuprofeno',
      presentacion: 'Cápsula blanda',
      concentracion: '400 mg',
      requiereOrden: false,
    },
  });

  const amoxicilina = await prisma.medicamento.upsert({
    where: { codigo: 'MED-003' },
    update: {},
    create: {
      codigo: 'MED-003',
      nombreGenerico: 'Amoxicilina',
      presentacion: 'Cápsula',
      concentracion: '500 mg',
      requiereOrden: true,
    },
  });

  const losartan = await prisma.medicamento.upsert({
    where: { codigo: 'MED-004' },
    update: {},
    create: {
      codigo: 'MED-004',
      nombreGenerico: 'Losartán Potásico',
      presentacion: 'Tableta',
      concentracion: '50 mg',
      requiereOrden: true,
    },
  });

  // 5. Poblar InventarioSede cubriendo los 3 estados lógicos (>15 Verde, 1-15 Amarillo, 0 Rojo)
  const inventarios = [
    // Sede Bello Centro
    { sedeId: sedeNorte.id, medicamentoId: acetaminofen.id, cantidad: 50 }, // VERDE (>15)
    { sedeId: sedeNorte.id, medicamentoId: ibuprofeno.id, cantidad: 8 },    // AMARILLO (1-15)
    { sedeId: sedeNorte.id, medicamentoId: amoxicilina.id, cantidad: 0 },   // ROJO (0) -> sugerirá Niquía
    { sedeId: sedeNorte.id, medicamentoId: losartan.id, cantidad: 0 },      // ROJO (0) -> agotado en todas

    // Sede Niquía
    { sedeId: sedeNiquia.id, medicamentoId: acetaminofen.id, cantidad: 30 },
    { sedeId: sedeNiquia.id, medicamentoId: ibuprofeno.id, cantidad: 0 },
    { sedeId: sedeNiquia.id, medicamentoId: amoxicilina.id, cantidad: 25 }, // Disponible aquí como alternativa
    { sedeId: sedeNiquia.id, medicamentoId: losartan.id, cantidad: 0 },

    // Sede Medellín Poblado
    { sedeId: sedeMedellin.id, medicamentoId: acetaminofen.id, cantidad: 12 },
    { sedeId: sedeMedellin.id, medicamentoId: ibuprofeno.id, cantidad: 40 },
    { sedeId: sedeMedellin.id, medicamentoId: amoxicilina.id, cantidad: 5 },
    { sedeId: sedeMedellin.id, medicamentoId: losartan.id, cantidad: 0 },
  ];

  for (const item of inventarios) {
    await prisma.inventarioSede.upsert({
      where: {
        sedeId_medicamentoId: {
          sedeId: item.sedeId,
          medicamentoId: item.medicamentoId,
        },
      },
      update: { cantidad: item.cantidad },
      create: item,
    });
  }

  console.log('Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });