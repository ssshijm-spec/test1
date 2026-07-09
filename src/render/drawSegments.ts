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

/** 라바콘 하나(밑변 기준점 bx,by). 주황 원뿔 + 흰 반사 밴드 + 베이스. */
function drawCone(ctx: CanvasRenderingContext2D, bx: number, by: number, s: number) {
  const h = 34 * s;
  const bw = 22 * s;
  // 베이스 슬래브
  ctx.fillStyle = '#141018';
  ctx.beginPath();
  ctx.ellipse(bx, by, bw * 0.55, bw * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#12223a';
  ctx.fillRect(bx - bw * 0.5, by - 2 * s, bw, 3 * s);
  // 원뿔 몸통(사다리꼴)
  ctx.fillStyle = '#ff6a1a';
  ctx.beginPath();
  ctx.moveTo(bx - bw * 0.42, by);
  ctx.lineTo(bx + bw * 0.42, by);
  ctx.lineTo(bx + bw * 0.1, by - h);
  ctx.lineTo(bx - bw * 0.1, by - h);
  ctx.closePath();
  ctx.fill();
  // 밝은 좌측 하이라이트
  ctx.fillStyle = '#ff8c42';
  ctx.beginPath();
  ctx.moveTo(bx - bw * 0.42, by);
  ctx.lineTo(bx - bw * 0.16, by);
  ctx.lineTo(bx - bw * 0.02, by - h);
  ctx.lineTo(bx - bw * 0.1, by - h);
  ctx.closePath();
  ctx.fill();
  // 흰 반사 밴드 2개
  ctx.fillStyle = '#f4f4ee';
  ctx.beginPath();
  ctx.moveTo(bx - bw * 0.32, by - h * 0.32);
  ctx.lineTo(bx + bw * 0.32, by - h * 0.32);
  ctx.lineTo(bx + bw * 0.26, by - h * 0.5);
  ctx.lineTo(bx - bw * 0.26, by - h * 0.5);
  ctx.closePath();
  ctx.fill();
  // 꼭대기
  ctx.fillStyle = '#ff6a1a';
  ctx.fillRect(bx - bw * 0.1, by - h - 2 * s, bw * 0.2, 3 * s);
}

/** 막힌 레인의 라바콘 클러스터(2~3개). */
function drawCones(ctx: CanvasRenderingContext2D, lane: number, d: number) {
  const { x, y, scale } = projectTrackPoint(lane, d);
  const spread = (TRACK_WIDTH / 3) * 0.28 * scale;
  drawCone(ctx, x - spread, y + 6 * scale, scale);
  drawCone(ctx, x + spread, y + 6 * scale, scale);
  drawCone(ctx, x, y - 5 * scale, scale * 0.92);
}

/** 진입금지 바리어 — 두 기둥 위 빨강/흰 스트라이프 보드 + 상단 금지 표지판. 이동 불가 장애물. */
function drawBarrier(ctx: CanvasRenderingContext2D, lane: number, d: number) {
  const { x, y, scale } = projectTrackPoint(lane, d);
  const w = (TRACK_WIDTH / 3 - 8) * scale;
  const boardH = 16 * scale;
  const boardY = y - 4 * scale;
  const legH = 26 * scale;
  // 기둥
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(x - w * 0.42, boardY, 4 * scale, legH);
  ctx.fillRect(x + w * 0.42 - 4 * scale, boardY, 4 * scale, legH);
  // 보드 배경
  ctx.fillStyle = '#f4f4ee';
  ctx.fillRect(x - w / 2, boardY - boardH, w, boardH);
  // 빨강 대각 스트라이프
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - w / 2, boardY - boardH, w, boardH);
  ctx.clip();
  ctx.fillStyle = '#e5352b';
  const stripe = 10 * scale;
  for (let sx = x - w / 2 - boardH; sx < x + w / 2; sx += stripe * 2) {
    ctx.beginPath();
    ctx.moveTo(sx, boardY);
    ctx.lineTo(sx + stripe, boardY);
    ctx.lineTo(sx + stripe + boardH, boardY - boardH);
    ctx.lineTo(sx + boardH, boardY - boardH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#1a1a22';
  ctx.lineWidth = Math.max(1, 1.5 * scale);
  ctx.strokeRect(x - w / 2, boardY - boardH, w, boardH);
  // 상단 진입금지 표지판(빨강 원 + 흰 가로바)
  const r = 9 * scale;
  const signY = boardY - boardH - r - 3 * scale;
  ctx.fillStyle = '#e5352b';
  ctx.beginPath();
  ctx.arc(x, signY, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f4ee';
  ctx.fillRect(x - r * 0.62, signY - r * 0.22, r * 1.24, r * 0.44);
}

/** 뒤에서 본 적 차량(느리게 달리는 차) — 숫자 대결 상대. 위 숫자는 라벨 레이어에서. */
function enemyCar(ctx: CanvasRenderingContext2D, lane: number, d: number) {
  const { x, y, scale } = projectTrackPoint(lane, d);
  const w = TRACK_WIDTH * 0.2 * scale;
  const h = 44 * scale;
  const top = y - h / 2;
  const bot = y + h / 2;
  // 몸체(위 좁고 아래 넓은 자동차 실루엣)
  ctx.fillStyle = '#b0332a';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.32, top);
  ctx.lineTo(x + w * 0.32, top);
  ctx.quadraticCurveTo(x + w * 0.5, top + h * 0.2, x + w * 0.5, y);
  ctx.lineTo(x + w * 0.46, bot);
  ctx.lineTo(x - w * 0.46, bot);
  ctx.lineTo(x - w * 0.5, y);
  ctx.quadraticCurveTo(x - w * 0.5, top + h * 0.2, x - w * 0.32, top);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6e1f19';
  ctx.lineWidth = Math.max(1, 2 * scale);
  ctx.stroke();
  // 볼륨 음영
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x - w * 0.46, y + h * 0.16, w * 0.92, h * 0.16);
  // 리어 글라스
  ctx.fillStyle = '#12203a';
  ctx.fillRect(x - w * 0.24, top + h * 0.06, w * 0.48, h * 0.16);
  // 테일라이트
  ctx.fillStyle = '#ff3b3b';
  ctx.fillRect(x - w * 0.42, y + h * 0.02, w * 0.16, h * 0.1);
  ctx.fillRect(x + w * 0.26, y + h * 0.02, w * 0.16, h * 0.1);
  // 범퍼
  ctx.fillStyle = '#5a1a14';
  ctx.fillRect(x - w * 0.48, bot - h * 0.1, w * 0.96, h * 0.1);
  // 타이어(백뷰)
  ctx.fillStyle = '#0c0c10';
  ctx.fillRect(x - w * 0.54, y + h * 0.12, w * 0.14, h * 0.24);
  ctx.fillRect(x + w * 0.4, y + h * 0.12, w * 0.14, h * 0.24);
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
      if (shape) for (let lane = 0; lane < 3; lane++) if (segment.blockedLanes[lane]) drawCones(ctx, lane, d);
      break;
    case 'enemy':
      for (let lane = 0; lane < 3; lane++) {
        const p = segment.lanePower[lane];
        if (p === null) continue;
        if (shape) enemyCar(ctx, lane, d);
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
      if (shape) for (let lane = 0; lane < 3; lane++) if (lane !== segment.openLane) drawBarrier(ctx, lane, d);
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
