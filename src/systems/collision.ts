import { BALANCE } from '../data/balance';
import { NARROW_WALL_DAMAGE_RATIO } from '../data/enemies';
import { formatDelta, formatDivisor, formatMultiplier, formatPower } from '../core/number';
import { Truck } from '../entities/truck';
import { GateSpec, TrackSegment } from '../entities/segment';
import { clampLaneIndex, laneCenterX, TRUCK_SCREEN_Y } from '../render/layout';
import { checkEvolution } from './evolution';
import { JuiceSystem } from './juice';

export type SegmentOutcome = 'none' | 'death' | 'minibossDefeated' | 'bossDefeated';

export interface ResolveResult {
  outcome: SegmentOutcome;
  evolveEvent: ReturnType<typeof checkEvolution>;
}

/** add/sub의 value는 "현재 전력 대비 퍼센트"다 (data/gates.ts 참고). mul/div는 직접 배수/제수. */
function applyGate(power: number, spec: GateSpec): number {
  switch (spec.op) {
    case 'add':
      return power * (1 + spec.value / 100);
    case 'sub':
      return power * (1 - spec.value / 100);
    case 'mul':
      return power * spec.value;
    case 'div':
      return power / spec.value;
  }
}

function gateColor(op: GateSpec['op']): string {
  switch (op) {
    case 'mul':
      return '#3ddc63';
    case 'add':
      return '#7fd3ff';
    case 'sub':
      return '#ff8a5c';
    case 'div':
      return '#ff4d4d';
  }
}

function gateLabel(spec: GateSpec): string {
  switch (spec.op) {
    case 'add':
      return `+${spec.value}%`;
    case 'sub':
      return `-${spec.value}%`;
    case 'mul':
      return formatMultiplier(spec.value);
    case 'div':
      return formatDivisor(spec.value);
  }
}

function popupAt(juice: JuiceSystem, lane: number, text: string, color: string) {
  juice.effects.spawnPopup({
    x: laneCenterX(lane),
    y: TRUCK_SCREEN_Y - 40,
    vy: -55,
    maxLife: 850,
    text,
    color,
    size: 20,
  });
}

function afterPowerChange(truck: Truck, juice: JuiceSystem): ReturnType<typeof checkEvolution> {
  const x = laneCenterX(truck.lane);
  return checkEvolution(truck, juice, x, TRUCK_SCREEN_Y);
}

