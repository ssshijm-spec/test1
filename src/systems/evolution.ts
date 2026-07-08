import { BALANCE } from '../data/balance';
import { TierDef, tierForPower } from '../data/tiers';
import { Truck } from '../entities/truck';
import { JuiceSystem } from './juice';

export interface EvolutionEvent {
  tier: TierDef;
  isEvolve: boolean; // true=승급, false=강등(디볼브)
}

/**
 * 매 전력 변경 직후 호출. 티어 변화 여부를 규칙 하나로 판정한다:
 * "전력 이상을 만족하는 가장 높은 threshold 티어" — 이 규칙이 진화와 강등을 동시에 처리한다.
 */
export function checkEvolution(
  truck: Truck,
  juice: JuiceSystem,
  screenX: number,
  screenY: number,
): EvolutionEvent | null {
  const newTier = tierForPower(truck.power);
  if (newTier.id === truck.lastTierId) return null;

  const isEvolve = newTier.id > truck.lastTierId;
  truck.lastTierId = newTier.id;

  if (isEvolve) {
    truck.evolveFxMs = BALANCE.evolveSlowMoDuration + 900;
    juice.triggerSlowMo(BALANCE.evolveSlowMoScale, BALANCE.evolveSlowMoDuration);
    juice.triggerHitStop(BALANCE.hitStopEvolve);
    juice.shake(BALANCE.shakeEvolve);
    juice.effects.spawnRing(screenX, screenY, newTier.visual.glowColor);
    juice.effects.spawnBurst(screenX, screenY, 46, newTier.visual.glowColor, [80, 340], [400, 900], 'spark');
    juice.effects.spawnBurst(screenX, screenY, 20, newTier.visual.bodyColor, [40, 160], [500, 1000], 'circle');
  } else {
    truck.devolveFxMs = 600;
    juice.triggerHitStop(BALANCE.hitStopDevolve);
    juice.shake(BALANCE.shakeDevolve);
    juice.effects.spawnBurst(screenX, screenY, 14, '#8a8a8a', [40, 140], [300, 600], 'rect');
  }

  return { tier: newTier, isEvolve };
}
