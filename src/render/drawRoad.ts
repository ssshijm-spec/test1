import { BiomePalette } from '../data/stages';
import { VIEWPORT } from '../data/balance';
import { HORIZON_Y, LANE_WIDTH, MAX_DRAW_DISTANCE, NEAR_D, surfaceScale, TRACK_WIDTH, TRUCK_SCREEN_Y, VANISH_X } from './layout';

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** 결정적 0~1 해시 — 스크롤해도 빌딩/창문 패턴이 아른거리지 않게 위치 인덱스로부터 안정적 난수를 뽑는다. */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 11.7) * 43758.5453;
  return x - Math.floor(x);
}

interface CityLayerOpts {
  y: number; // 빌딩 밑변 y
  scrollX: number; // 패럴랙스 스크롤 오프셋
  spacing: number; // 빌딩 슬롯 폭
  gap: number; // 빌딩 사이 간격
  baseH: number;
  varH: number;
  bodyColor: string;
  windowChance: number;
  signChance: number; // 네온 사인 확률
  neon: [string, string];
}

/** 픽셀 시티 한 레이어(스카이라인 실루엣 + 켜진 창문 + 가끔 네온 사인). */
function drawCityLayer(ctx: CanvasRenderingContext2D, opts: CityLayerOpts) {
  const { y, scrollX, spacing, gap, baseH, varH, bodyColor, windowChance, signChance, neon } = opts;
  const startSlot = Math.floor(scrollX / spacing) - 1;
  const count = Math.ceil(VIEWPORT.width / spacing) + 3;

  for (let k = 0; k < count; k++) {
    const slot = startSlot + k;
    const h = Math.round(baseH + hash(slot) * varH);
    const bw = Math.round(spacing - gap);
    const bx = Math.round(slot * spacing - scrollX);
    const top = y - h;

    // 빌딩 몸체
    ctx.fillStyle = bodyColor;
    ctx.fillRect(bx, top, bw, h);

    // 창문 그리드 (켜진 창만 네온색으로)
    const cell = 8;
    const pad = 3;
    for (let wy = top + pad; wy < y - pad; wy += cell) {
      for (let wx = bx + pad; wx < bx + bw - pad; wx += cell) {
        const r = hash(slot * 91.3 + wx * 0.7 + wy * 1.9);
        if (r < windowChance) {
          ctx.fillStyle = r < windowChance * 0.5 ? neon[0] : neon[1];
          ctx.fillRect(Math.round(wx), Math.round(wy), 4, 4);
        }
      }
    }

    // 가끔 큰 네온 사인 (썸네일의 RAMEN/NEON 간판 같은 발광 블록)
    if (hash(slot * 7.7 + 3.1) < signChance && h > baseH * 0.7) {
      const signColor = hash(slot * 3.3) < 0.5 ? neon[0] : neon[1];
      const sw = Math.max(6, Math.round(bw * 0.55));
      const sh = 10;
      const sx = bx + Math.round((bw - sw) / 2);
      const sy = top + Math.round(h * 0.28);
      ctx.fillStyle = signColor;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.fillStyle = '#0d0d1a';
      ctx.fillRect(sx + 2, sy + 3, sw - 4, sh - 6);
    }
  }
}

/** 밤하늘 별. 화면 상단에만, 위치 고정(살짝만 패럴랙스). */
function drawStars(ctx: CanvasRenderingContext2D, scrollX: number) {
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 40; i++) {
    const bx = mod(hash(i * 2.1) * VIEWPORT.width * 2 - scrollX * 0.15, VIEWPORT.width);
    const by = hash(i * 5.7) * (HORIZON_Y - 20);
    const tw = hash(i * 9.3 + Math.floor(scrollX * 0.02));
    ctx.globalAlpha = 0.35 + tw * 0.5;
    ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
  }
  ctx.globalAlpha = 1;
}

/** 원근 투영 y (언클램프) — 그리드/도로 표면 계산용. */
function yAt(d: number): number {
  return HORIZON_Y + (TRUCK_SCREEN_Y - HORIZON_Y) * surfaceScale(d);
}

