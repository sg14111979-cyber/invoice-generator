import { prisma } from "@/lib/db";
import { round2 } from "@/lib/calc";

export interface DashboardStats {
  total: number;
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
}

const OPEN_STATUSES = ["SENT", "PARTIALLY_PAID", "OVERDUE"];

/** Aggregates dashboard figures for one user, optionally narrowed to a brand. */
export async function getDashboardStats(
  userId: string,
  brandId?: string | null,
): Promise<DashboardStats> {
  const where = { userId, ...(brandId ? { brandId } : {}) };

  const [grouped, sums, overdue] = await Promise.all([
    prisma.invoice.groupBy({ by: ["status"], where, _count: { _all: true } }),
    prisma.invoice.aggregate({
      where: { ...where, status: { not: "CANCELLED" } },
      _sum: { total: true, amountPaid: true },
    }),
    prisma.invoice.count({
      where: { ...where, status: { in: OPEN_STATUSES }, dueDate: { lt: new Date() } },
    }),
  ]);

  const countFor = (status: string) =>
    grouped.find((row) => row.status === status)?._count._all ?? 0;

  const totalInvoiced = round2(sums._sum.total ?? 0);
  const totalPaid = round2(sums._sum.amountPaid ?? 0);

  return {
    total: grouped.reduce((sum, row) => sum + row._count._all, 0),
    draft: countFor("DRAFT"),
    sent: countFor("SENT"),
    paid: countFor("PAID"),
    overdue,
    totalInvoiced,
    totalPaid,
    outstanding: round2(totalInvoiced - totalPaid),
  };
}
