/**
 * 전역 밸런스/물리 상수. 여기 숫자만 바꿔도 게임 전체의 체감 속도/난이도가 바뀐다.
 */
export const BALANCE = {
  /** 시작 전력 */
  startingPower: 5,

  /** 레인 개수 (좌/중/우) */
  laneCount: 3,

  /** 레인 변경 시 좌우 보간 속도 (lane/sec 환산 느낌의 lerp 계수) */
  laneLerpSpeed: 14,

  /** 세그먼트(게이트/장애물 한 묶음) 간 world 거리 */
  segmentSpacing: 420,

  /** 바리케이드가 깎는 비율 (전력의 %) */
  barricadeDamageRatio: 0.12,

  /** 전력이 이 값 이하로 떨어지면 게임 오버 */
  minSurvivablePower: 1,

  /** 히트스톱 지속시간(ms) 종류별 */
  hitStopEnemy: 60,
  hitStopEvolve: 140,
  hitStopBoss: 220,
  hitStopDevolve: 40,

  /** 진화 연출 슬로우모 배속과 지속시간(ms) */
  evolveSlowMoScale: 0.32,
  evolveSlowMoDuration: 420,

  /** 카메라 쉐이크 강도 기본값 (px) */
  shakeGate: 2,
  shakeEnemyKill: 6,
  shakeBarricade: 5,
  shakeEvolve: 10,
  shakeDevolve: 4,
  shakeBossHit: 14,
  shakeGameOver: 16,
} as const;

/** 캔버스 논리 해상도 (세로 모바일 기준, 실제 표시는 CSS로 스케일) */
export const VIEWPORT = {
  width: 480,
  height: 854,
} as const;
