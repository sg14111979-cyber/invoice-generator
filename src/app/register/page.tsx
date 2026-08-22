import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Create account | Invoice Studio" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            A starter brand is created for you so you can invoice immediately.
          </p>
          <RegisterForm />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered?{" "}
          <Link className="font-semibold text-navy-700 hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
