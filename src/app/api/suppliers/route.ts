import { handle, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { supplierSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

    return prisma.supplier.findMany({
      where: {
        userId: user.id,
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { companyName: { contains: query } },
                { taxNumber: { contains: query } },
                { email: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 200,
    });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const data = supplierSchema.parse(await request.json());
    return prisma.supplier.create({ data: { ...data, userId: user.id } });
  });
}
