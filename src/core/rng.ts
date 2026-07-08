/**
 * 결정적(seedable) 의사난수 생성기 (mulberry32).
 * 밸런스 시뮬레이션의 재현성과, 실제 플레이의 매 판 다른 배치를 동일한 인터페이스로 다룬다.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** [0, 1) 범위의 실수 */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min, max) 범위의 실수 */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** [min, max] 범위의 정수 */
  intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** 배열에서 하나를 균등 확률로 선택 */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** 가중치 배열 기반 선택. weights와 items는 같은 길이. */
  weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** true/false를 확률 p(0~1)로 반환 */
  chance(p: number): boolean {
    return this.next() < p;
  }
}
