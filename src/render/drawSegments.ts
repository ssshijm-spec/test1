import { formatDivisor, formatMultiplier, formatPower } from '../core/number';
import { GateSpec, TrackSegment } from '../entities/segment';
import { MAX_DRAW_DISTANCE, projectTrackPoint, TRACK_WIDTH, VANISH_X } from './layout';

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

/** 원근 축척(scale)에 맞춰 패널을 그린다 — 멀수록 작고 흐릿하게, 가까울수록 크고 또렷하게. */
function drawGatePanel(ctx: CanvasRenderingContext2D, lane: number, d: number, color: string, label: string) {
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

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(8, 20 * scale)}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 8 * scale;
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

function drawEnemyCar(ctx: CanvasRenderingContext2D, lane: number, d: number, power: number) {
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

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(8, 15 * scale)}px "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 4 * scale;
  ctx.fillText(formatPower(power), x, y - h / 2 - 10 * scale);
  ctx.restore();
}

function drawFullWidthBar(ctx: CanvasRenderingContext2D, d: number, color: string, label: string, sub?: string) {
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

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 8 * scale;
  ctx.font = `bold ${Math.max(8, 18 * scale)}px "Segoe UI", sans-serif`;
  ctx.fillText(label, x, sub ? y - 9 * scale : y);
  if (sub) {
    ctx.font = `${Math.max(7, 12 * scale)}px "Segoe UI", sans-serif`;
    ctx.fillText(sub, x, y + 13 * scale);
  }
  ctx.restore();
}

export function drawSegment(ctx: CanvasRenderingContext2D, segment: TrackSegment, truckDistance: number) {
  const d = segment.z - truckDistance;
  if (d < -40 || d > MAX_DRAW_DISTANCE) return;

  switch (segment.kind) {
    case 'gate3':
      for (let lane = 0; lane < 3; lane++) {
        const spec = segment.gates[lane];
        drawGatePanel(ctx, lane, d, gateColor(spec.op), gateLabel(spec));
      }
      break;
    case 'barricade':
      for (let lane = 0; lane < 3; lane++) {
        if (segment.blockedLanes[lane]) drawWall(ctx, lane, d, '#b0503a');
      }
      break;
    case 'enemy':
      for (let lane = 0; lane < 3; lane++) {
        const p = segment.lanePower[lane];
        if (p !== null) drawEnemyCar(ctx, lane, d, p);
      }
      break;
    case 'tollgate': {
      const label = segment.op.type === 'div' ? `통행세 ${formatDivisor(segment.op.value)}` : `통행세 -${segment.op.value}%`;
      drawFullWidthBar(ctx, d, '#ff4d4d', '⚠ 톨게이트', label);
      break;
    }
    case 'narrow':
      for (let lane = 0; lane < 3; lane++) {
        if (lane !== segment.openLane) drawWall(ctx, lane, d, '#7a8a99');
      }
      break;
    case 'bonusLane':
      for (let lane = 0; lane < 3; lane++) {
        if (lane === segment.bonusLane) {
          drawGatePanel(ctx, lane, d, '#ffd23d', `JACKPOT ${formatMultiplier(segment.multiplier)}`);
        } else {
          const trap = segment.trapOps[lane];
          if (trap) drawGatePanel(ctx, lane, d, '#ff4d4d', gateLabel(trap));
        }
      }
      break;
    case 'bossGate': {
      const label = segment.isMiniboss
        ? `미니보스 ${segment.phaseIndex + 1}/${segment.totalPhases}`
        : `${segment.bossName} ${segment.phaseIndex + 1}/${segment.totalPhases}`;
      drawFullWidthBar(ctx, d, segment.isMiniboss ? '#ff8a5c' : '#ff4d9e', label, `요구 전력 ${formatPower(segment.threshold)} 이상`);
      break;
    }
    case 'breather':
      break;
  }
}

export function drawAllSegments(ctx: CanvasRenderingContext2D, segments: readonly TrackSegment[], truckDistance: number) {
  // 먼 것부터 그려야 가까운(큰) 오브젝트가 자연스럽게 위에 겹쳐 보인다.
  const visible = segments.filter((s) => !s.resolved);
  for (let i = visible.length - 1; i >= 0; i--) {
    drawSegment(ctx, visible[i], truckDistance);
  }
}
