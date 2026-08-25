import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { customerSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

async function ownedCustomer(id: string, userId: string) {
  const customer = await prisma.customer.findFirst({ where: { id, userId } });
  if (!customer) throw new HttpError(404, "Customer not found");
  return customer;
}

export async function GET(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    return ownedCustomer(id, user.id);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    await ownedCustomer(id, user.id);
    const data = customerSchema.parse(await request.json());
    return prisma.customer.update({ where: { id }, data });
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;
    await ownedCustomer(id, user.id);

    // Invoices keep their snapshotted customer details, so history survives.
    await prisma.customer.delete({ where: { id } });
    return { ok: true };
  });
}
