export type ValidationResult = {
  ok: boolean;
  message?: string;
};

export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false, message: 'Email is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  return { ok: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { ok: false, message: 'Password is required.' };
  if (password.length < 6) return { ok: false, message: 'Password must be at least 6 characters.' };
  return { ok: true };
}

export function validateDisplayName(displayName: string): ValidationResult {
  const trimmed = displayName.trim();
  if (trimmed.length < 2) return { ok: false, message: 'Display name must be at least 2 characters.' };
  if (trimmed.length > 50) return { ok: false, message: 'Display name must be 50 characters or less.' };
  return { ok: true };
}

export function validateBirthDate(value: string): ValidationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ok: false, message: 'Use YYYY-MM-DD format.' };
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return { ok: false, message: 'Enter a valid date.' };
  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const month = now.getUTCMonth() - date.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < date.getUTCDate())) age -= 1;
  if (age < 18) return { ok: false, message: 'You must be at least 18.' };
  if (age > 99) return { ok: false, message: 'Enter a realistic birth date.' };
  return { ok: true };
}

export function cleanText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
