import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { getUserById } from "@/lib/users-data";
import { EditUserForm } from "./edit-user-form";

export default async function EditUserPage(props: PageProps<"/settings/users/[id]/edit">) {
  await requireAdmin();
  const { id } = await props.params;

  const user = await getUserById(id);
  if (!user) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-6 pb-10 md:max-w-none md:px-8 lg:px-10">
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
        <h1 className="text-xl font-extrabold text-fg">Modifier @{user.username}</h1>
      </div>

      <div className="lg:mx-auto lg:w-full lg:max-w-2xl">
        {user.role ? (
          <EditUserForm userId={user.id} defaultName={user.name} defaultRole={user.role} />
        ) : (
          <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm font-medium text-warning">
            Ce compte n&apos;a pas de rôle d&apos;établissement — la modification du rôle n&apos;est pas disponible
            ici.
          </p>
        )}
      </div>
    </div>
  );
}
