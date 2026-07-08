import { BALANCE } from '../data/balance';
import { STAGES } from '../data/stages';
import { TierDef } from '../data/tiers';
import { TrackSegment } from '../entities/segment';
import { Truck } from '../entities/truck';
import { generateStage, stageTotalDistance } from '../systems/spawner';
import { resolveSegment } from '../systems/collision';
import { checkEvolution } from '../systems/evolution';
import { JuiceSystem } from '../systems/juice';
import { InputController } from './input';
import { Rng } from './rng';
import { renderFrame } from '../render/renderer';
import { HudParams, TierCardInfo } from '../render/drawUI';
import { laneCenterX, TRUCK_SCREEN_Y } from '../render/layout';
import { ScreenManager } from '../ui/screens';

type GameState = 'menu' | 'intro' | 'playing' | 'stageClear' | 'gameOver' | 'victory' | 'paused';

interface TierCardState {
  tier: TierDef;
  isEvolve: boolean;
  elapsed: number;
  total: number;
}

export class Engine {
  private ctx: CanvasRenderingContext2D;
  private input: InputController;
  private screens: ScreenManager;

  private state: GameState = 'menu';
  private prePauseState: GameState = 'playing';
  private stageIndex = 0;
  private truck = new Truck();
  private juice = new JuiceSystem();
  private rng = new Rng((Date.now() ^ 0x9e3779b9) >>> 0);
  private segments: TrackSegment[] = [];
  private segPointer = 0;

  private tierCard: TierCardState | null = null;

  /** HUD에 표시되는 전력 — 실제 전력을 향해 촤르륵 굴러가는 롤링 카운터 값. */
  private displayPower: number = BALANCE.startingPower;

  private lastTs = 0;
  private elapsedMs = 0;

  // 디버그 토글 (콘솔에서 window.__debug 로 접근)
  private debugInvincible = false;
  private debugSpeedMult = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context를 가져올 수 없습니다.');
    this.ctx = ctx;
    this.input = new InputController(canvas, BALANCE.laneCount);

    this.screens = new ScreenManager({
      onStart: () => this.startNewGame(),
      onIntroGo: () => this.beginPlaying(),
      onNextStage: () => this.advanceStage(),
      onRetry: () => this.startNewGame(),
      onRestart: () => this.startNewGame(),
      onResume: () => this.togglePause(),
      onPauseRestart: () => this.startNewGame(),
      onPauseToggle: () => this.togglePause(),
    });

