import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersManager } from "./users-manager";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { invoices: true, brands: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500">
          Administrators can add users and manage roles. Each user only ever sees their own brands,
          customers and invoices.
        </p>
      </div>

      <UsersManager
        currentUserId={admin.id}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          invoiceCount: user._count.invoices,
          brandCount: user._count.brands,
        }))}
      />
    </div>
  );
}