/** 아웃런식 대형 밴딩 선셋 태양 — 가로 색 밴드 + 아래쪽 블라인드 컷. 소실점 뒤 지평선에 앉는다. */
function drawSun(ctx: CanvasRenderingContext2D, palette: BiomePalette) {
  const r = VIEWPORT.width * 0.26;
  const cx = VANISH_X;
  const cy = HORIZON_Y - r * 0.12;
  const bands = ['#fff45f', '#ffe14d', '#ffb347', '#ff7a5c', '#ff5c8a', '#ff3d94'];
  const top = cy - r;
  const full = 2 * r;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  // 가로 색 밴드(하드 엣지)
  for (let i = 0; i < bands.length; i++) {
    ctx.fillStyle = bands[i];
    ctx.fillRect(cx - r, top + (full * i) / bands.length, 2 * r, full / bands.length + 1);
  }
  // 아래쪽 블라인드 컷(간격이 아래로 갈수록 넓어짐) — 지평선 근처만 보인다
  ctx.fillStyle = palette.sky[1];
  let gy = top + full * 0.36;
  let gh = 2;
  while (gy < cy + r) {
    ctx.fillRect(cx - r, gy, 2 * r, gh);
    gy += gh + Math.max(4, gh * 1.6);
    gh += 1.5;
  }
  ctx.restore();
}

/**
 * 신스웨이브 네온 그리드 바닥 — 지면 위에 원근 격자(가로 스크롤선 + 소실점 방사선 + 청록/마젠타
 * 교차 밴드)를 깔아 아웃런 감성을 낸다. 이후 도로 사다리꼴이 중앙을 덮어 양옆에만 그리드가 남는다.
 */
