import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  await prisma.businessSettings.deleteMany();
  await prisma.review.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.appointmentService.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.timeOff.deleteMany();
  await prisma.workingHour.deleteMany();
  await prisma.product.deleteMany();
  await prisma.service.deleteMany();
  await prisma.clientProfile.deleteMany();
  await prisma.barberProfile.deleteMany();
  await prisma.user.deleteMany();

  await prisma.businessSettings.create({
    data: {
      businessName: "Sharp Edge Barbershop",
      address: "123 Main St, Springfield",
      phone: "555-0100",
      email: "hello@sharpedge.example",
      openTime: "09:00",
      closeTime: "19:00",
      taxRate: 0.08,
      currency: "USD",
      timezone: "UTC",
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Alex Admin",
      email: "admin@barbershop.com",
      passwordHash,
      role: "ADMIN",
      phone: "555-0101",
    },
  });

  const barberUsers = await Promise.all(
    [
      { name: "Marco Diaz", email: "marco@barbershop.com", specialties: "Fades, Beard trims", commissionRate: 0.45 },
      { name: "Jamie Lee", email: "jamie@barbershop.com", specialties: "Classic cuts, Hot towel shaves", commissionRate: 0.4 },
      { name: "Sam Torres", email: "sam@barbershop.com", specialties: "Kids cuts, Coloring", commissionRate: 0.4 },
    ].map((b) =>
      prisma.user.create({
        data: {
          name: b.name,
          email: b.email,
          passwordHash,
          role: "BARBER",
          phone: "555-0102",
          barberProfile: {
            create: {
              bio: `${b.name} — professional barber specializing in ${b.specialties.toLowerCase()}.`,
              specialties: b.specialties,
              commissionRate: b.commissionRate,
              workingHours: {
                create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
                  dayOfWeek,
                  startTime: "09:00",
                  endTime: "18:00",
                  isOff: dayOfWeek === 0,
                })),
              },
            },
          },
        },
        include: { barberProfile: true },
      })
    )
  );

  const clients = await Promise.all(
    [
      { name: "Chris Client", email: "chris@example.com" },
      { name: "Pat Patron", email: "pat@example.com" },
      { name: "Riley Regular", email: "riley@example.com" },
    ].map((c) =>
      prisma.user.create({
        data: {
          name: c.name,
          email: c.email,
          passwordHash,
          role: "CLIENT",
          phone: "555-0199",
          clientProfile: { create: { loyaltyPoints: 20 } },
        },
      })
    )
  );

  const services = await Promise.all(
    [
      { name: "Classic Haircut", durationMinutes: 30, price: 30, category: "Hair" },
      { name: "Skin Fade", durationMinutes: 45, price: 40, category: "Hair" },
      { name: "Beard Trim", durationMinutes: 20, price: 15, category: "Beard" },
      { name: "Hot Towel Shave", durationMinutes: 30, price: 25, category: "Beard" },
      { name: "Haircut + Beard Combo", durationMinutes: 60, price: 50, category: "Combo" },
      { name: "Kids Haircut", durationMinutes: 25, price: 20, category: "Hair" },
      { name: "Hair Coloring", durationMinutes: 90, price: 70, category: "Color" },
    ].map((s) => prisma.service.create({ data: s }))
  );

  await Promise.all(
    [
      { name: "Premium Pomade", sku: "POM-001", price: 18, costPrice: 8, stockQuantity: 24, category: "Styling" },
      { name: "Beard Oil", sku: "BRD-002", price: 15, costPrice: 6, stockQuantity: 30, category: "Beard Care" },
      { name: "Shampoo", sku: "SHM-003", price: 12, costPrice: 5, stockQuantity: 40, category: "Hair Care" },
      { name: "Hair Clay", sku: "CLY-004", price: 16, costPrice: 7, stockQuantity: 3, reorderThreshold: 5, category: "Styling" },
      { name: "Aftershave", sku: "AFT-005", price: 14, costPrice: 6, stockQuantity: 2, reorderThreshold: 5, category: "Beard Care" },
    ].map((p) => prisma.product.create({ data: p }))
  );

  // A few sample appointments (today and upcoming)
  const marco = barberUsers[0].barberProfile!;
  const jamie = barberUsers[1].barberProfile!;
  const now = new Date();
  const inHours = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);

  await prisma.appointment.create({
    data: {
      clientId: clients[0].id,
      barberId: marco.id,
      startTime: inHours(2),
      endTime: inHours(2.5),
      status: "CONFIRMED",
      totalPrice: services[0].price,
      services: { create: [{ serviceId: services[0].id, priceSnapshot: services[0].price }] },
    },
  });

  await prisma.appointment.create({
    data: {
      clientId: clients[1].id,
      barberId: jamie.id,
      startTime: inHours(5),
      endTime: inHours(6),
      status: "PENDING",
      totalPrice: services[4].price,
      services: { create: [{ serviceId: services[4].id, priceSnapshot: services[4].price }] },
    },
  });

  const pastAppt = await prisma.appointment.create({
    data: {
      clientId: clients[2].id,
      barberId: marco.id,
      startTime: inHours(-48),
      endTime: inHours(-47.5),
      status: "COMPLETED",
      totalPrice: services[1].price,
      services: { create: [{ serviceId: services[1].id, priceSnapshot: services[1].price }] },
    },
  });

  await prisma.sale.create({
    data: {
      clientId: clients[2].id,
      barberId: marco.id,
      appointmentId: pastAppt.id,
      subtotal: services[1].price,
      taxAmount: services[1].price * 0.08,
      tipAmount: 5,
      total: services[1].price * 1.08 + 5,
      paymentMethod: "CARD",
      items: {
        create: [
          {
            type: "SERVICE",
            name: services[1].name,
            unitPrice: services[1].price,
            quantity: 1,
            lineTotal: services[1].price,
          },
        ],
      },
    },
  });

  console.log("Seed complete.");
  console.log("Login as admin@barbershop.com / password123 (also barber/client accounts, same password).");

  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
