/**
 * 전력(파워) 숫자 표기 유틸.
 * 내부적으로는 double(number)로 저장한다. 2^53(약 9,007조) 이내에서는 정수 정밀도가 완전히 보장되고,
 * 그 이상은 표시/게임플레이 목적상 유효자릿수만 유지해도 충분하다.
 */

const SHORT_SUFFIXES = ['', 'K', 'M', 'B', 'T'];

/** T(1e12) 이후에는 aa, ab, ac ... az, ba, bb ... 식의 2글자 접미사로 확장한다 (AdVenture Capitalist류 관행). */
function twoLetterSuffix(index: number): string {
  // index 0 -> "aa", 1 -> "ab", ... 25 -> "az", 26 -> "ba" ...
  const first = Math.floor(index / 26);
  const second = index % 26;
  const a = 'a'.charCodeAt(0);
  return String.fromCharCode(a + (first % 26)) + String.fromCharCode(a + second);
}

/** 1e15 이상에서 몇 번째 2글자 접미사 구간인지, 그리고 그 구간의 배율(1e15 단위)을 계산한다. */
function extendedSuffixFor(magnitude: number): { suffix: string; power: number } {
  // magnitude: 10의 몇 제곱인지 (15, 18, 21, ...)
  const index = Math.floor((magnitude - 15) / 3);
  return { suffix: twoLetterSuffix(index), power: 15 + index * 3 };
}

/**
 * 숫자를 사람이 읽기 쉬운 축약 표기로 변환한다.
 * 예: 1234 -> "1.23K", 5_600_000_000 -> "5.6B", 3.4e21 -> "3.4ac"
 */
export function formatPower(value: number): string {
  const sign = value < 0 ? '-' : '';
  const v = Math.abs(value);

  if (v < 1000) {
    // 정수는 그대로, 소수는 소수점 둘째자리까지
    return sign + (Number.isInteger(v) ? String(v) : v.toFixed(1));
  }

  const magnitude = Math.floor(Math.log10(v));
  const tier = Math.floor(magnitude / 3);

  if (tier < SHORT_SUFFIXES.length) {
    const scaled = v / Math.pow(10, tier * 3);
    return sign + formatScaled(scaled) + SHORT_SUFFIXES[tier];
  }

  const { suffix, power } = extendedSuffixFor(magnitude);
  const scaled = v / Math.pow(10, power);
  return sign + formatScaled(scaled) + suffix;
}

function formatScaled(scaled: number): string {
  // 부동소수점 오차로 인해 999.999... 같은 값이 나오는 것을 방지
  const rounded = Math.round(scaled * 100) / 100;
  if (rounded >= 1000) return (rounded / 1000).toFixed(2);
  return rounded.toFixed(rounded < 10 ? 2 : 1);
}

/** 게이트 연산 표기용 (+N / -N / ×N / ÷N) */
export function formatDelta(value: number): string {
  const abs = formatPower(Math.abs(value));
  return value >= 0 ? `+${abs}` : `-${abs}`;
}

export function formatMultiplier(n: number): string {
  return `×${Number.isInteger(n) ? n : n.toFixed(1)}`;
}

export function formatDivisor(n: number): string {
  return `÷${Number.isInteger(n) ? n : n.toFixed(1)}`;
}

export function clampMin(value: number, min = 0): number {
  return value < min ? min : value;
}
