import { handle } from "@/lib/api";
import { destroyCurrentSession } from "@/lib/auth";

export async function POST() {
  return handle(async () => {
    await destroyCurrentSession();
    return { ok: true };
  });
}