function drawNeonGrid(ctx: CanvasRenderingContext2D, palette: BiomePalette, truckDistance: number) {
  const w = VIEWPORT.width;
  const c0 = palette.neon[0];
  const c1 = palette.neon[1];
  const sp = 62; // 가로선 월드 간격
  const phase = mod(truckDistance, sp);

  let d0 = -phase;
  while (d0 > NEAR_D) d0 -= sp;
  let row = Math.round((d0 + phase) / sp);

  // 가로 교차 밴드 + 가로선
  while (d0 < MAX_DRAW_DISTANCE) {
    const dN = Math.max(NEAR_D, d0);
    const dF = d0 + sp;
    if (dF > NEAR_D) {
      const yN = yAt(dN); // 가까운(아래) 가장자리
      const yF = yAt(dF); // 먼(위) 가장자리
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = row % 2 === 0 ? c0 : c1;
      ctx.fillRect(0, yF, w, yN - yF);
      // 가로선(먼 쪽 경계)
      ctx.globalAlpha = Math.min(0.85, 0.2 + surfaceScale(dF) * 0.8);
      ctx.strokeStyle = c0;
      ctx.lineWidth = Math.max(1, 1.6 * surfaceScale(dF));
      ctx.beginPath();
      ctx.moveTo(0, yF);
      ctx.lineTo(w, yF);
      ctx.stroke();
    }
    d0 += sp;
    row++;
  }

  // 소실점에서 화면 바닥으로 뻗는 방사(세로) 선
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = c0;
  ctx.lineWidth = 1.5;
  const cols = 12;
  for (let i = 0; i <= cols; i++) {
    const bx = (w / cols) * i;
    ctx.beginPath();
    ctx.moveTo(VANISH_X, HORIZON_Y);
    ctx.lineTo(bx, VIEWPORT.height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function drawRoad(ctx: CanvasRenderingContext2D, palette: BiomePalette, truckDistance: number) {
  const w = VIEWPORT.width;
  const h = VIEWPORT.height;

  // 밤하늘 (2색 그라디언트 — 저해상도 버퍼에서 밴딩되어 레트로 느낌)
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y);
  sky.addColorStop(0, palette.sky[0]);
  sky.addColorStop(1, palette.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, HORIZON_Y);

  drawStars(ctx, truckDistance);
  drawSun(ctx, palette);

  // 픽셀 시티 — 원경(작고 어둡고 창문 적음) → 중경(크고 밝고 네온 사인). 태양 앞을 가리는 실루엣.
  drawCityLayer(ctx, {
    y: HORIZON_Y + 2,
    scrollX: truckDistance * 0.05,
    spacing: 34,
    gap: 6,
    baseH: 30,
    varH: 46,
    bodyColor: palette.farLayer,
    windowChance: 0.18,
    signChance: 0.0,
    neon: palette.neon,
  });
  drawCityLayer(ctx, {
    y: HORIZON_Y + 6,
    scrollX: truckDistance * 0.13,
    spacing: 56,
    gap: 10,
    baseH: 44,
    varH: 62,
    bodyColor: palette.midLayer,
    windowChance: 0.32,
    signChance: 0.35,
    neon: palette.neon,
  });

  // 지면(어두운 밤) + 네온 그리드 바닥
  ctx.fillStyle = palette.ground;
  ctx.fillRect(0, HORIZON_Y, w, h - HORIZON_Y);
  drawNeonGrid(ctx, palette, truckDistance);

  // 원근 도로 본체 — 다크 아스팔트 사다리꼴(그리드 위에 얹혀 중앙을 덮는다)
  ctx.fillStyle = '#0a0a12';
  ctx.beginPath();
  ctx.moveTo(VANISH_X, HORIZON_Y);
  ctx.lineTo(VANISH_X - TRACK_WIDTH / 2, h);
  ctx.lineTo(VANISH_X + TRACK_WIDTH / 2, h);
  ctx.closePath();
  ctx.fill();

  // 네온 트랙 외곽선 + 차선 점선
  drawNeonEdges(ctx, palette.roadLine, h);
  drawNeonLanes(ctx, palette.roadLine, truckDistance);
}

function drawNeonEdges(ctx: CanvasRenderingContext2D, color: string, h: number) {
  const drawEdge = (mult: number, width: number, alpha: number) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(VANISH_X - (TRACK_WIDTH / 2) * mult, h);
    ctx.lineTo(VANISH_X, HORIZON_Y);
    ctx.lineTo(VANISH_X + (TRACK_WIDTH / 2) * mult, h);
    ctx.stroke();
  };
  drawEdge(1, 7, 0.22); // 글로우
  drawEdge(1, 3, 1); // 코어
  ctx.globalAlpha = 1;
}

function drawNeonLanes(ctx: CanvasRenderingContext2D, color: string, truckDistance: number) {
  const dashLen = 46;
  const gapLen = 34;
  const period = dashLen + gapLen;
  const phase = mod(truckDistance, period);

  for (let boundary = 1; boundary < 3; boundary++) {
    const offsetAtCamera = LANE_WIDTH * boundary - TRACK_WIDTH / 2;
    // 화면 바닥(NEAR_D, 음수)보다 낮은 격자점에서 시작해 근거리 도로에도 점선이 이어지게 한다.
    let d0 = -phase;
    while (d0 > NEAR_D) d0 -= period;
    while (d0 < MAX_DRAW_DISTANCE) {
      const dA = Math.max(NEAR_D, d0);
      const dB = d0 + dashLen;
      if (dB > NEAR_D) {
        const sA = surfaceScale(dA);
        const sB = surfaceScale(dB);
        const ax = VANISH_X + offsetAtCamera * sA;
        const ay = HORIZON_Y + (TRUCK_SCREEN_Y - HORIZON_Y) * sA;
        const bx = VANISH_X + offsetAtCamera * sB;
        const by = HORIZON_Y + (TRUCK_SCREEN_Y - HORIZON_Y) * sB;
        const avgS = (sA + sB) / 2;
        // 글로우
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, 5 * avgS);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        // 코어
        ctx.globalAlpha = 1;
        ctx.lineWidth = Math.max(1, 2.4 * avgS);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      d0 += period;
    }
  }
  ctx.globalAlpha = 1;
}
