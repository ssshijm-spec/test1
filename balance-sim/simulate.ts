/**
 * 헤드리스 밸런스 시뮬레이션.
 * 실제 게임과 동일한 핵심 로직(systems/spawner.ts의 generateStage, systems/collision.ts의 resolveSegment)을
 * 그대로 재사용해, "게이트 값/보스 임계치가 실제로 기하급수 곡선과 도달 가능한 난이도를 만드는가"를 검증한다.
 *
 * 실행: npm run sim
 */
import { formatPower } from '../src/core/number';
import { BALANCE } from '../src/data/balance';
import { STAGES } from '../src/data/stages';
import { tierForPower } from '../src/data/tiers';
import { GateSpec, TrackSegment } from '../src/entities/segment';
import { Truck } from '../src/entities/truck';
import { Rng } from '../src/core/rng';
import { resolveSegment } from '../src/systems/collision';
import { JuiceSystem } from '../src/systems/juice';
import { generateStage } from '../src/systems/spawner';

type PolicyName = 'optimal' | 'safe' | 'random';
const POLICIES: PolicyName[] = ['optimal', 'safe', 'random'];
const TRIALS_PER_POLICY = 400;

function applyGatePreview(power: number, spec: GateSpec): number {
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

function bestTrapLane(gates: [GateSpec, GateSpec, GateSpec], power: number, candidateLanes: number[]): number {
  let best = candidateLanes[0];
  let bestResult = -Infinity;
  for (const lane of candidateLanes) {
    const result = applyGatePreview(power, gates[lane]);
    if (result > bestResult) {
      bestResult = result;
      best = lane;
    }
  }
  return best;
}

function chooseGate3Lane(policy: PolicyName, gates: [GateSpec, GateSpec, GateSpec], power: number, rng: Rng): number {
  if (policy === 'random') return Math.floor(rng.next() * 3);

  // gate3 선택에서는 'optimal'과 'safe'가 동일하다: mul은 이 설계상 절대 함정이 아니라 항상 이득이므로
  // (손실 가능성이 있는 건 sub/div뿐), 위험을 회피하려는 "안전" 플레이어도 mul을 피할 이유가 없다.
  // 두 정책의 진짜 차이는 보너스 레인(잭팟) 하나뿐이다 — chooseBonusLane 참고.
  const mulLanes = [0, 1, 2].filter((i) => gates[i].op === 'mul');
  const addLanes = [0, 1, 2].filter((i) => gates[i].op === 'add');
  const trapLanes = [0, 1, 2].filter((i) => gates[i].op === 'sub' || gates[i].op === 'div');

  if (mulLanes.length > 0) return mulLanes.reduce((a, b) => (gates[b].value > gates[a].value ? b : a));
  if (addLanes.length > 0) return addLanes.reduce((a, b) => (gates[b].value > gates[a].value ? b : a));
  return bestTrapLane(gates, power, trapLanes);
}

function chooseOpenLane(policy: PolicyName, blockedOrEnemy: (boolean | number | null)[], rng: Rng): number {
  if (policy === 'random') return Math.floor(rng.next() * 3);
  for (let i = 0; i < 3; i++) {
    const v = blockedOrEnemy[i];
    if (v === false || v === null) return i;
  }
  return 0;
}

function chooseBonusLane(policy: PolicyName, bonusLane: number, trapOps: (GateSpec | null)[], power: number, rng: Rng): number {
  if (policy === 'random') return Math.floor(rng.next() * 3);
  if (policy === 'optimal') return bonusLane;
  // safe: 잭팟을 포기하고 둘 중 손해가 적은 함정 레인으로
  const others = [0, 1, 2].filter((i) => i !== bonusLane);
  let best = others[0];
  let bestResult = -Infinity;
  for (const lane of others) {
    const trap = trapOps[lane];
    const result = trap ? applyGatePreview(power, trap) : power;
    if (result > bestResult) {
      bestResult = result;
      best = lane;
    }
  }
  return best;
}

function chooseLane(policy: PolicyName, segment: TrackSegment, power: number, rng: Rng): number {
  switch (segment.kind) {
    case 'gate3':
      return chooseGate3Lane(policy, segment.gates, power, rng);
    case 'barricade':
      return chooseOpenLane(policy, segment.blockedLanes, rng);
    case 'enemy':
      return chooseOpenLane(policy, segment.lanePower, rng);
    case 'narrow':
      if (policy === 'random') return Math.floor(rng.next() * 3);
      return segment.openLane;
    case 'bonusLane':
      return chooseBonusLane(policy, segment.bonusLane, segment.trapOps, power, rng);
    case 'tollgate':
    case 'bossGate':
    case 'breather':
    default:
      return 1;
  }
}

interface StageStat {
  attempts: number;
  cleared: number;
  deathsHere: number;
  clearPowerSum: number;
  clearTierSum: number;
  clearPowers: number[];
}

function newStageStat(): StageStat {
  return { attempts: 0, cleared: 0, deathsHere: 0, clearPowerSum: 0, clearTierSum: 0, clearPowers: [] };
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function runTrial(policy: PolicyName, seed: number): { finalStageReached: number; victory: boolean; finalPower: number; stagePowers: (number | null)[] } {
  const rng = new Rng(seed);
  const truck = new Truck();
  const juice = new JuiceSystem();
  const stagePowers: (number | null)[] = STAGES.map(() => null);

  for (let stageIdx = 0; stageIdx < STAGES.length; stageIdx++) {
    const stage = STAGES[stageIdx];
    const segments = generateStage(stage, stageIdx, rng);
    truck.distance = 0;

    for (const seg of segments) {
      const lane = chooseLane(policy, seg, truck.power, rng);
      truck.lane = lane;
      const result = resolveSegment(seg, truck, juice);
      if (result.outcome === 'death') {
        return { finalStageReached: stageIdx, victory: false, finalPower: truck.power, stagePowers };
      }
    }

    stagePowers[stageIdx] = truck.power;
    if (stageIdx === STAGES.length - 1) {
      return { finalStageReached: stageIdx, victory: true, finalPower: truck.power, stagePowers };
    }
  }

  return { finalStageReached: STAGES.length - 1, victory: true, finalPower: truck.power, stagePowers };
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
function padL(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

function main() {
  console.log('='.repeat(78));
  console.log(' 넘버 트럭 러너 — 밸런스 시뮬레이션');
  console.log(` 정책: ${POLICIES.join(', ')} / 정책당 ${TRIALS_PER_POLICY}회 시도`);
  console.log('='.repeat(78));

  for (const policy of POLICIES) {
    const stageStats: StageStat[] = STAGES.map(() => newStageStat());
    let victories = 0;
    let finalPowerSum = 0;
    let finalTierSum = 0;

    for (let t = 0; t < TRIALS_PER_POLICY; t++) {
      const seed = (policy.charCodeAt(0) * 100000 + t * 7919 + 12345) >>> 0;
      const res = runTrial(policy, seed);

      for (let s = 0; s <= res.finalStageReached; s++) {
        stageStats[s].attempts++;
      }
      if (!res.victory) {
        stageStats[res.finalStageReached].deathsHere++;
      }
      for (let s = 0; s < STAGES.length; s++) {
        const p = res.stagePowers[s];
        if (p !== null) {
          stageStats[s].cleared++;
          stageStats[s].clearPowerSum += p;
          stageStats[s].clearTierSum += tierForPower(p).id;
          stageStats[s].clearPowers.push(p);
        }
      }
      if (res.victory) {
        victories++;
        finalPowerSum += res.finalPower;
        finalTierSum += tierForPower(res.finalPower).id;
      }
    }

    console.log(`\n[정책: ${policy}]`);
    console.log(
      pad('스테이지', 18) +
        padL('시도', 6) +
        padL('클리어%', 9) +
        padL('중앙값전력', 14) +
        padL('평균전력', 14) +
        padL('평균티어', 9) +
        padL('이곳사망', 9),
    );
    STAGES.forEach((stage, idx) => {
      const st = stageStats[idx];
      const clearRate = st.attempts > 0 ? ((st.cleared / st.attempts) * 100).toFixed(1) : '-';
      const avgPower = st.cleared > 0 ? formatPower(st.clearPowerSum / st.cleared) : '-';
      const medPower = st.cleared > 0 ? formatPower(median(st.clearPowers)) : '-';
      const avgTier = st.cleared > 0 ? (st.clearTierSum / st.cleared).toFixed(1) : '-';
      console.log(
        pad(`${idx + 1}. ${stage.biomeName}`, 18) +
          padL(String(st.attempts), 6) +
          padL(clearRate, 9) +
          padL(medPower, 14) +
          padL(avgPower, 14) +
          padL(avgTier, 9) +
          padL(String(st.deathsHere), 9),
      );
    });

    const victoryRate = ((victories / TRIALS_PER_POLICY) * 100).toFixed(1);
    const avgFinalPower = victories > 0 ? formatPower(finalPowerSum / victories) : '-';
    const avgFinalTier = victories > 0 ? (finalTierSum / victories).toFixed(1) : '-';
    console.log(`  → 완주율: ${victoryRate}%  |  완주 시 평균 최종전력: ${avgFinalPower}  |  평균 최종티어: ${avgFinalTier}`);
  }

  console.log('\n' + '='.repeat(78));
  console.log(` 참고: 시작 전력=${BALANCE.startingPower}, 전체 스테이지 수=${STAGES.length}`);
  console.log('='.repeat(78));
}

main();
