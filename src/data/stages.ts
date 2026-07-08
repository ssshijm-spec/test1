/**
 * 스테이지 시퀀싱 데이터. 각 스테이지는 "학습(warmup) → 조합(combo) → 보스(boss)"의 3막 구조로
 * 세그먼트를 절차적으로 배치한다 (systems/spawner.ts가 이 가중치를 읽어 실제 배치를 생성).
 */
export type SegmentType =
  | 'gate3'
  | 'barricade'
  | 'enemy'
  | 'tollgate'
  | 'narrow'
  | 'bonusLane'
  | 'miniboss'
  | 'boss'
  | 'breather';

export interface BiomePalette {
  sky: [string, string]; // 그라디언트 상/하
  ground: string;
  roadLine: string;
  farLayer: string;
  midLayer: string;
  /** 네온 사인/창문 액센트 2색 (픽셀 시티 배경용) */
  neon: [string, string];
}

export interface StageDef {
  id: number;
  biomeName: string;
  introLore: string;
  clearLore: string;
  newMechanicLabel: string;
  lengthSeconds: number;
  startReferencePower: number;
  endReferencePower: number;
  scrollSpeed: number;
  availableSegments: SegmentType[];
  segmentWeights: Partial<Record<SegmentType, number>>;
  hasMiniboss: boolean;
  bossName: string;
  bossLore: string;
  palette: BiomePalette;
}

