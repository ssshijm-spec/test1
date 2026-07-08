/**
 * 적/장애물/보스 밸런스 설정.
 *
 * 모든 수치는 "그 시점의 기준 전력(reference power)"에 대한 배율(factor)로 정의된다.
 * 기준 전력은 stages.ts의 startReferencePower → endReferencePower를 로그 보간한 값으로,
 * "정석 플레이 시 이 지점에서 대략 이 정도 전력을 갖고 있을 것"이라는 기대치다.
 * 실제 전력은 플레이어의 선택에 따라 이보다 높거나 낮을 수 있으며, 그 편차가 곧 난이도 체감이다.
 */
export interface EnemyStageConfig {
  /** 약한 적(돌파 권장) 전력 = reference * factor */
  weakFactor: [number, number];
  /** 강한 적(회피 권장) 전력 = reference * factor */
  strongFactor: [number, number];
  /** 약한 적이 나올 확률 (나머지는 강한 적) */
  weakChance: number;
}

export interface TollgateStageConfig {
  divisorRange: [number, number];
  /** 나눗셈 대신 큰 퍼센트 감산이 나올 확률 */
  subChance: number;
  /** 현재 전력 대비 퍼센트(%) 손실. (기준 전력이 아닌, 트럭의 실제 전력에 비례 — 그래야 참조전력과
   *  실제 전력이 어긋나도 절대 전력이 음수로 폭주하는 버그가 생기지 않는다.) */
  subPercent: [number, number];
}

export interface BonusLaneStageConfig {
  multiplierRange: [number, number];
}

export interface BossStageConfig {
  /** 3페이즈 각각의 요구 전력 = reference(스테이지 종료 시점) * factor */
  phaseFactors: [number, number, number];
}

export const BARRICADE_DAMAGE_RATIO = 0.12;
export const NARROW_WALL_DAMAGE_RATIO = 0.18;

export const ENEMY_CONFIGS: readonly EnemyStageConfig[] = [
  { weakFactor: [0.5, 0.8], strongFactor: [1.3, 2.2], weakChance: 0.65 }, // Stage1 (거의 안 나오지만 대비)
  { weakFactor: [0.35, 0.7], strongFactor: [1.2, 2.0], weakChance: 0.6 }, // Stage2 — 신규 도입
  { weakFactor: [0.3, 0.65], strongFactor: [1.15, 1.9], weakChance: 0.55 }, // Stage3
  { weakFactor: [0.3, 0.6], strongFactor: [1.1, 1.8], weakChance: 0.55 }, // Stage4
  { weakFactor: [0.25, 0.55], strongFactor: [1.1, 1.9], weakChance: 0.5 }, // Stage5
  { weakFactor: [0.25, 0.5], strongFactor: [1.15, 2.0], weakChance: 0.45 }, // Stage6
  { weakFactor: [0.2, 0.5], strongFactor: [1.2, 2.2], weakChance: 0.4 }, // Stage7
];

export const TOLLGATE_CONFIGS: readonly TollgateStageConfig[] = [
  { divisorRange: [2, 2], subChance: 0.2, subPercent: [15, 25] },
  { divisorRange: [2, 2], subChance: 0.3, subPercent: [15, 30] },
  { divisorRange: [2, 3], subChance: 0.3, subPercent: [20, 35] },
  { divisorRange: [2, 3], subChance: 0.35, subPercent: [20, 35] },
  { divisorRange: [2, 3], subChance: 0.35, subPercent: [25, 40] },
  { divisorRange: [3, 4], subChance: 0.4, subPercent: [30, 45] },
  { divisorRange: [3, 4], subChance: 0.4, subPercent: [30, 45] },
];

export const BONUS_LANE_CONFIGS: readonly BonusLaneStageConfig[] = [
  { multiplierRange: [6, 10] },
  { multiplierRange: [8, 14] },
  { multiplierRange: [10, 18] },
  { multiplierRange: [12, 22] },
  { multiplierRange: [14, 26] },
  { multiplierRange: [16, 30] },
  { multiplierRange: [20, 36] },
];

/** 미니보스는 스테이지 5부터 등장(스테이지 구성표 참고) */
export const MINIBOSS_PHASE_FACTORS: readonly [number, number, number] = [0.32, 0.48, 0.62];

export const BOSS_CONFIGS: readonly BossStageConfig[] = [
  { phaseFactors: [0.02, 0.04, 0.06] }, // Stage1 보스 — 튜토리얼용, 하위 편차 판까지 거의 항상 돌파 가능해야 함
  { phaseFactors: [0.45, 0.65, 0.85] },
  { phaseFactors: [0.45, 0.65, 0.85] },
  { phaseFactors: [0.45, 0.68, 0.88] },
  { phaseFactors: [0.45, 0.68, 0.88] },
  { phaseFactors: [0.48, 0.7, 0.9] },
  { phaseFactors: [0.5, 0.72, 0.92] }, // Stage7 최종보스 — 가장 빡빡하게
];
