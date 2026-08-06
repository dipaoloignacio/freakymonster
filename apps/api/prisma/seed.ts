import 'dotenv/config';
import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { localCalendarTimeToUtc } from '../src/common/timezone';

// Ver convención de zona horaria del proyecto en src/common/timezone.ts.
// Todos los horarios de este seed ("14:00", etc.) son hora Mendoza, no UTC.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Las gift cards emitidas van antes que Appointment: la FK
  // redeemedByAppointmentId apunta ahí.
  await prisma.giftCard.deleteMany();
  await prisma.giftCardTier.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availabilityBlock.deleteMany();
  await prisma.weeklyAvailability.deleteMany();
  await prisma.artistService.deleteMany();
  await prisma.service.deleteMany();
  await prisma.artist.deleteMany();

  const renzo = await prisma.artist.create({
    data: {
      name: 'Renzo',
      bio: 'Especialista en blackwork y realismo.',
      specialties: ['blackwork', 'realismo'],
      imageUrl: '/artists/renzo.jpg',
    },
  });
  const cata = await prisma.artist.create({
    data: {
      name: 'Cata',
      bio: 'Old school y color.',
      specialties: ['old school', 'color'],
      imageUrl: '/artists/cata.jpg',
    },
  });

  const small = await prisma.service.create({
    data: { name: 'Tatuaje pequeño', durationMinutes: 60 },
  });
  const medium = await prisma.service.create({
    data: { name: 'Tatuaje mediano', durationMinutes: 120 },
  });
  const large = await prisma.service.create({
    data: {
      name: 'Tatuaje grande / sesión larga',
      durationMinutes: 240,
      requiresDeposit: true,
      depositAmount: 15000,
    },
  });

  // Renzo ofrece los 3 servicios. Cata NO ofrece el grande (caso de prueba: 400).
  await prisma.artistService.createMany({
    data: [
      { artistId: renzo.id, serviceId: small.id },
      { artistId: renzo.id, serviceId: medium.id },
      { artistId: renzo.id, serviceId: large.id },
      { artistId: cata.id, serviceId: small.id },
      { artistId: cata.id, serviceId: medium.id },
    ],
  });

  // Martes(2) a Sábado(6), 12:00-20:00, para ambos tatuadores.
  const workDays = [2, 3, 4, 5, 6];
  await prisma.weeklyAvailability.createMany({
    data: workDays.flatMap((dayOfWeek) => [
      { artistId: renzo.id, dayOfWeek, startTime: '12:00', endTime: '20:00' },
      { artistId: cata.id, dayOfWeek, startTime: '12:00', endTime: '20:00' },
    ]),
  });

  // Bloqueo de ejemplo: Renzo no atiende el 2026-08-13 (caso de prueba: array vacío).
  await prisma.availabilityBlock.create({
    data: {
      artistId: renzo.id,
      date: new Date('2026-08-13T00:00:00.000Z'),
      reason: 'Local cerrado por mantenimiento',
    },
  });

  // Turno ya reservado: Renzo, Tatuaje mediano, 2026-08-11 14:00-16:00 hora
  // Mendoza (= 17:00-19:00 UTC). Sirve para confirmar que el cálculo de
  // disponibilidad lo excluye.
  await prisma.appointment.create({
    data: {
      artistId: renzo.id,
      serviceId: medium.id,
      customerName: 'Juan Pérez',
      customerPhone: '+54 9 261 555-0000',
      startTime: localCalendarTimeToUtc('2026-08-11', '14:00'),
      endTime: localCalendarTimeToUtc('2026-08-11', '16:00'),
      status: AppointmentStatus.CONFIRMED,
    },
  });

  // Montos de gift card de arranque. Son editables desde el panel: esto es un
  // punto de partida para no dejar la pestaña vacía, no una lista fija.
  const giftCardTiers = await prisma.giftCardTier.createManyAndReturn({
    data: [
      { amount: 30000, label: 'Regalo chico' },
      { amount: 60000, label: 'Regalo mediano' },
      { amount: 120000, label: 'Regalo grande' },
    ],
  });

  console.log('Seed OK:', {
    renzoId: renzo.id,
    cataId: cata.id,
    smallServiceId: small.id,
    mediumServiceId: medium.id,
    largeServiceId: large.id,
    giftCardTierIds: giftCardTiers.map((tier) => tier.id),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
