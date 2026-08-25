import { handle, requireApiUser } from "@/lib/api";
import { destroyAllSessions } from "@/lib/auth";

/** Signs the account out of every device, including this one. */
export async function DELETE(request: Request) {
  return handle(async () => {
    const user = await requireApiUser(request);
    await destroyAllSessions(user.id);
    return { ok: true };
  });
}
