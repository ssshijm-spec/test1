import { Rng } from '../core/rng';
import { BALANCE } from '../data/balance';
import { GATE_CONFIGS } from '../data/gates';
import {
  BONUS_LANE_CONFIGS,
  BOSS_CONFIGS,
  ENEMY_CONFIGS,
  MINIBOSS_PHASE_FACTORS,
  TOLLGATE_CONFIGS,
} from '../data/enemies';
import { referencePowerAt, SegmentType, StageDef } from '../data/stages';
import { GateSpec, TrackSegment } from '../entities/segment';

const REGULAR_KINDS: SegmentType[] = ['gate3', 'barricade', 'enemy', 'tollgate', 'narrow', 'bonusLane', 'breather'];

function pickWeightedKind(stage: StageDef, rng: Rng): SegmentType {
  const kinds = REGULAR_KINDS.filter((k) => stage.availableSegments.includes(k));
  const weights = kinds.map((k) => stage.segmentWeights[k] ?? 0);
  return rng.weightedPick(kinds, weights);
}

function genGate3(stageIdx: number, rng: Rng): GateSpec[] {
  const cfg = GATE_CONFIGS[stageIdx];
  const opNames = ['add', 'sub', 'mul', 'div'] as const;
  const weights = [cfg.opWeights.add, cfg.opWeights.sub, cfg.opWeights.mul, cfg.opWeights.div];

  const makeValue = (op: (typeof opNames)[number]): number => {
    switch (op) {
      case 'add':
        return Math.round(rng.range(cfg.addRange[0], cfg.addRange[1]));
      case 'sub':
        return Math.round(rng.range(cfg.subRange[0], cfg.subRange[1]));
      case 'mul':
        return Math.round(rng.range(cfg.mulRange[0], cfg.mulRange[1]));
      case 'div':
        return Math.round(rng.range(cfg.divRange[0], cfg.divRange[1]));
    }
  };

  const ops = [0, 1, 2].map(() => rng.weightedPick(opNames, weights));

  // 공정성 규칙: 3레인이 전부 함정(sub/div)이면 하나를 mul로 강제 교체해 항상 성장 가능한 경로를 보장한다.
  let allBad = true;
  for (const o of ops) {
    if (o !== 'sub' && o !== 'div') {
      allBad = false;
      break;
    }
  }
  if (allBad) {
    ops[Math.floor(rng.next() * 3)] = 'mul';
  }

  return ops.map((op) => ({ op, value: makeValue(op) }));
}

function genBarricade(rng: Rng): [boolean, boolean, boolean] {
  const blockCount = rng.chance(0.55) ? 1 : 2;
  const lanes: [boolean, boolean, boolean] = [false, false, false];
  const indices = [0, 1, 2];
  for (let i = 0; i < blockCount; i++) {
    const idx = Math.floor(rng.next() * indices.length);
    lanes[indices[idx]] = true;
    indices.splice(idx, 1);
  }
  return lanes;
}

function genEnemy(stageIdx: number, referencePower: number, rng: Rng): [number | null, number | null, number | null] {
  const cfg = ENEMY_CONFIGS[stageIdx];
  const enemyCount = rng.chance(0.6) ? 1 : 2; // 항상 최소 1레인은 개방(공정성 보장)
  const lanes: (number | null)[] = [null, null, null];
  const indices = [0, 1, 2];
  for (let i = 0; i < enemyCount; i++) {
    const idx = Math.floor(rng.next() * indices.length);
    const laneIdx = indices[idx];
    indices.splice(idx, 1);
    const isWeak = rng.chance(cfg.weakChance);
    const factor = isWeak ? rng.range(cfg.weakFactor[0], cfg.weakFactor[1]) : rng.range(cfg.strongFactor[0], cfg.strongFactor[1]);
    lanes[laneIdx] = Math.max(1, Math.round(referencePower * factor));
  }
  return lanes as [number | null, number | null, number | null];
}

function genTollgate(stageIdx: number, rng: Rng): { type: 'div' | 'sub'; value: number } {
  const cfg = TOLLGATE_CONFIGS[stageIdx];
  if (rng.chance(cfg.subChance)) {
    // 퍼센트 손실 (트럭의 실제 현재 전력 기준) — 참조전력을 쓰지 않아 전력이 음수로 폭주할 수 없다.
    return { type: 'sub', value: Math.round(rng.range(cfg.subPercent[0], cfg.subPercent[1])) };
  }
  const divisor = Math.round(rng.range(cfg.divisorRange[0], cfg.divisorRange[1]));
  return { type: 'div', value: Math.max(2, divisor) };
}