export function resolveSegment(segment: TrackSegment, truck: Truck, juice: JuiceSystem): ResolveResult {
  const laneIdx = clampLaneIndex(truck.lane);
  const x = laneCenterX(laneIdx);
  const y = TRUCK_SCREEN_Y;
  let evolveEvent: ReturnType<typeof checkEvolution> = null;

  const die = (): ResolveResult => {
    truck.hitFlashMs = 500;
    juice.shake(BALANCE.shakeGameOver);
    juice.triggerHitStop(180);
    juice.effects.spawnBurst(x, y, 40, '#ff3b3b', [60, 260], [500, 1000], 'spark');
    return { outcome: 'death', evolveEvent: null };
  };

  switch (segment.kind) {
    case 'gate3': {
      const spec = segment.gates[laneIdx];
      truck.power = applyGate(truck.power, spec);
      popupAt(juice, laneIdx, gateLabel(spec), gateColor(spec.op));
      juice.shake(BALANCE.shakeGate);
      juice.effects.spawnBurst(x, y, spec.op === 'mul' ? 18 : 10, gateColor(spec.op), [50, 160], [300, 550]);
      evolveEvent = afterPowerChange(truck, juice);
      break;
    }
    case 'barricade': {
      if (segment.blockedLanes[laneIdx]) {
        const lost = truck.power * BALANCE.barricadeDamageRatio;
        truck.power -= lost;
        truck.hitFlashMs = 220;
        popupAt(juice, laneIdx, formatDelta(-lost), '#ff8a5c');
        juice.shake(BALANCE.shakeBarricade);
        juice.effects.spawnBurst(x, y, 16, '#ffb37a', [60, 200], [300, 600], 'rect');
        evolveEvent = afterPowerChange(truck, juice);
      }
      break;
    }
    case 'enemy': {
      const enemyPower = segment.lanePower[laneIdx];
      if (enemyPower !== null) {
        if (truck.power >= enemyPower) {
          truck.power -= enemyPower;
          popupAt(juice, laneIdx, formatDelta(-enemyPower), '#ffd23d');
          juice.shake(BALANCE.shakeEnemyKill);
          juice.triggerHitStop(BALANCE.hitStopEnemy);
          juice.effects.spawnBurst(x, y, 26, '#ffd23d', [80, 260], [350, 700], 'spark');
          evolveEvent = afterPowerChange(truck, juice);
        } else {
          return die();
        }
      }
      break;
    }
    case 'tollgate': {
      if (segment.op.type === 'div') {
        truck.power /= segment.op.value;
        popupAt(juice, laneIdx, formatDivisor(segment.op.value), '#ff4d4d');
      } else {
        truck.power *= 1 - segment.op.value / 100;
        popupAt(juice, laneIdx, `-${segment.op.value}%`, '#ff4d4d');
      }
      juice.shake(BALANCE.shakeBarricade + 2);
      juice.triggerHitStop(40);
      juice.effects.spawnBurst(laneCenterX(1), y, 24, '#ff4d4d', [60, 220], [350, 650]);
      evolveEvent = afterPowerChange(truck, juice);
      break;
    }
    case 'narrow': {
      if (laneIdx !== segment.openLane) {
        const lost = truck.power * NARROW_WALL_DAMAGE_RATIO;
        truck.power -= lost;
        truck.hitFlashMs = 260;
        popupAt(juice, laneIdx, formatDelta(-lost), '#ff8a5c');
        juice.shake(BALANCE.shakeBarricade);
        juice.effects.spawnBurst(x, y, 18, '#ffb37a', [70, 220], [300, 600], 'rect');
        evolveEvent = afterPowerChange(truck, juice);
      }
      break;
    }
    case 'bonusLane': {
      if (laneIdx === segment.bonusLane) {
        truck.power *= segment.multiplier;
        popupAt(juice, laneIdx, `JACKPOT ${formatMultiplier(segment.multiplier)}`, '#ffd23d');
        juice.shake(BALANCE.shakeEvolve);
        juice.triggerHitStop(90);
        juice.effects.spawnBurst(x, y, 40, '#ffd23d', [100, 320], [450, 900], 'spark');
      } else {
        const trap = segment.trapOps[laneIdx];
        if (trap) {
          truck.power = applyGate(truck.power, trap);
          popupAt(juice, laneIdx, gateLabel(trap), '#ff4d4d');
          juice.shake(BALANCE.shakeBarricade);
          juice.effects.spawnBurst(x, y, 14, '#ff4d4d', [60, 200], [300, 600]);
        }
      }
      evolveEvent = afterPowerChange(truck, juice);
      break;
    }
    case 'bossGate': {
      if (truck.power >= segment.threshold) {
        juice.shake(BALANCE.shakeBossHit);
        juice.triggerHitStop(BALANCE.hitStopBoss * 0.5);
        popupAt(juice, 1, `BREAKTHROUGH! ${formatPower(segment.threshold)}`, '#7fd3ff');
        juice.effects.spawnBurst(laneCenterX(1), y - 60, 34, '#7fd3ff', [90, 280], [400, 800], 'spark');
        if (segment.phaseIndex === segment.totalPhases - 1) {
          juice.shake(BALANCE.shakeBossHit + 6);
          juice.triggerHitStop(BALANCE.hitStopBoss);
          juice.effects.spawnBurst(laneCenterX(1), y - 60, 60, '#ffe98a', [120, 360], [600, 1100], 'spark');
          return {
            outcome: segment.isMiniboss ? 'minibossDefeated' : 'bossDefeated',
            evolveEvent: null,
          };
        }
      } else {
        return die();
      }
      break;
    }
    case 'breather':
      break;
  }

  if (!truck.isAlive()) {
    return die();
  }

  return { outcome: 'none', evolveEvent };
}
