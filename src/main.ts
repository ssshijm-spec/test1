import { Engine } from './core/engine';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('#game-canvas 를 찾을 수 없습니다.');

const engine = new Engine(canvas);

interface DebugApi {
  invincible: (v: boolean) => void;
  speed: (v: number) => void;
  power: (v: number) => void;
}

// 콘솔 디버그 토글 (§8 선택 사항): window.__debug.invincible(true), .speed(2), .power(1e9)
(window as unknown as { __debug: DebugApi }).__debug = {
  invincible: (v: boolean) => engine.setDebugInvincible(v),
  speed: (v: number) => engine.setDebugSpeedMult(v),
  power: (v: number) => engine.forcePower(v),
};
