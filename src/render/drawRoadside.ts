import { BiomePalette } from '../data/stages';
import { MAX_DRAW_DISTANCE, NEAR_D, projectSurface, TRACK_WIDTH } from './layout';

/**
 * 도로 양옆에 배치되는 도심 오브젝트 — 가로등 / 네온 간판 / 홀로그램 기둥.
 * 세그먼트처럼 월드 거리(z)를 갖고 트럭과의 상대 거리(d)에 따라 원근으로 다가온다.
 * 위치 인덱스 해시로 종류/높이를 정해 스크롤해도 아른거리지 않는다. (픽셀 버퍼 레이어에서 그림)
 */

function hash(n: number): number {
  const x = Math.sin(n * 91.73 + 4.1) * 43758.5453;
  return x - Math.floor(x);
}

/** 카메라(d=0) 기준 도로 가장자리 바깥쪽 가로 오프셋(px). */
const SIDE_OFFSET = TRACK_WIDTH / 2 + 24;
const SPACING = 230;

type PropType = 'light' | 'sign' | 'pillar';

function propTypeFor(slot: number, side: number): PropType {
  const r = hash(slot * 3.7 + (side > 0 ? 17.3 : 0));
  if (r < 0.68) return 'light';
  if (r < 0.86) return 'sign';
  return 'pillar';
}

function drawLight(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, side: number, neon: string) {
  const poleH = 62 * s;
  const poleW = Math.max(1, 4 * s);
  const armLen = 22 * s;
  const topY = y - poleH;

  // 기둥
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(Math.round(x - poleW / 2), Math.round(topY), Math.round(poleW), Math.round(poleH));
  // 도로 쪽으로 뻗는 팔 (side=-1 왼쪽이면 오른쪽으로)
  const armDir = -side;
  const armX0 = x;
  const armX1 = x + armDir * armLen;
  ctx.fillRect(Math.round(Math.min(armX0, armX1)), Math.round(topY), Math.round(armLen), Math.max(1, Math.round(3 * s)));

  // 램프 글로우(계단식 솔리드 — 하드 엣지) + 코어
  const lampX = armX1;
  const lampY = topY + 3 * s;
  const prevAlpha = ctx.globalAlpha;
  ctx.fillStyle = neon;
  ctx.globalAlpha = prevAlpha * 0.22;
  ctx.beginPath();
  ctx.arc(lampX, lampY, 12 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = prevAlpha * 0.4;
  ctx.beginPath();
  ctx.arc(lampX, lampY, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = prevAlpha;
  ctx.fillRect(Math.round(lampX - 2.5 * s), Math.round(lampY - 2 * s), Math.max(2, Math.round(5 * s)), Math.max(2, Math.round(4 * s)));

  // 노면에 떨어지는 은은한 빛웅덩이(계단식 솔리드)
  ctx.globalAlpha = prevAlpha * 0.16;
  ctx.beginPath();
  ctx.ellipse(lampX, y, 22 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = prevAlpha;
}

function drawSign(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, neon: string) {
  const poleH = 30 * s;
  const topY = y - poleH;
  // 지지 기둥
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(Math.round(x - 1.5 * s), Math.round(topY), Math.max(1, Math.round(3 * s)), Math.round(poleH));
  // 네온 간판 (발광 테두리 + 어두운 안쪽)
  const sw = 34 * s;
  const sh = 24 * s;
  const sx = x - sw / 2;
  const sy = topY - sh;
  // 글로우
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = neon;
  ctx.fillRect(Math.round(sx - 2 * s), Math.round(sy - 2 * s), Math.round(sw + 4 * s), Math.round(sh + 4 * s));
  ctx.globalAlpha = 1;
  ctx.fillStyle = neon;
  ctx.fillRect(Math.round(sx), Math.round(sy), Math.round(sw), Math.round(sh));
  ctx.fillStyle = '#0d0d1a';
  ctx.fillRect(Math.round(sx + 3 * s), Math.round(sy + 3 * s), Math.round(sw - 6 * s), Math.round(sh - 6 * s));
  // 안쪽 네온 줄무늬 2개(간판 텍스트 느낌)
  ctx.fillStyle = neon;
  ctx.fillRect(Math.round(sx + 5 * s), Math.round(sy + 6 * s), Math.round(sw - 10 * s), Math.max(1, Math.round(3 * s)));
  ctx.fillRect(Math.round(sx + 5 * s), Math.round(sy + 13 * s), Math.round(sw - 14 * s), Math.max(1, Math.round(3 * s)));
}

function drawPillar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, neon: string) {
  const pw = 9 * s;
  const ph = 82 * s;
  const topY = y - ph;
  // 글로우
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = neon;
  ctx.fillRect(Math.round(x - pw / 2 - 2 * s), Math.round(topY), Math.round(pw + 4 * s), Math.round(ph));
  ctx.globalAlpha = 1;
  // 본체 (위아래 네온 / 가운데 어둡게 — 솔리드 3분할, 하드 엣지)
  const px = Math.round(x - pw / 2);
  const bw = Math.round(pw);
  const seg = ph / 3;
  ctx.fillStyle = neon;
  ctx.fillRect(px, Math.round(topY), bw, Math.round(seg));
  ctx.fillStyle = '#12122a';
  ctx.fillRect(px, Math.round(topY + seg), bw, Math.round(seg));
  ctx.fillStyle = neon;
  ctx.fillRect(px, Math.round(topY + seg * 2), bw, Math.round(seg));
}

export function drawRoadside(ctx: CanvasRenderingContext2D, palette: BiomePalette, truckDistance: number) {
  const props: { d: number; side: number; type: PropType }[] = [];
  const firstSlot = Math.floor((truckDistance + NEAR_D) / SPACING) - 1;
  const lastSlot = Math.ceil((truckDistance + MAX_DRAW_DISTANCE) / SPACING) + 1;

  for (let slot = firstSlot; slot <= lastSlot; slot++) {
    // 왼쪽은 슬롯 그대로, 오른쪽은 반 칸 어긋나게 배치 → 지그재그로 거리감이 산다.
    for (const side of [-1, 1]) {
      const z = slot * SPACING + (side > 0 ? SPACING / 2 : 0);
      const d = z - truckDistance;
      if (d < NEAR_D || d > MAX_DRAW_DISTANCE) continue;
      props.push({ d, side, type: propTypeFor(slot, side) });
    }
  }

  // 먼 것부터 그려 가까운(큰) 오브젝트가 위에 겹치게
  props.sort((a, b) => b.d - a.d);

  for (const p of props) {
    const { x, y, scale } = projectSurface(p.side * SIDE_OFFSET, p.d);
    if (scale <= 0.02) continue;
    // 아주 먼 것은 흐리게 페이드해 지평선 잡음을 줄인다.
    const alpha = Math.min(1, scale / 0.1);
    ctx.save();
    ctx.globalAlpha = alpha;
    const neon = p.side < 0 ? palette.neon[0] : palette.neon[1];
    if (p.type === 'light') drawLight(ctx, x, y, scale, p.side, neon);
    else if (p.type === 'sign') drawSign(ctx, x, y, scale, neon);
    else drawPillar(ctx, x, y, scale, neon);
    ctx.restore();
  }
}
