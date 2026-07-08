import { SegmentType } from '../data/stages';

export interface GateSpec {
  op: 'add' | 'sub' | 'mul' | 'div';
  value: number;
}

interface BaseSegment {
  z: number; // world distance(전방 거리) — truck.distance가 이 값에 도달하면 트리거
  resolved: boolean;
}

export interface Gate3Segment extends BaseSegment {
  kind: 'gate3';
  gates: [GateSpec, GateSpec, GateSpec];
}

export interface BarricadeSegment extends BaseSegment {
  kind: 'barricade';
  blockedLanes: [boolean, boolean, boolean];
}

export interface EnemySegment extends BaseSegment {
  kind: 'enemy';
  lanePower: [number | null, number | null, number | null];
}

export interface TollgateSegment extends BaseSegment {
  kind: 'tollgate';
  op: { type: 'div' | 'sub'; value: number };
}

export interface NarrowSegment extends BaseSegment {
  kind: 'narrow';
  openLane: 0 | 1 | 2;
}

export interface BonusLaneSegment extends BaseSegment {
  kind: 'bonusLane';
  bonusLane: 0 | 1 | 2;
  multiplier: number;
  trapOps: [GateSpec | null, GateSpec | null, GateSpec | null]; // bonusLane 인덱스는 null
}

export interface BossGateSegment extends BaseSegment {
  kind: 'bossGate';
  isMiniboss: boolean;
  bossName: string;
  phaseIndex: number; // 0-based
  totalPhases: number;
  threshold: number;
}

export interface BreatherSegment extends BaseSegment {
  kind: 'breather';
}

export type TrackSegment =
  | Gate3Segment
  | BarricadeSegment
  | EnemySegment
  | TollgateSegment
  | NarrowSegment
  | BonusLaneSegment
  | BossGateSegment
  | BreatherSegment;

export function segmentKindLabel(kind: SegmentType): string {
  switch (kind) {
    case 'gate3':
      return '산술 게이트';
    case 'barricade':
      return '바리케이드';
    case 'enemy':
      return '적 차량';
    case 'tollgate':
      return '톨게이트';
    case 'narrow':
      return '좁은 통로';
    case 'bonusLane':
      return '보너스 레인';
    case 'miniboss':
      return '미니보스';
    case 'boss':
      return '보스';
    case 'breather':
      return '';
  }
}
