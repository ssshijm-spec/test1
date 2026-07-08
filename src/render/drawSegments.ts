import { formatDivisor, formatMultiplier, formatPower } from '../core/number';
import { GateSpec, TrackSegment } from '../entities/segment';
import { MAX_DRAW_DISTANCE, projectTrackPoint, TRACK_WIDTH, VANISH_X } from './layout';

/**
 * 세그먼트는 두 레이어로 나눠 그린다:
 * - 'shape': 박스/벽/차량 등 도형 — 저해상도 픽셀 버퍼에 그려 레트로 도트 룩.
 * - 'label': 게이트 배수/전력 숫자/보스 요구치 등 텍스트 — 풀 해상도 캔버스에 선명하게.
 * 이렇게 분리해 "픽셀 패널 위에 또렷한 글자"를 만들어 가독성을 확보한다.
 */
export type SegmentLayer = 'shape' | 'label';

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

function gateBox(ctx: CanvasRenderingContext2D, lane: number, d: number, color: string) {
  const { x, y, scale } = projectTrackPoint(lane, d);
  const w = (TRACK_WIDTH / 3 - 10) * scale;
  const h = 56 * scale;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.42 * scale;
  ctx.fillStyle = color + '33';
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, 3 * scale);
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

function gateText(ctx: CanvasRenderingContext2D, lane: number, d: number, color: string, label: string) {
  const { x, y, scale } = projectTrackPoint(lane, d);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  // 텍스트 크기 하한을 키워(11px) 먼 게이트도 읽히게. 풀 해상도라 선명하다.
  ctx.font = `bold ${Math.max(11, 21 * scale)}px "Segoe UI", "Malgun Gothic", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(label, x, y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillText(label, x, y);
  ctx.restore();
}

function drawWall(ctx: CanvasRenderingContext2D, lane: number, d: number, color: string) {
  const { x, y, scale } = projectTrackPoint(lane, d);
  const w = (TRACK_WIDTH / 3 - 6) * scale;
  const h = 48 * scale;
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = Math.max(1, 2 * scale);
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y + (i * h) / 5);
    ctx.lineTo(x + w / 2, y + (i * h) / 5);
    ctx.stroke();
  }
  ctx.restore();
}

function enemyBox(ctx: CanvasRenderingContext2D, lane: number, d: number) {
  const { x, y, scale } = projectTrackPoint(lane, d);
  ctx.save();
  ctx.fillStyle = '#c0392b';
  const w = TRACK_WIDTH * 0.18 * scale;
  const h = 46 * scale;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 8 * scale);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.stroke();
  ctx.restore();
}

function enemyText(ctx: CanvasRenderingContext2D, lane: number, d: number, power: number) {
  const { x, y, scale } = projectTrackPoint(lane, d);
  const h = 46 * scale;
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(11, 16 * scale)}px "Segoe UI", "Malgun Gothic", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  const ty = y - h / 2 - 10 * scale;
  ctx.strokeText(formatPower(power), x, ty);
  ctx.fillText(formatPower(power), x, ty);
  ctx.restore();
}

function barBox(ctx: CanvasRenderingContext2D, d: number, color: string) {
  const { y, scale } = projectTrackPoint(1, d);
  const w = TRACK_WIDTH * scale;
  const h = 52 * scale;
  const x = VANISH_X;
  ctx.save();
  ctx.globalAlpha = 0.5 + 0.4 * scale;
  ctx.fillStyle = color + '3d';
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, 3 * scale);
  ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.restore();
}

function barText(ctx: CanvasRenderingContext2D, d: number, color: string, label: string, sub?: string) {
  const { y, scale } = projectTrackPoint(1, d);
  const x = VANISH_X;
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.font = `bold ${Math.max(12, 19 * scale)}px "Segoe UI", "Malgun Gothic", sans-serif`;
  const yTop = sub ? y - 9 * scale : y;
  ctx.strokeText(label, x, yTop);
  ctx.fillText(label, x, yTop);
  if (sub) {
    ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.max(10, 13 * scale)}px "Segoe UI", "Malgun Gothic", sans-serif`;
    ctx.strokeText(sub, x, y + 13 * scale);
    ctx.fillText(sub, x, y + 13 * scale);
  }
  ctx.restore();
}

function drawSegmentLayer(ctx: CanvasRenderingContext2D, segment: TrackSegment, truckDistance: number, layer: SegmentLayer) {
  const d = segment.z - truckDistance;
  if (d < -40 || d > MAX_DRAW_DISTANCE) return;
  const shape = layer === 'shape';

  switch (segment.kind) {
    case 'gate3':
      for (let lane = 0; lane < 3; lane++) {
        const spec = segment.gates[lane];
        if (shape) gateBox(ctx, lane, d, gateColor(spec.op));
        else gateText(ctx, lane, d, gateColor(spec.op), gateLabel(spec));
      }
      break;
    case 'barricade':
      if (shape) for (let lane = 0; lane < 3; lane++) if (segment.blockedLanes[lane]) drawWall(ctx, lane, d, '#b0503a');
      break;
    case 'enemy':
      for (let lane = 0; lane < 3; lane++) {
        const p = segment.lanePower[lane];
        if (p === null) continue;
        if (shape) enemyBox(ctx, lane, d);
        else enemyText(ctx, lane, d, p);
      }
      break;
    case 'tollgate': {
      if (shape) barBox(ctx, d, '#ff4d4d');
      else {
        const label = segment.op.type === 'div' ? `통행세 ${formatDivisor(segment.op.value)}` : `통행세 -${segment.op.value}%`;
        barText(ctx, d, '#ff4d4d', '⚠ 톨게이트', label);
      }
      break;
    }
    case 'narrow':
      if (shape) for (let lane = 0; lane < 3; lane++) if (lane !== segment.openLane) drawWall(ctx, lane, d, '#7a8a99');
      break;
    case 'bonusLane':
      for (let lane = 0; lane < 3; lane++) {
        if (lane === segment.bonusLane) {
          if (shape) gateBox(ctx, lane, d, '#ffd23d');
          else gateText(ctx, lane, d, '#ffd23d', `JACKPOT ${formatMultiplier(segment.multiplier)}`);
        } else {
          const trap = segment.trapOps[lane];
          if (!trap) continue;
          if (shape) gateBox(ctx, lane, d, '#ff4d4d');
          else gateText(ctx, lane, d, '#ff4d4d', gateLabel(trap));
        }
      }
      break;
    case 'bossGate': {
      if (shape) barBox(ctx, d, segment.isMiniboss ? '#ff8a5c' : '#ff4d9e');
      else {
        const label = segment.isMiniboss
          ? `미니보스 ${segment.phaseIndex + 1}/${segment.totalPhases}`
          : `${segment.bossName} ${segment.phaseIndex + 1}/${segment.totalPhases}`;
        barText(ctx, d, segment.isMiniboss ? '#ff8a5c' : '#ff4d9e', label, `요구 전력 ${formatPower(segment.threshold)} 이상`);
      }
      break;
    }
    case 'breather':
      break;
  }
}

export function drawAllSegments(
  ctx: CanvasRenderingContext2D,
  segments: readonly TrackSegment[],
  truckDistance: number,
  layer: SegmentLayer,
) {
  // 먼 것부터 그려야 가까운(큰) 오브젝트가 자연스럽게 위에 겹쳐 보인다.
  const visible = segments.filter((s) => !s.resolved);
  for (let i = visible.length - 1; i >= 0; i--) {
    drawSegmentLayer(ctx, visible[i], truckDistance, layer);
  }
}
