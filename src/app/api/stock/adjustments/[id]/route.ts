import { handle, HttpError, requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/** Only manual adjustments can be removed; document rows follow their document. */
export async function DELETE(request: Request, { params }: Params) {
  return handle(async () => {
    const user = await requireApiUser(request);
    const { id } = await params;

    const movement = await prisma.stockMovement.findFirst({
      where: { id, userId: user.id },
      select: { id: true, source: true },
    });
    if (!movement) throw new HttpError(404, "Stock movement not found");
    if (movement.source !== "ADJUSTMENT") {
      throw new HttpError(
        400,
        "This movement belongs to an invoice or purchase bill. Edit that document instead.",
      );
    }

    await prisma.stockMovement.delete({ where: { id } });
    return { ok: true };
  });
}