    this.screens.showMenu();
    requestAnimationFrame(this.loop);
  }

  private loop = (ts: number) => {
    let realDt = this.lastTs ? ts - this.lastTs : 16.7;
    this.lastTs = ts;
    realDt = Math.min(realDt, 48);
    this.elapsedMs += realDt;

    this.updateTierCard(realDt);
    this.updateDisplayPower(realDt);

    if (this.state === 'playing') {
      const dt = this.juice.step(realDt) * this.debugSpeedMult;
      this.update(dt);
    } else {
      this.juice.step(realDt);
    }

    this.render();
    requestAnimationFrame(this.loop);
  };

  /**
   * 표시 전력을 실제 전력으로 지수 보간해 "숫자가 촤르륵 올라가는" 느낌을 준다.
   * 전력이 기하급수라 선형 보간이 아닌 로그 공간 보간을 써야 큰 곱셈에서도 자연스럽게 굴러간다.
   */
  private updateDisplayPower(realDt: number) {
    const target = this.truck.power;
    if (this.displayPower === target) return;
    if (target <= 0) {
      this.displayPower = target;
      return;
    }
    // 감소(강등/함정)는 즉각 반영해 위험을 또렷하게, 증가(이득)만 롤링.
    if (target < this.displayPower) {
      this.displayPower = target;
      return;
    }
    const k = 1 - Math.pow(0.0025, realDt / 1000); // 약 0.15/16ms
    const cur = Math.max(1, this.displayPower);
    const logCur = Math.log(cur);
    const logTarget = Math.log(Math.max(1, target));
    const next = Math.exp(logCur + (logTarget - logCur) * k);
    // 충분히 가까우면 스냅
    this.displayPower = next >= target * 0.995 ? target : next;
  }

  private updateTierCard(realDt: number) {
    if (!this.tierCard) return;
    this.tierCard.elapsed += realDt;
    if (this.tierCard.elapsed >= this.tierCard.total) this.tierCard = null;
  }

  private update(dt: number) {
    const stage = STAGES[this.stageIndex];
    const targetLane = this.input.getTargetLane();
    this.truck.update(dt, targetLane);
    // 게이트/처치 시 순간 부스트로 스크롤 속도가 확 붙었다가 감쇠 — "커진다 = 빨라진다" 체감.
    this.truck.distance += stage.scrollSpeed * this.juice.boostMultiplier * (dt / 1000);

    while (this.segPointer < this.segments.length) {
      const seg = this.segments[this.segPointer];
      if (this.truck.distance < seg.z) break;
      seg.resolved = true;
      const result = resolveSegment(seg, this.truck, this.juice);
      this.segPointer++;

      if (result.evolveEvent) {
        this.tierCard = {
          tier: result.evolveEvent.tier,
          isEvolve: result.evolveEvent.isEvolve,
          elapsed: 0,
          total: result.evolveEvent.isEvolve ? 2200 : 1400,
        };
      }

      if (result.outcome === 'death') {
        if (this.debugInvincible) {
          this.truck.power = Math.max(this.truck.power, BALANCE.minSurvivablePower * 10);
          continue;
        }
        this.onGameOver();
        return;
      }
      if (result.outcome === 'bossDefeated') {
        this.onStageClear();
        return;
      }
      // minibossDefeated: 축하 연출만 하고 계속 진행
    }
  }

  private onGameOver() {
    this.state = 'gameOver';
    this.screens.showGameOver(this.stageIndex, STAGES.length, this.truck.power, this.truck.tier);
  }

  private onStageClear() {
    this.state = 'stageClear';
    this.screens.showClear(STAGES[this.stageIndex], this.truck.power, this.truck.tier);
  }

  private startNewGame() {
    this.stageIndex = 0;
    this.truck = new Truck();
    this.juice.reset();
    this.tierCard = null;
    this.displayPower = this.truck.power;
    this.rng = new Rng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
    this.loadStage(0);
  }

  private loadStage(idx: number) {
    const stage = STAGES[idx];
    this.segments = generateStage(stage, idx, this.rng);
    this.segPointer = 0;
    this.truck.distance = 0;
    this.input.reset();
    this.state = 'intro';
    this.screens.showIntro(stage, idx, STAGES.length);
  }

  private beginPlaying() {
    this.state = 'playing';
    this.screens.hideAll();
  }

  private advanceStage() {
    const next = this.stageIndex + 1;
    if (next >= STAGES.length) {
      this.state = 'victory';
      this.screens.showVictory(this.truck.power, this.truck.tier);
      return;
    }
    this.stageIndex = next;
    this.loadStage(next);
  }

  private togglePause() {
    if (this.state === 'playing') {
      this.prePauseState = this.state;
      this.state = 'paused';
      this.screens.showPause();
    } else if (this.state === 'paused') {
      this.state = this.prePauseState;
      this.screens.hidePause();
    }
  }

  private render() {
    const stage = STAGES[Math.min(this.stageIndex, STAGES.length - 1)];
    const total = stageTotalDistance(stage);
    const hud: HudParams = {
      power: this.displayPower,
      tierName: this.truck.tier.name,
      stageName: stage.biomeName,
      stageIndex: this.stageIndex,
      totalStages: STAGES.length,
      stageProgress: total > 0 ? this.truck.distance / total : 0,
      tierCard: this.tierCard ? this.computeTierCardVisual() : null,
    };

    renderFrame(this.ctx, {
      truck: this.truck,
      segments: this.segments,
      palette: stage.palette,
      juice: this.juice,
      elapsedMs: this.elapsedMs,
      hud,
    });
  }

  private computeTierCardVisual(): TierCardInfo {
    const c = this.tierCard!;
    const fadeIn = 150;
    const fadeOut = 300;
    let alpha = 1;
    if (c.elapsed < fadeIn) alpha = c.elapsed / fadeIn;
    else if (c.elapsed > c.total - fadeOut) alpha = Math.max(0, (c.total - c.elapsed) / fadeOut);
    let scale = 1;
    if (c.elapsed < 300) scale = 1 + (1 - c.elapsed / 300) * 0.35;
    return {
      tierName: c.tier.name,
      lore: c.tier.lore,
      evolveLine: c.tier.evolveLine,
      isEvolve: c.isEvolve,
      alpha,
      scale,
    };
  }

  // ---- 디버그 훅 (콘솔용) ----
  setDebugInvincible(v: boolean) {
    this.debugInvincible = v;
  }

  setDebugSpeedMult(v: number) {
    this.debugSpeedMult = v;
  }

  forcePower(v: number) {
    this.truck.power = v;
    this.displayPower = v;
    checkEvolution(this.truck, this.juice, laneCenterX(this.truck.lane), TRUCK_SCREEN_Y);
  }

  getState() {
    return this.state;
  }
}
