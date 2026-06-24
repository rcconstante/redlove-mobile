export function formatAge(age?: number | null): string {
  return typeof age === 'number' ? `${age}` : '';
}

export function formatHeight(heightCm?: number | null): string {
  if (!heightCm) return 'Not set';
  const inches = Math.round(heightCm / 2.54);
  const feet = Math.floor(inches / 12);
  const rest = inches % 12;
  return `${heightCm} cm (${feet}'${rest}")`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value?: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}