function genBonusLane(
  stageIdx: number,
  referencePower: number,
  rng: Rng,
): { bonusLane: 0 | 1 | 2; multiplier: number; trapOps: [GateSpec | null, GateSpec | null, GateSpec | null] } {
  const gateCfg = GATE_CONFIGS[stageIdx];
  const bonusCfg = BONUS_LANE_CONFIGS[stageIdx];
  const bonusLane = Math.floor(rng.next() * 3) as 0 | 1 | 2;
  const multiplier = Math.round(rng.range(bonusCfg.multiplierRange[0], bonusCfg.multiplierRange[1]));
  const trapOps: [GateSpec | null, GateSpec | null, GateSpec | null] = [null, null, null];
  for (let lane = 0; lane < 3; lane++) {
    if (lane === bonusLane) continue;
    const useDiv = rng.chance(0.5);
    trapOps[lane] = useDiv
      ? { op: 'div', value: Math.round(rng.range(gateCfg.divRange[0], gateCfg.divRange[1])) }
      : { op: 'sub', value: Math.round(rng.range(gateCfg.subRange[0], gateCfg.subRange[1]) * 1.05) };
  }
  void referencePower;
  return { bonusLane, multiplier, trapOps };
}

/**
 * 스테이지 전체 세그먼트를 미리 생성한다 (스테이지 길이가 짧아 스트리밍 없이도 충분히 가볍다).
 * 구조: [일반 세그먼트...] → (미니보스 3연속, 있을 경우) → [일반 세그먼트...] → 보스 3연속
 */
export function generateStage(stage: StageDef, stageIdx: number, rng: Rng): TrackSegment[] {
  const totalDistance = stage.lengthSeconds * stage.scrollSpeed;
  const spacing = BALANCE.segmentSpacing;
  const segments: TrackSegment[] = [];

  const minibossZ = stage.hasMiniboss ? totalDistance * rng.range(0.52, 0.62) : -1;
  const bossStartZ = totalDistance - spacing * 3;

  let z = spacing * 1.5; // 시작 직후 약간의 여유
  let minibossInserted = false;

  while (z < bossStartZ - spacing * 0.5) {
    if (stage.hasMiniboss && !minibossInserted && z >= minibossZ) {
      const refAtBoss = referencePowerAt(stage, minibossZ / totalDistance);
      for (let phase = 0; phase < 3; phase++) {
        segments.push({
          kind: 'bossGate',
          z,
          resolved: false,
          isMiniboss: true,
          bossName: '미니보스',
          phaseIndex: phase,
          totalPhases: 3,
          threshold: Math.max(1, Math.round(refAtBoss * MINIBOSS_PHASE_FACTORS[phase])),
        });
        z += spacing * 0.85;
      }
      segments.push({ kind: 'breather', z, resolved: false });
      z += spacing;
      minibossInserted = true;
      continue;
    }

    const kind = pickWeightedKind(stage, rng);
    const progress = z / totalDistance;
    const refPower = referencePowerAt(stage, progress);

    switch (kind) {
      case 'gate3':
        segments.push({ kind: 'gate3', z, resolved: false, gates: genGate3(stageIdx, rng) as [GateSpec, GateSpec, GateSpec] });
        break;
      case 'barricade':
        segments.push({ kind: 'barricade', z, resolved: false, blockedLanes: genBarricade(rng) });
        break;
      case 'enemy':
        segments.push({ kind: 'enemy', z, resolved: false, lanePower: genEnemy(stageIdx, refPower, rng) });
        break;
      case 'tollgate':
        segments.push({ kind: 'tollgate', z, resolved: false, op: genTollgate(stageIdx, rng) });
        break;
      case 'narrow':
        segments.push({ kind: 'narrow', z, resolved: false, openLane: Math.floor(rng.next() * 3) as 0 | 1 | 2 });
        break;
      case 'bonusLane': {
        const b = genBonusLane(stageIdx, refPower, rng);
        segments.push({ kind: 'bonusLane', z, resolved: false, ...b });
        break;
      }
      case 'breather':
        segments.push({ kind: 'breather', z, resolved: false });
        break;
      default:
        break;
    }
    z += spacing;
  }

  // 보스 3연속 배치
  const bossCfg = BOSS_CONFIGS[stageIdx];
  let bz = Math.max(z, bossStartZ);
  for (let phase = 0; phase < 3; phase++) {
    segments.push({
      kind: 'bossGate',
      z: bz,
      resolved: false,
      isMiniboss: false,
      bossName: stage.bossName,
      phaseIndex: phase,
      totalPhases: 3,
      threshold: Math.max(1, Math.round(stage.endReferencePower * bossCfg.phaseFactors[phase])),
    });
    bz += spacing * 0.9;
  }

  return segments;
}

export function stageTotalDistance(stage: StageDef): number {
  return stage.lengthSeconds * stage.scrollSpeed;
}
