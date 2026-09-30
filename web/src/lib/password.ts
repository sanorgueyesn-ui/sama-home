import "server-only";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

// A precomputed hash of a value nobody will ever type, used to keep the
// timing of a "user not found" response indistinguishable from a "wrong
// password" response (prevents username enumeration via timing).
const DUMMY_HASH = bcrypt.hashSync("sama-home-dummy-comparison", SALT_ROUNDS);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string | null,
): Promise<boolean> {
  return bcrypt.compare(plain, hash ?? DUMMY_HASH);
}
