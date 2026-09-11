import { Timestamp } from 'firebase/firestore';

/**
 * Formats a Firestore Timestamp into an Indonesian date string.
 * Example output: "12 Januari 2025"
 *
 * @param timestamp - A Firestore Timestamp, null, or undefined
 * @returns Formatted date string in Indonesian, or 'Tanggal tidak tersedia' if input is null/undefined
 */
export function formatDate(timestamp: Timestamp | null | undefined): string {
  if (timestamp == null) {
    return 'Tanggal tidak tersedia';
  }

  const date = timestamp.toDate();

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
