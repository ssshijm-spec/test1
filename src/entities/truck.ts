import { tierForPower, TierDef } from '../data/tiers';
import { BALANCE } from '../data/balance';

/** 플레이어 트럭. 전력(power)이 곧 이 엔티티의 유일한 "스탯"이며, 티어는 매 프레임 전력에서 파생된다. */
export class Truck {
  lane: number; // 화면상 부드러운 보간 위치 (0 ~ laneCount-1 실수)
  power: number;
  distance = 0; // 주행 거리(world unit) — 세그먼트 통과 판정에 사용

  /** 진화 연출 잔여 시간(ms). 0보다 크면 evolution.ts/render가 연출을 그린다. */
  evolveFxMs = 0;
  devolveFxMs = 0;
  hitFlashMs = 0;
  lastTierId: number;

  bobPhase = 0; // 아이들 바운스 애니메이션 위상

  constructor(startPower: number = BALANCE.startingPower) {
    this.power = startPower;
    this.lane = Math.floor(BALANCE.laneCount / 2);
    this.lastTierId = tierForPower(startPower).id;
  }

  get tier(): TierDef {
    return tierForPower(this.power);
  }

  update(dt: number, targetLane: number) {
    const diff = targetLane - this.lane;
    const step = BALANCE.laneLerpSpeed * (dt / 1000);
    if (Math.abs(diff) <= step) this.lane = targetLane;
    else this.lane += Math.sign(diff) * step;

    this.bobPhase += dt / 1000;
    if (this.evolveFxMs > 0) this.evolveFxMs = Math.max(0, this.evolveFxMs - dt);
    if (this.devolveFxMs > 0) this.devolveFxMs = Math.max(0, this.devolveFxMs - dt);
    if (this.hitFlashMs > 0) this.hitFlashMs = Math.max(0, this.hitFlashMs - dt);
  }

  isAlive(): boolean {
    return this.power >= BALANCE.minSurvivablePower;
  }
}
