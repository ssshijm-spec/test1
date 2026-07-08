import { formatPower } from '../core/number';
import { StageDef } from '../data/stages';
import { TierDef } from '../data/tiers';

export interface ScreenCallbacks {
  onStart: () => void;
  onIntroGo: () => void;
  onNextStage: () => void;
  onRetry: () => void;
  onRestart: () => void;
  onResume: () => void;
  onPauseRestart: () => void;
  onPauseToggle: () => void;
}

function el<T extends HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`missing element #${id}`);
  return e as T;
}

/** DOM 오버레이 화면(시작/스테이지 인트로/클리어/게임오버/엔딩/일시정지) 관리. */
export class ScreenManager {
  private screens: Record<string, HTMLElement>;

  constructor(cb: ScreenCallbacks) {
    this.screens = {
      menu: el('screen-menu'),
      intro: el('screen-intro'),
      clear: el('screen-clear'),
      gameover: el('screen-gameover'),
      victory: el('screen-victory'),
      pause: el('screen-pause'),
    };

    el<HTMLButtonElement>('btn-start').addEventListener('click', cb.onStart);
    el<HTMLButtonElement>('btn-intro-go').addEventListener('click', cb.onIntroGo);
    el<HTMLButtonElement>('btn-next-stage').addEventListener('click', cb.onNextStage);
    el<HTMLButtonElement>('btn-retry').addEventListener('click', cb.onRetry);
    el<HTMLButtonElement>('btn-restart').addEventListener('click', cb.onRestart);
    el<HTMLButtonElement>('btn-resume').addEventListener('click', cb.onResume);
    el<HTMLButtonElement>('btn-pause-restart').addEventListener('click', cb.onPauseRestart);
    el<HTMLButtonElement>('pause-btn').addEventListener('click', cb.onPauseToggle);
  }

  hideAll() {
    for (const key of Object.keys(this.screens)) this.screens[key].classList.add('hidden');
  }

  showMenu() {
    this.hideAll();
    this.screens.menu.classList.remove('hidden');
  }

  showIntro(stage: StageDef, stageIndex: number, total: number) {
    this.hideAll();
    el('intro-stage-badge').textContent = `STAGE ${stageIndex + 1} / ${total}`;
    el('intro-biome').textContent = stage.biomeName;
    el('intro-lore').textContent = stage.introLore;
    el('intro-mechanic').textContent = stage.newMechanicLabel;
    this.screens.intro.classList.remove('hidden');
  }

  showClear(stage: StageDef, power: number, tier: TierDef) {
    this.hideAll();
    el('clear-lore').textContent = stage.clearLore;
    el('clear-power').textContent = formatPower(power);
    el('clear-tier').textContent = tier.name;
    this.screens.clear.classList.remove('hidden');
  }

  showGameOver(stageIndex: number, total: number, power: number, tier: TierDef) {
    this.hideAll();
    el('gameover-line').textContent = '전력이 바닥나 트럭이 멈춰섰다. 하지만 다음 도전은 언제나 있다.';
    el('gameover-stage').textContent = `${stageIndex + 1} / ${total}`;
    el('gameover-power').textContent = formatPower(power);
    el('gameover-tier').textContent = tier.name;
    this.screens.gameover.classList.remove('hidden');
  }

  showVictory(power: number, tier: TierDef) {
    this.hideAll();
    el('victory-lore').textContent =
      '고철 손수레는 이제 없다. 도로의 끝에서, 트럭은 스스로 전설이 되었다.';
    el('victory-power').textContent = formatPower(power);
    el('victory-tier').textContent = tier.name;
    this.screens.victory.classList.remove('hidden');
  }

  showPause() {
    this.screens.pause.classList.remove('hidden');
  }

  hidePause() {
    this.screens.pause.classList.add('hidden');
  }
}
