import { BALANCE, VIEWPORT } from '../data/balance';

/**
 * 3인칭 하이퍼캐주얼 런 "백뷰" 카메라 — 도로가 화면 위쪽 소실점(VANISH_X, HORIZON_Y)으로 수렴하는
 * 원근 투영. 트럭은 항상 카메라 바로 앞(거리 0)에 위치해 화면 하단에 크게 보이고, 게이트/장애물은
 * 멀리 있을수록 소실점 쪽으로 작게 뭉쳤다가 트럭에 가까워질수록 빠르게 커지며 다가온다.
 */
export const TRACK_MARGIN = 18;
export const TRACK_WIDTH = VIEWPORT.width - TRACK_MARGIN * 2; // 카메라(거리 0)에서의 도로 폭
export const LANE_WIDTH = TRACK_WIDTH / BALANCE.laneCount; // 카메라 기준 레인 폭 (트럭 위치 계산용)

export const HORIZON_Y = VIEWPORT.height * 0.22;
export const TRUCK_SCREEN_Y = VIEWPORT.height * 0.8;
export const VANISH_X = VIEWPORT.width / 2;

/** 원근감의 "급격함"을 조절하는 초점 거리. 작을수록 앞이 확 커지고 뒤가 확 뭉치는 극적인 원근이 된다. */
const FOCAL = 340;

/** 이 거리보다 먼 세그먼트는 소실점에 뭉개져 그릴 필요가 없다. */
export const MAX_DRAW_DISTANCE = 3400;

/** 거리(d, world unit)에 따른 원근 축척(0~1). d=0(카메라 바로 앞)일 때 1, 멀어질수록 0에 수렴. */
export function perspectiveScale(d: number): number {
  const dist = Math.max(0, d);
  return FOCAL / (FOCAL + dist);
}

function laneOffsetAtCamera(lane: number): number {
  return LANE_WIDTH * (lane + 0.5) - TRACK_WIDTH / 2;
}

/** 레인의 화면 x좌표. distanceAhead(월드 거리)가 클수록 소실점(VANISH_X)에 가까워진다. */
export function laneCenterX(lane: number, distanceAhead = 0): number {
  return VANISH_X + laneOffsetAtCamera(lane) * perspectiveScale(distanceAhead);
}

/** world distance(z) -> 화면 y좌표 (원근 투영). */
export function worldZToScreenY(z: number, truckDistance: number): number {
  const d = z - truckDistance;
  return HORIZON_Y + (TRUCK_SCREEN_Y - HORIZON_Y) * perspectiveScale(d);
}

/** 트랙 위 한 지점(레인, 트럭 기준 전방 거리)의 화면 좌표와 원근 축척을 한번에 계산. */
export function projectTrackPoint(lane: number, distanceAhead: number) {
  const scale = perspectiveScale(distanceAhead);
  return {
    x: VANISH_X + laneOffsetAtCamera(lane) * scale,
    y: HORIZON_Y + (TRUCK_SCREEN_Y - HORIZON_Y) * scale,
    scale,
  };
}

export function clampLaneIndex(lane: number): number {
  return Math.min(BALANCE.laneCount - 1, Math.max(0, Math.round(lane)));
}
