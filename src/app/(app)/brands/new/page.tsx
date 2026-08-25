import { requireUser } from "@/lib/auth";
import { BrandForm } from "../brand-form";

export const metadata = { title: "Add brand | Invoice Studio" };

export default async function NewBrandPage() {
  await requireUser("/brands/new");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add brand</h1>
        <p className="mt-1 text-sm text-slate-500">
          Save the brand first, then upload a logo and fine-tune its invoice settings.
        </p>
      </div>
      <BrandForm />
    </div>
  );
}
