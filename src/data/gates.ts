/**
 * 스테이지별 산술 게이트(3지선다) 값 분포.
 *
 * 설계 의도:
 * - mul(×)이 성장의 주 동력이자 가장 "짜릿한" 선택이 되도록 항상 가장 높은 값 배수를 준다.
 * - add(+)/sub(−)는 고정값이 아니라 "현재 전력 대비 퍼센트"다 (예: value=20 → 전력의 +20%/−20%).
 *   이렇게 해야 안전 위주 플레이(add만 선택)도 스테이지 후반까지 나름의 곱셈적 성장을 유지해
 *   "안전 정책은 항상 곱셈 정책의 70~90% 수준"이라는 밸런스 목표(§9)를 만족시킬 수 있다.
 *   (고정값이었다면 후반부에 add가 완전히 무의미해져 안전 정책이 조기에 전멸했다 — 시뮬레이션으로 확인된 문제.)
 * - div(÷)는 항상 함정으로만 존재(2 이상의 정수), sub(−)도 함정(퍼센트 손실이라 한방에 죽지는 않는다).
 * - 스테이지가 오를수록 mul 배수, add/sub 퍼센트 폭, div 강도가 함께 커져 판단의 긴장감이 유지된다.
 */
export interface GateStageConfig {
  /** 3레인 각각의 연산을 뽑을 때의 상대 가중치 */
  opWeights: { add: number; sub: number; mul: number; div: number };
  /** 현재 전력 대비 퍼센트(%). 예: [15, 40] → +15%~+40% */
  addRange: [number, number];
  /** 현재 전력 대비 퍼센트(%) 손실. 예: [8, 20] → -8%~-20% */
  subRange: [number, number];
  mulRange: [number, number];
  divRange: [number, number]; // 2 이상
}

export const GATE_CONFIGS: readonly GateStageConfig[] = [
  // Stage 1 — 폐차장 초입 (튜토리얼). 거의 항상 클리어 가능해야 하는 학습 구간이라 관대하게.
  {
    opWeights: { add: 35, sub: 10, mul: 45, div: 10 },
    addRange: [15, 40],
    subRange: [8, 20],
    mulRange: [2, 3],
    divRange: [2, 2],
  },
  // Stage 2 — 교외 국도
  {
    opWeights: { add: 38, sub: 16, mul: 26, div: 20 },
    addRange: [18, 45],
    subRange: [10, 24],
    mulRange: [2, 4],
    divRange: [2, 2],
  },
  // Stage 3 — 산업 단지
  {
    opWeights: { add: 32, sub: 17, mul: 27, div: 24 },
    addRange: [20, 48],
    subRange: [12, 27],
    mulRange: [2, 4],
    divRange: [2, 3],
  },
  // Stage 4 — 사막 하이웨이
  {
    opWeights: { add: 28, sub: 17, mul: 29, div: 26 },
    addRange: [22, 52],
    subRange: [14, 29],
    mulRange: [3, 5],
    divRange: [2, 3],
  },
  // Stage 5 — 도심 러시아워
  {
    opWeights: { add: 22, sub: 20, mul: 30, div: 28 },
    addRange: [24, 55],
    subRange: [16, 31],
    mulRange: [3, 5],
    divRange: [2, 4],
  },
  // Stage 6 — 극한 설원 (디볼브 리스크 스테이지 — sub 비중/크기 상향)
  {
    opWeights: { add: 16, sub: 26, mul: 30, div: 28 },
    addRange: [26, 58],
    subRange: [18, 34],
    mulRange: [3, 6],
    divRange: [3, 5],
  },
  // Stage 7 — 오버드라이브 하이웨이 (최종)
  {
    opWeights: { add: 14, sub: 22, mul: 34, div: 30 },
    addRange: [28, 62],
    subRange: [20, 37],
    mulRange: [3, 7],
    divRange: [3, 6],
  },
];
