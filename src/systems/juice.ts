import { EffectPool } from '../entities/particle';

/**
 * 화면 흔들림, 슬로우모, 히트스톱, 파티클/팝업을 한데 묶어 관리하는 "손맛" 시스템.
 * engine의 매 프레임 step()에서 실제 게임 로직에 적용할 dt를 계산해준다.
 */
export class JuiceSystem {
  readonly effects = new EffectPool();

  private shakeMag = 0;
  shakeX = 0;
  shakeY = 0;

  private slowMoTimer = 0;
  private slowMoScale = 1;

  private hitStopTimer = 0;

  shake(amount: number) {
    this.shakeMag = Math.max(this.shakeMag, amount);
  }

  triggerSlowMo(scale: number, durationMs: number) {
    this.slowMoTimer = Math.max(this.slowMoTimer, durationMs);
    this.slowMoScale = scale;
  }

  triggerHitStop(ms: number) {
    this.hitStopTimer = Math.max(this.hitStopTimer, ms);
  }

  isFrozen(): boolean {
    return this.hitStopTimer > 0;
  }

  /** 실제(unscaled) dt를 받아 내부 타이머들을 갱신하고, 게임 로직에 적용할 dt를 반환한다. */
  step(realDt: number): number {
    this.updateShakeOffset(realDt);

    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - realDt);
      this.effects.update(realDt * 0.2); // 히트스톱 중에도 파티클은 살짝은 움직이게 해 완전정지처럼 안 보이게
      return 0;
    }

    let dt = realDt;
    if (this.slowMoTimer > 0) {
      this.slowMoTimer = Math.max(0, this.slowMoTimer - realDt);
      dt = realDt * this.slowMoScale;
    }

    this.effects.update(dt);
    return dt;
  }

  private updateShakeOffset(realDt: number) {
    this.shakeMag *= Math.pow(0.0025, realDt / 1000);
    if (this.shakeMag < 0.08) this.shakeMag = 0;
    if (this.shakeMag > 0) {
      this.shakeX = (Math.random() * 2 - 1) * this.shakeMag;
      this.shakeY = (Math.random() * 2 - 1) * this.shakeMag;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  reset() {
    this.shakeMag = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.slowMoTimer = 0;
    this.slowMoScale = 1;
    this.hitStopTimer = 0;
    this.effects.clear();
  }
}
