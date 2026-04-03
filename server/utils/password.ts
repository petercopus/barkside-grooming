import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// compare plaintext password vs stored hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function stripPassword<T extends { passwordHash: string | null }>(user: T) {
  const { passwordHash, ...safe } = user;
  return safe;
}
