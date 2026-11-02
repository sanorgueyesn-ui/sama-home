import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { getUserById } from "@/lib/users-data";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage(props: PageProps<"/settings/users/[id]/reset-password">) {
  await requireAdmin();
  const { id } = await props.params;

  const user = await getUserById(id);
  if (!user) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
      <div className="mb-5 flex items-center gap-3 lg:mx-auto lg:w-full lg:max-w-2xl">
        <Link
          href="/settings/users"
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-fg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 8 12l7 7" />
          </svg>
        </Link>
        <h1 className="text-xl font-extrabold text-fg">Réinitialiser — @{user.username}</h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        <ResetPasswordForm userId={user.id} />
      </div>
    </div>
  );
}
