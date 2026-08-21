import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateOrderNumber } from "../src/utils/orderNumber";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const staffPassword = await bcrypt.hash("Staff@123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@laundrybiz.com" },
    update: {},
    create: {
      name: "Amina Yusuf",
      email: "admin@laundrybiz.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@laundrybiz.com" },
    update: {},
    create: {
      name: "David Okoro",
      email: "staff@laundrybiz.com",
      passwordHash: staffPassword,
      role: "STAFF",
    },
  });

  const services = await Promise.all(
    [
      { name: "Wash & Fold", category: "WASH_FOLD", unit: "PER_KG", price: 3.5 },
      { name: "Dry Cleaning - Suit", category: "DRY_CLEAN", unit: "PER_ITEM", price: 12 },
      { name: "Dry Cleaning - Dress", category: "DRY_CLEAN", unit: "PER_ITEM", price: 10 },
      { name: "Ironing", category: "IRONING", unit: "PER_ITEM", price: 1.5 },
      { name: "Bedding & Linens", category: "BEDDING", unit: "PER_LOAD", price: 15 },
      { name: "Alteration - Hem", category: "ALTERATION", unit: "PER_ITEM", price: 8 },
    ].map((s) =>
      prisma.service.create({ data: s as any })
    )
  );

  const customers = await Promise.all(
    [
      { name: "Grace Adeyemi", phone: "+234-801-111-2222", email: "grace@example.com", address: "12 Palm St, Lagos" },
      { name: "Michael Chen", phone: "+1-415-555-0192", email: "michael@example.com", address: "500 Market St, SF" },
      { name: "Fatima Bello", phone: "+234-803-444-5566", email: "fatima@example.com", address: "9 Unity Rd, Abuja" },
    ].map((c) => prisma.customer.create({ data: c }))
  );

  const [washFold, suit, , ironing] = services;

  const order1 = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customers[0].id,
      createdById: staff.id,
      status: "IN_PROGRESS",
      items: {
        create: [
          { serviceId: washFold.id, quantity: 6, unitPrice: washFold.price, subtotal: 6 * washFold.price },
          { serviceId: ironing.id, quantity: 4, unitPrice: ironing.price, subtotal: 4 * ironing.price },
        ],
      },
    },
  });
  await prisma.payment.create({ data: { orderId: order1.id, amount: 10, method: "CASH", recordedById: staff.id } });
  await prisma.order.update({ where: { id: order1.id }, data: { paymentStatus: "PARTIAL" } });

  const order2 = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      customerId: customers[1].id,
      createdById: admin.id,
      status: "READY_FOR_PICKUP",
      items: { create: [{ serviceId: suit.id, quantity: 2, unitPrice: suit.price, subtotal: 2 * suit.price }] },
    },
  });
  await prisma.payment.create({ data: { orderId: order2.id, amount: 24, method: "CARD", recordedById: admin.id } });
  await prisma.order.update({ where: { id: order2.id }, data: { paymentStatus: "PAID" } });

  console.log("Seed complete.");
  console.log("  Admin login: admin@laundrybiz.com / Admin@123");
  console.log("  Staff login: staff@laundrybiz.com / Staff@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