export const STAGES: readonly StageDef[] = [
  {
    id: 0,
    biomeName: '폐차장 초입',
    introLore: '녹슨 손수레 하나. 시동 대신 근성을 걸고 첫 바퀴를 굴린다.',
    clearLore: '고철 더미를 벗어나자, 저 멀리 국도가 보이기 시작했다.',
    newMechanicLabel: '산술 게이트',
    lengthSeconds: 32,
    startReferencePower: 5,
    endReferencePower: 18_300,
    scrollSpeed: 300,
    availableSegments: ['gate3', 'barricade', 'breather'],
    segmentWeights: { gate3: 64, barricade: 8, breather: 28 },
    hasMiniboss: false,
    bossName: '고철 파수꾼',
    bossLore: '폐차장의 마지막 문지기. 녹슬었지만 자리는 지킨다.',
    palette: {
      sky: ['#1a0f2e', '#3d2a4d'],
      ground: '#160f22',
      roadLine: '#ffb347',
      farLayer: '#2a1c3d',
      midLayer: '#3d2a52',
      neon: ['#ffb347', '#ff5c8a'],
    },
  },
  {
    id: 1,
    biomeName: '교외 국도',
    introLore: '이제 진짜 도로다. 마주 오는 차들도 나름의 전력을 갖고 있다.',
    clearLore: '국도의 차들을 모두 제치고, 공단의 굴뚝이 보이는 곳까지 왔다.',
    newMechanicLabel: '적 차량(숫자 대결)',
    lengthSeconds: 34,
    startReferencePower: 18_300,
    endReferencePower: 52_700_000,
    scrollSpeed: 330,
    availableSegments: ['gate3', 'barricade', 'enemy', 'breather'],
    segmentWeights: { gate3: 45, barricade: 15, enemy: 25, breather: 15 },
    hasMiniboss: false,
    bossName: '국도의 폭주족 두목',
    bossLore: '이 국도에서는 내가 제일 빠르다고 믿는 남자.',
    palette: {
      sky: ['#0d1a33', '#1c3a5c'],
      ground: '#0a1420',
      roadLine: '#5fe0ff',
      farLayer: '#16283f',
      midLayer: '#20405c',
      neon: ['#5fe0ff', '#ffd23d'],
    },
  },
  {
    id: 2,
    biomeName: '산업 단지',
    introLore: '통행세를 걷는 톨게이트. 통과하려면 대가가 따른다.',
    clearLore: '공단의 매연을 뚫고, 지평선 너머 사막의 열기가 느껴진다.',
    newMechanicLabel: '톨게이트 & 좁은 통로',
    lengthSeconds: 36,
    startReferencePower: 52_700_000,
    endReferencePower: 12_300_000_000,
    scrollSpeed: 355,
    availableSegments: ['gate3', 'barricade', 'enemy', 'tollgate', 'narrow', 'breather'],
    segmentWeights: { gate3: 35, barricade: 12, enemy: 20, tollgate: 15, narrow: 13, breather: 5 },
    hasMiniboss: false,
    bossName: '통행세 징수관',
    bossLore: '이 구역을 지나려면 전력으로 증명해야 한다.',
    palette: {
      sky: ['#0d1f1f', '#1c3d3a'],
      ground: '#0a1616',
      roadLine: '#4dffce',
      farLayer: '#153330',
      midLayer: '#1e4d42',
      neon: ['#4dffce', '#ff8a3d'],
    },
  },
  {
    id: 3,
    biomeName: '사막 하이웨이',
    introLore: '갓길 너머 반짝이는 보너스 레인. 들어가면 돌아올 수 없다.',
    clearLore: '사막을 벗어나자 도심의 불빛과 소음이 밀려온다.',
    newMechanicLabel: '보너스 레인(고위험 고보상)',
    lengthSeconds: 38,
    startReferencePower: 12_300_000_000,
    endReferencePower: 3.31e15,
    scrollSpeed: 380,
    availableSegments: ['gate3', 'barricade', 'enemy', 'tollgate', 'narrow', 'bonusLane', 'breather'],
    segmentWeights: {
      gate3: 32,
      barricade: 10,
      enemy: 18,
      tollgate: 14,
      narrow: 12,
      bonusLane: 6,
      breather: 8,
    },
    hasMiniboss: false,
    bossName: '사막의 폭주 트레일러',
    bossLore: '모래바람 속에서도 흔들림 없이 질주하는 거구.',
    palette: {
      sky: ['#1c0d33', '#ff5c8a'],
      ground: '#1a0d2e',
      roadLine: '#ffd23d',
      farLayer: '#3d1a52',
      midLayer: '#5c2478',
      neon: ['#ff5c8a', '#5fe0ff'],
    },
  },
  {
    id: 4,
    biomeName: '도심 러시아워',
    introLore: '밀집한 교통, 그리고 초입을 지키는 미니보스.',
    clearLore: '도심을 뚫고 나오자 차가운 바람이 불어온다.',
    newMechanicLabel: '미니보스 & 밀집 교통',
    lengthSeconds: 42,
    startReferencePower: 3.31e15,
    endReferencePower: 1.87e21,
    scrollSpeed: 400,
    availableSegments: [
      'gate3',
      'barricade',
      'enemy',
      'tollgate',
      'narrow',
      'bonusLane',
      'miniboss',
      'breather',
    ],
    segmentWeights: {
      gate3: 28,
      barricade: 8,
      enemy: 24,
      tollgate: 13,
      narrow: 12,
      bonusLane: 6,
      breather: 9,
    },
    hasMiniboss: true,
    bossName: '러시아워의 폭군',
    bossLore: '도심 교통을 지배하는 검은 세단. 신호는 무시한다.',
    palette: {
      sky: ['#0d0d2e', '#2a1a5c'],
      ground: '#0a0a1f',
      roadLine: '#5fe0ff',
      farLayer: '#1a1a47',
      midLayer: '#2e2470',
      neon: ['#ff3d94', '#5fe0ff'],
    },
  },
  {
    id: 5,
    biomeName: '극한 설원',
    introLore: '눈보라 속 큰 낙폭의 함정들. 강등의 위험이 도사린다.',
    clearLore: '설원 끝, 지평선이 붉게 물든 마지막 고속도로가 보인다.',
    newMechanicLabel: '큰 낙폭 함정(디볼브 리스크)',
    lengthSeconds: 44,
    startReferencePower: 1.87e21,
    endReferencePower: 2.11e27,
    scrollSpeed: 420,
    availableSegments: [
      'gate3',
      'barricade',
      'enemy',
      'tollgate',
      'narrow',
      'bonusLane',
      'miniboss',
      'breather',
    ],
    segmentWeights: {
      gate3: 28,
      barricade: 8,
      enemy: 22,
      tollgate: 16,
      narrow: 12,
      bonusLane: 6,
      breather: 8,
    },
    hasMiniboss: true,
    bossName: '빙하의 파괴자',
    bossLore: '얼어붙은 강철 그 자체. 부딪히는 모든 것을 부순다.',
    palette: {
      sky: ['#0d1f33', '#2a5c7a'],
      ground: '#16303d',
      roadLine: '#aef0ff',
      farLayer: '#1c3d52',
      midLayer: '#2a5c78',
      neon: ['#aef0ff', '#5f8fff'],
    },
  },
  {
    id: 6,
    biomeName: '오버드라이브 하이웨이',
    introLore: '모든 메커닉이 뒤섞인 마지막 질주. 전설이 되거나, 멈추거나.',
    clearLore: '전력계가 터질 듯 빛나며, 트럭은 마침내 전설이 되었다.',
    newMechanicLabel: '전 메커닉 결합 + 최종 보스',
    lengthSeconds: 50,
    startReferencePower: 2.11e27,
    endReferencePower: 1.22e36,
    scrollSpeed: 440,
    availableSegments: [
      'gate3',
      'barricade',
      'enemy',
      'tollgate',
      'narrow',
      'bonusLane',
      'miniboss',
      'breather',
    ],
    segmentWeights: {
      gate3: 26,
      barricade: 7,
      enemy: 22,
      tollgate: 16,
      narrow: 13,
      bonusLane: 7,
      breather: 9,
    },
    hasMiniboss: true,
    bossName: '오버드라이브 코어',
    bossLore: '도로의 끝에서 기다리는 존재. 숫자로 이루어진 최후의 벽.',
    palette: {
      sky: ['#0d0524', '#5c1a8f'],
      ground: '#0a0418',
      roadLine: '#ff5fd6',
      farLayer: '#1e0d3d',
      midLayer: '#3d1a6b',
      neon: ['#ff5fd6', '#5fe0ff'],
    },
  },
];

/** stage 진행도(0~1)에 따른 로그 보간 기준 전력 */
export function referencePowerAt(stage: StageDef, progress01: number): number {
  const p = Math.min(Math.max(progress01, 0), 1);
  const logStart = Math.log10(stage.startReferencePower);
  const logEnd = Math.log10(stage.endReferencePower);
  return Math.pow(10, logStart + (logEnd - logStart) * p);
}
