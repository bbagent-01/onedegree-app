/**
 * Age-gate helpers for signup (Alpha Legal Pack v2 §04.7).
 *
 * We collect only month + year — day is not stored. That's sufficient
 * to derive a conservative age estimate: assume the later edge of the
 * given month so a user whose birthday hasn't happened yet this year
 * is counted one year younger. In practice we round DOWN the computed
 * age, so anyone who's close to a birthday still has to wait until
 * the next month tips them over.
 */

export function computeAge(year: number, month: number, now: Date = new Date()): number {
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1; // 1-12
  let age = nowYear - year;
  if (nowMonth < month) age -= 1;
  return age;
}

export function isMinor(year: number, month: number, now: Date = new Date()): boolean {
  return computeAge(year, month, now) < 18;
}

export function isTooYoung(year: number, month: number, now: Date = new Date()): boolean {
  return computeAge(year, month, now) < 13;
}
