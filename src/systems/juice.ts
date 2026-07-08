import { EffectPool } from '../entities/particle';

export interface JuiceBanner {
  text: string;
  color: string;
  /** 0(등장)~1(사라짐) 진행도 */
  age: number;
  duration: number;
}

/**
 * 화면 흔들림, 슬로우모, 히트스톱, 부스트, 플래시, 파티클/팝업/배너를 한데 묶어 관리하는 "손맛" 시스템.
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

  /** 스크롤 속도 배율(1=평상시). 게이트 통과 등 "이득" 이벤트에서 순간 가속했다가 감쇠. */
  private boost = 0; // 0~N 추가분. 실제 배율 = 1 + boost
  /** 부스트 세기에 비례해 속도선(스피드 라인)을 그리기 위한 강도(0~1). */
  speedLineIntensity = 0;

  /** 전체 화면 컬러 플래시 (큰 곱셈/잭팟 등). */
  private flashTimer = 0;
  private flashDuration = 0;
  private flashColorValue = '#ffffff';

  /** 화면 중앙 대형 배너 (×N 등). */
  banner: JuiceBanner | null = null;

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

  /** strength: 추가 속도 배율(예: 0.6 => 순간 1.6배). 여러 번 겹치면 누적된다(상한 있음). */
  addBoost(strength: number) {
    this.boost = Math.min(1.4, this.boost + strength);
  }

  /** 현재 스크롤 속도에 곱할 배율. */
  get boostMultiplier(): number {
    return 1 + this.boost;
  }

  flash(color: string, durationMs = 220) {
    this.flashColorValue = color;
    this.flashDuration = durationMs;
    this.flashTimer = durationMs;
  }

  showBanner(text: string, color: string, durationMs = 620) {
    this.banner = { text, color, age: 0, duration: durationMs };
  }

  /** 렌더러가 참조할 현재 플래시 알파(0=없음). */
  get flashAlpha(): number {
    if (this.flashTimer <= 0 || this.flashDuration <= 0) return 0;
    return (this.flashTimer / this.flashDuration) * 0.5;
  }

  get flashColor(): string {
    return this.flashColorValue;
  }

  isFrozen(): boolean {
    return this.hitStopTimer > 0;
  }

  /** 실제(unscaled) dt를 받아 내부 타이머들을 갱신하고, 게임 로직에 적용할 dt를 반환한다. */
  step(realDt: number): number {
    this.updateShakeOffset(realDt);
    this.updateBoost(realDt);
    if (this.flashTimer > 0) this.flashTimer = Math.max(0, this.flashTimer - realDt);
    if (this.banner) {
      this.banner.age += realDt;
      if (this.banner.age >= this.banner.duration) this.banner = null;
    }

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

  private updateBoost(realDt: number) {
    // 지수 감쇠 — 순간적으로 확 붙었다가 부드럽게 평상 속도로 복귀.
    this.boost *= Math.pow(0.02, realDt / 1000);
    if (this.boost < 0.01) this.boost = 0;
    // 속도선은 부스트가 어느 정도 강할 때만 보이게(0.15 이상 → 0~1로 매핑).
    this.speedLineIntensity = Math.min(1, Math.max(0, (this.boost - 0.12) / 0.5));
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
    this.boost = 0;
    this.speedLineIntensity = 0;
    this.flashTimer = 0;
    this.flashDuration = 0;
    this.banner = null;
    this.effects.clear();
  }
}
