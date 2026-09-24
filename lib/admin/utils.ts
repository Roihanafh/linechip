/**
 * Pure utility functions for the Admin Dashboard.
 * All functions are side-effect free and safe to use in both server and client contexts.
 */

/**
 * Sanitizes a string by removing control characters and HTML tags, then trimming whitespace.
 * Safe to use on both client and server.
 * Requirements: 6.1
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<[^>]*>/g, '')          // Remove HTML tags
    .trim();
}

/** Input shape for admin-created user registration. */
export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  school: string;
}

/** Result of validating a CreateUserInput. */
export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof CreateUserInput, string>>;
}

/**
 * Validates input for admin-created user registration.
 * Pure function — no side effects, safe for both client and server use.
 * Requirements: 1.3, 2.2, 6.2, 6.3, 6.4
 */
export function validateCreateUserInput(input: CreateUserInput): ValidationResult {
  const errors: Partial<Record<keyof CreateUserInput, string>> = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = 'Alamat email tidak valid.';
  }
  if (input.password.length < 6 || input.password.length > 256) {
    errors.password = 'Password harus minimal 6 karakter.';
  }
  if (input.name.trim().length === 0 || input.name.trim().length > 100) {
    errors.name = 'Nama lengkap tidak boleh kosong dan maksimal 100 karakter.';
  }
  if (input.school.trim().length === 0 || input.school.trim().length > 100) {
    errors.school = 'Sekolah tidak boleh kosong dan maksimal 100 karakter.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Shape of a user row as returned by the admin users API. */
export interface AdminUserRow {
  uid: string;
  name: string;
  email: string;
  school: string;
  totalScore: number;
  disabled: boolean;
  createdAt: string; // ISO string
}

/**
 * Validates a Firebase UID string.
 * Valid if length is between 1 and 128 characters (inclusive).
 * Requirements: 6.3
 */
export function validateUid(uid: string): boolean {
  return uid.length >= 1 && uid.length <= 128;
}

/**
 * Filters users by a search query, case-insensitively matching name or email.
 * Returns all users if query.length < 2.
 * Requirements: 3.3, 3.4
 */
export function filterUsers(
  users: AdminUserRow[],
  query: string
): AdminUserRow[] {
  if (query.length < 2) {
    return users;
  }
  const q = query.toLowerCase();
  return users.filter(
    (user) =>
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
  );
}

/**
 * Splits an array of users into pages of at most pageSize entries each.
 * The last page may contain fewer entries.
 * Returns an empty array if users is empty.
 * Requirements: 3.2 (pagination invariant)
 */
export function paginateAll(
  users: AdminUserRow[],
  pageSize: number
): AdminUserRow[][] {
  if (users.length === 0 || pageSize <= 0) {
    return [];
  }
  const pages: AdminUserRow[][] = [];
  for (let i = 0; i < users.length; i += pageSize) {
    pages.push(users.slice(i, i + pageSize));
  }
  return pages;
}

/** Minimal shape required for top-N and reset operations. */
export interface UserScoreEntry {
  uid: string;
  totalScore: number;
}

/**
 * Selects the top N users by totalScore.
 * - Filters out users with totalScore <= 0.
 * - Sorts descending by totalScore.
 * - Returns at most n entries.
 * Requirements: 2.5, 2.6
 */
export function selectTopN(
  users: UserScoreEntry[],
  n: number
): UserScoreEntry[] {
  return users
    .filter((u) => u.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, n);
}

/**
 * Returns a new array where users whose uid is in selectedUids have totalScore set to 0.
 * Users not in selectedUids are returned with their original totalScore unchanged.
 * The original array is NOT mutated.
 * Requirements: 5.4
 */
export function applySelectedReset(
  users: UserScoreEntry[],
  selectedUids: Set<string>
): UserScoreEntry[] {
  return users.map((user) =>
    selectedUids.has(user.uid) ? { ...user, totalScore: 0 } : { ...user }
  );
}
