import { BiomePalette } from '../data/stages';
import { VIEWPORT } from '../data/balance';
import { HORIZON_Y, LANE_WIDTH, MAX_DRAW_DISTANCE, perspectiveScale, TRACK_WIDTH, TRUCK_SCREEN_Y, VANISH_X } from './layout';

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** 소실점에서 뻗어나가는 방사형 하이퍼캐주얼 "터널" 광선 배경. */
function drawSunburst(ctx: CanvasRenderingContext2D, palette: BiomePalette, truckDistance: number) {
  const rayCount = 10;
  const rotation = (truckDistance * 0.0015) % ((Math.PI * 2) / rayCount);
  const maxR = Math.hypot(VIEWPORT.width, HORIZON_Y) * 1.6;

  ctx.save();
  ctx.translate(VANISH_X, HORIZON_Y);
  for (let i = 0; i < rayCount; i++) {
    const a0 = rotation + (i / rayCount) * Math.PI * 2;
    const a1 = a0 + Math.PI / rayCount;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, maxR, a0, a1);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? palette.sky[1] + '55' : palette.sky[0] + '00';
    ctx.fill();
  }
  ctx.restore();
}

export function drawRoad(ctx: CanvasRenderingContext2D, palette: BiomePalette, truckDistance: number) {
  const w = VIEWPORT.width;
  const h = VIEWPORT.height;

  // 하늘
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  sky.addColorStop(0, palette.sky[0]);
  sky.addColorStop(1, palette.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, HORIZON_Y);

  drawSunburst(ctx, palette, truckDistance);

  // 소실점을 향해 부드럽게 번지는 헤일로 (터널 입구 느낌)
  const halo = ctx.createRadialGradient(VANISH_X, HORIZON_Y, 4, VANISH_X, HORIZON_Y, w * 0.42);
  halo.addColorStop(0, '#ffffffaa');
  halo.addColorStop(1, '#ffffff00');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(VANISH_X, HORIZON_Y, w * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // 지면(도로 바깥쪽 갓길)
  ctx.fillStyle = palette.ground;
  ctx.fillRect(0, HORIZON_Y, w, h - HORIZON_Y);

  // 원근 도로 본체 — 소실점에서 화면 하단으로 넓어지는 사다리꼴
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(VANISH_X, HORIZON_Y);
  ctx.lineTo(VANISH_X - TRACK_WIDTH / 2, h);
  ctx.lineTo(VANISH_X + TRACK_WIDTH / 2, h);
  ctx.closePath();
  ctx.fill();

  // 트랙 외곽선(좌/우 가장자리) — 원근 투영에서 직선의 상은 그대로 직선이라 apex-bottom 한 번의 선으로 충분
  ctx.strokeStyle = palette.roadLine;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(VANISH_X - TRACK_WIDTH / 2, h);
  ctx.lineTo(VANISH_X, HORIZON_Y);
  ctx.lineTo(VANISH_X + TRACK_WIDTH / 2, h);
  ctx.stroke();

  // 차선 점선 — 트럭과의 상대 거리(d)에 따라 원근으로 수렴하며 스크롤
  const dashLen = 46;
  const gapLen = 34;
  const period = dashLen + gapLen;
  const phase = mod(truckDistance, period);

  ctx.strokeStyle = palette.roadLine;
  for (let boundary = 1; boundary < 3; boundary++) {
    const offsetAtCamera = LANE_WIDTH * boundary - TRACK_WIDTH / 2;
    let d0 = -phase;
    while (d0 < MAX_DRAW_DISTANCE) {
      const d1 = d0 + dashLen;
      const dA = Math.max(0, d0);
      const dB = Math.max(0, d1);
      if (dB > 0) {
        const sA = perspectiveScale(dA);
        const sB = perspectiveScale(dB);
        const ax = VANISH_X + offsetAtCamera * sA;
        const ay = HORIZON_Y + (TRUCK_SCREEN_Y - HORIZON_Y) * sA;
        const bx = VANISH_X + offsetAtCamera * sB;
        const by = HORIZON_Y + (TRUCK_SCREEN_Y - HORIZON_Y) * sB;
        ctx.lineWidth = Math.max(1, 2.4 * ((sA + sB) / 2));
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      d0 += period;
    }
  }
}
