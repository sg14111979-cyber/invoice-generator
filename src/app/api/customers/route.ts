import { handle, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { customerSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";

    return prisma.customer.findMany({
      where: {
        userId: user.id,
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { companyName: { contains: query } },
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
    const data = customerSchema.parse(await request.json());
    return prisma.customer.create({ data: { ...data, userId: user.id } });
  });
}
