// Socle multi-espaces, lot C — action « changer d'espace » (src/app/actions/space.ts).
//
// Isolation : AUCUNE base, AUCUN réseau. `@/lib/prisma`, `@/lib/dal`, `next/navigation` et
// `next/cache` sont remplacés par des doublures qui enregistrent les appels : on prouve QUELLES
// écritures sont faites (et surtout lesquelles ne le sont PAS) selon l'identifiant candidat.
import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

type Membership = { establishment: { status: string } };

// Appartenances du compte de la session : espace "A" (actif), "S" (suspendu). "Z" n'existe pas.
const MEMBERSHIPS: Record<string, Membership> = {
  A: { establishment: { status: "ACTIVE" } },
  S: { establishment: { status: "SUSPENDED" } },
};

let session: { userId: string; sessionId: string | null } = { userId: "u1", sessionId: "sess-1" };
const lookups: Array<{ userId: string; establishmentId: string }> = [];
const writes: Array<{ where: unknown; data: unknown }> = [];
const revalidated: string[] = [];

class NextRedirect extends Error {
  url: string;
  constructor(url: string) {
    super("NEXT_REDIRECT");
    this.url = url;
  }
}

const stubs: Record<string, unknown> = {
  "@/lib/prisma": {
    prisma: {
      membership: {
        findUnique: async ({ where }: { where: { userId_establishmentId: { userId: string; establishmentId: string } } }) => {
          lookups.push(where.userId_establishmentId);
          return MEMBERSHIPS[where.userId_establishmentId.establishmentId] ?? null;
        },
      },
      session: {
        updateMany: async (args: { where: unknown; data: unknown }) => {
          writes.push(args);
          return { count: 1 };
        },
      },
    },
  },
  "@/lib/dal": { verifySession: async () => session },
  "next/navigation": {
    redirect: (url: string) => {
      throw new NextRedirect(url);
    },
  },
  "next/cache": { revalidatePath: (path: string) => void revalidated.push(path) },
  "server-only": {},
};
type ModuleInternals = { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const originalLoad = moduleInternals._load;
moduleInternals._load = function (request: string, parent: unknown, isMain: boolean) {
  if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
  return originalLoad.call(this, request, parent, isMain);
};

const { switchSpace } = await import("../../app/actions/space");

function reset() {
  session = { userId: "u1", sessionId: "sess-1" };
  lookups.length = 0;
  writes.length = 0;
  revalidated.length = 0;
}

/** Exécute l'action et renvoie l'URL de redirection (l'action redirige toujours). */
async function run(entries: Record<string, string> | null): Promise<string> {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries ?? {})) form.set(key, value);
  try {
    await switchSpace(form);
  } catch (error) {
    if (error instanceof NextRedirect) return error.url;
    throw error;
  }
  throw new Error("l'action aurait dû rediriger");
}

test("espace dont le compte est membre et actif : écriture limitée à la session courante", async () => {
  reset();
  assert.equal(await run({ establishmentId: "A" }), "/dashboard");
  assert.deepEqual(lookups, [{ userId: "u1", establishmentId: "A" }]); // userId = celui de la SESSION
  assert.deepEqual(writes, [{ where: { id: "sess-1", userId: "u1" }, data: { activeEstablishmentId: "A" } }]);
  assert.deepEqual(revalidated, ["/"]);
});

test("identifiant forgé (aucune appartenance) : rien n'est écrit, même réponse", async () => {
  reset();
  assert.equal(await run({ establishmentId: "Z" }), "/dashboard");
  assert.equal(writes.length, 0);
});

test("espace non actif (suspendu) : refusé, rien n'est écrit", async () => {
  reset();
  assert.equal(await run({ establishmentId: "S" }), "/dashboard");
  assert.equal(writes.length, 0);
});

test("identifiant absent, vide ou non textuel : refusé avant tout accès à la base", async () => {
  reset();
  assert.equal(await run(null), "/dashboard");
  assert.equal(await run({ establishmentId: "" }), "/dashboard");
  assert.equal(lookups.length, 0);
  assert.equal(writes.length, 0);
});

test("session sans identifiant (contournement de développement) : rien n'est écrit", async () => {
  reset();
  session = { userId: "u1", sessionId: null };
  assert.equal(await run({ establishmentId: "A" }), "/dashboard");
  assert.equal(lookups.length, 0);
  assert.equal(writes.length, 0);
});

test("un userId ou un sessionId envoyé par le formulaire est ignoré", async () => {
  reset();
  await run({ establishmentId: "A", userId: "autre-compte", sessionId: "autre-session" });
  assert.deepEqual(lookups, [{ userId: "u1", establishmentId: "A" }]);
  assert.deepEqual(writes[0].where, { id: "sess-1", userId: "u1" });
});
