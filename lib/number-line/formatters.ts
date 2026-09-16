/** Clamp integer ke rentang [min, max] */
export function clampInt(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Format bilangan bulat untuk tampilan input — negatif dengan tanda kurung */
export function formatIntInput(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/** Format bilangan bulat untuk display ResultPanel */
export function formatIntDisplay(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/** Warna CSS class berdasarkan tanda bilangan */
export function getNumberColorClass(n: number): 'text-intblue' | 'text-intpink' {
  return n >= 0 ? 'text-intblue' : 'text-intpink';
}
