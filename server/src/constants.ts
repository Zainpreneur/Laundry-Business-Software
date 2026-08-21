// Central definition of the enum-like string values stored in SQLite columns
// (see prisma/schema.prisma for why these aren't native Prisma enums).

export const ROLES = ["ADMIN", "MANAGER", "STAFF"] as const;
export const SERVICE_UNITS = ["PER_ITEM", "PER_KG", "PER_LOAD"] as const;
export const SERVICE_CATEGORIES = [
  "WASH_FOLD",
  "DRY_CLEAN",
  "IRONING",
  "ALTERATION",
  "BEDDING",
  "OTHER",
] as const;
export const ORDER_STATUSES = [
  "RECEIVED",
  "IN_PROGRESS",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
] as const;
export const PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID"] as const;
export const PAYMENT_METHODS = ["CASH", "CARD", "MOBILE_MONEY", "BANK_TRANSFER", "ONLINE"] as const;
