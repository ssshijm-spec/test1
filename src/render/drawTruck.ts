import { TierDef } from '../data/tiers';
import { Truck } from '../entities/truck';
import { laneCenterX, TRUCK_SCREEN_Y } from './layout';

const BASE_W = 46;
const BASE_L = 64;
const TAU = Math.PI * 2;

/**
 * 좌표계: 이 트럭은 "백뷰"다. y<0(위) = 도로 저 앞쪽(멀리, 캐빈), y>0(아래) = 카메라와 가장 가까운 후미
 * (테일램프/범퍼/배기). 레인 이동 시 truck.steer로 차체가 그쪽으로 기울어(banking) 주행감을 준다.
 */

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 빠르게 도는 바퀴 — 타이어 + 클리핑된 모션블러 밴드(위로 흐름) + 허브. */
function drawWheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, elapsedMs: number) {
  ctx.fillStyle = '#0e0e12';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.94, 0, TAU);
  ctx.clip();
  const band = r * 0.8;
  const off = (elapsedMs * 0.09) % band;
  ctx.strokeStyle = 'rgba(150,155,170,0.45)';
  ctx.lineWidth = Math.max(1, r * 0.2);
  for (let i = -2; i <= 2; i++) {
    const yy = y - off + i * band;
    ctx.beginPath();
    ctx.moveTo(x - r, yy);
    ctx.lineTo(x + r, yy);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#6a6a78';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.3, 0, TAU);
  ctx.fill();
}

/** 후미로 흘러나가는 배기 스모크(항상, 은은) + 화염(고티어). 속도감의 핵심 단서. */
function drawExhaust(ctx: CanvasRenderingContext2D, v: TierDef['visual'], w: number, l: number, elapsedMs: number) {
  // 스모크 퍼프 — 아래(카메라 쪽)로 밀려나며 커지고 옅어진다
  for (let i = 0; i < 3; i++) {
    const phase = ((elapsedMs / 520 + i / 3) % 1 + 1) % 1;
    const py = l * 0.42 + phase * l * 0.7;
    const pr = (3 + phase * 9) * (0.8 + v.bodyWidth * 0.2);
    ctx.globalAlpha = (1 - phase) * 0.28;
    ctx.fillStyle = '#c9ccd6';
    ctx.beginPath();
    ctx.arc((i - 1) * w * 0.22, py, pr, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (v.hasExhaustFlames) {
    const flick = 0.6 + 0.4 * Math.sin(elapsedMs / 55);
    for (const sx of [-w * 0.24, w * 0.24]) {
      ctx.fillStyle = `rgba(255,${150 + Math.floor(flick * 70)},60,${0.6 + flick * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.07, l * 0.42);
      ctx.lineTo(sx, l * 0.42 + 16 * flick);
      ctx.lineTo(sx + w * 0.07, l * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,240,180,${0.5 + flick * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.03, l * 0.42);
      ctx.lineTo(sx, l * 0.42 + 8 * flick);
      ctx.lineTo(sx + w * 0.03, l * 0.42);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** 뒤에서 본 트럭 본체(입체감: 후면 화물칸 + receding 지붕면 + 캐빈 + 테일램프 + 범퍼). */
function drawRearBody(ctx: CanvasRenderingContext2D, v: TierDef['visual'], w: number, l: number) {
  const isBig =
    v.cabinStyle === 'semi' ||
    v.cabinStyle === 'monster' ||
    v.cabinStyle === 'armored' ||
    v.cabinStyle === 'mecha' ||
    v.cabinStyle === 'titan' ||
    v.cabinStyle === 'cosmic';

  const bodyTop = -l * (isBig ? 0.4 : 0.34);
  const bodyBot = l * 0.32;
  const bx = -w * 0.44;
  const bw = w * 0.88;

  const light = shade(v.bodyColor, 1.28);
  const dark = shade(v.bodyColor, 0.62);

  // 지붕면(위로 좁아지는 사다리꼴) — 상자의 윗면이 저 앞으로 물러나 보이게
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.moveTo(bx, bodyTop);
  ctx.lineTo(bx + bw, bodyTop);
  ctx.lineTo(w * 0.32, bodyTop - l * 0.14);
  ctx.lineTo(-w * 0.32, bodyTop - l * 0.14);
  ctx.closePath();
  ctx.fill();

  // 캐빈(저 앞, 좁게) + 뒤창
  ctx.fillStyle = dark;
  ctx.fillRect(-w * 0.28, bodyTop - l * 0.28, w * 0.56, l * 0.16);
  ctx.fillStyle = 'rgba(190,225,255,0.9)';
  ctx.fillRect(-w * 0.2, bodyTop - l * 0.25, w * 0.4, l * 0.09);

  // 후면 화물칸(우리를 향한 큰 면)
  ctx.fillStyle = v.bodyColor;
  ctx.fillRect(bx, bodyTop, bw, bodyBot - bodyTop);
  ctx.strokeStyle = v.accentColor;
  ctx.lineWidth = v.outline;
  ctx.strokeRect(bx, bodyTop, bw, bodyBot - bodyTop);

  // 문 분할선 + 패널 라인
  ctx.strokeStyle = dark;
  ctx.lineWidth = Math.max(1, v.outline * 0.6);
  ctx.beginPath();
  ctx.moveTo(0, bodyTop + l * 0.04);
  ctx.lineTo(0, bodyBot - l * 0.04);
  ctx.stroke();
  for (let i = 1; i <= 2; i++) {
    const yy = bodyTop + (bodyBot - bodyTop) * (i / 3);
    ctx.beginPath();
    ctx.moveTo(bx + 2, yy);
    ctx.lineTo(bx + bw - 2, yy);
    ctx.stroke();
  }

  // 넘버 플레이트
  ctx.fillStyle = '#e8e8d8';
  ctx.fillRect(-w * 0.14, bodyBot - l * 0.12, w * 0.28, l * 0.08);

  // 장갑판
  if (v.hasArmorPlates) {
    ctx.fillStyle = 'rgba(20,20,28,0.55)';
    ctx.fillRect(bx - w * 0.06, bodyTop + l * 0.06, w * 0.1, (bodyBot - bodyTop) * 0.8);
    ctx.fillRect(bx + bw - w * 0.04, bodyTop + l * 0.06, w * 0.1, (bodyBot - bodyTop) * 0.8);
  }
  // 사이드 캐논
  if (v.hasCannons) {
    ctx.fillStyle = '#2a2a33';
    ctx.fillRect(bx - w * 0.12, bodyTop + l * 0.16, w * 0.1, l * 0.26);
    ctx.fillRect(bx + bw + w * 0.02, bodyTop + l * 0.16, w * 0.1, l * 0.26);
  }

  // 스포일러(후미 위쪽) — 넓은 윙
  if (v.hasSpoiler) {
    ctx.fillStyle = v.accentColor;
    ctx.fillRect(-w * 0.52, bodyBot - l * 0.02, w * 1.04, l * 0.05);
    ctx.fillStyle = dark;
    ctx.fillRect(-w * 0.46, bodyBot - l * 0.06, w * 0.06, l * 0.06);
    ctx.fillRect(w * 0.4, bodyBot - l * 0.06, w * 0.06, l * 0.06);
  }

  // 테일램프(후미, 카메라 쪽) — 발광
  const lampY = bodyBot - l * 0.09;
  for (const lx of [bx + w * 0.02, bx + bw - w * 0.16]) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ff5555';
    ctx.fillRect(lx - 2, lampY - 2, w * 0.14 + 4, l * 0.09 + 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(lx, lampY, w * 0.14, l * 0.09);
    ctx.fillStyle = '#ffd0d0';
    ctx.fillRect(lx + 1, lampY + 1, w * 0.05, l * 0.03);
  }

  // 범퍼(가장 가까운 후미, 몸체보다 넓게)
  ctx.fillStyle = shade(v.accentColor, 0.8);
  ctx.fillRect(-w * 0.5, bodyBot, w * 1.0, l * 0.07);
}

export function drawTruck(ctx: CanvasRenderingContext2D, truck: Truck, tier: TierDef, elapsedMs: number) {
  const v = tier.visual;
  const bob = Math.sin(truck.bobPhase * 8) * 1.6 * v.scale;
  const cx = laneCenterX(truck.lane);
  const cy = TRUCK_SCREEN_Y + bob;

  let scale = v.scale;
  if (truck.evolveFxMs > 0) {
    const t = truck.evolveFxMs / 1200;
    scale *= 1 + Math.sin(t * Math.PI) * 0.55;
  }

  const w = BASE_W * v.bodyWidth;
  const l = BASE_L * v.bodyLength;
  const bank = truck.steer;

  ctx.save();
  ctx.translate(cx, cy);

  // 그림자(지면, 기울지 않음) — 기울기 방향으로 살짝 흘림
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(bank * w * 0.15, l * 0.44, w * 0.6, w * 0.26, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // 차체(banking: 기울기 + 살짝 시어로 측면이 드러남)
  ctx.save();
  ctx.rotate(bank * 0.12);
  ctx.transform(1, 0, bank * 0.14, 1, 0, 0);
  ctx.scale(scale, scale);

  // 아우라(고티어)
  if (v.hasAura) {
    const pulse = 0.5 + 0.5 * Math.sin(elapsedMs / 220);
    const grad = ctx.createRadialGradient(0, 0, w * 0.2, 0, 0, w * 1.3);
    grad.addColorStop(0, v.glowColor + 'aa');
    grad.addColorStop(1, v.glowColor + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, w * (1.0 + pulse * 0.25), 0, TAU);
    ctx.fill();
  }

  const wheelR = 6.5 * v.wheelSize;

  // 배기 스모크/화염(본체 뒤로)
  drawExhaust(ctx, v, w, l, elapsedMs);

  // 스타일별
  switch (v.cabinStyle) {
    case 'cart': {
      drawWheel(ctx, -w * 0.32, l * 0.3, wheelR, elapsedMs);
      drawWheel(ctx, w * 0.32, l * 0.3, wheelR, elapsedMs);
      ctx.fillStyle = v.bodyColor;
      ctx.fillRect(-w * 0.4, -l * 0.32, w * 0.8, l * 0.62);
      ctx.strokeStyle = v.accentColor;
      ctx.lineWidth = v.outline;
      ctx.strokeRect(-w * 0.4, -l * 0.32, w * 0.8, l * 0.62);
      ctx.fillStyle = '#ff3b3b';
      ctx.fillRect(-w * 0.36, l * 0.18, w * 0.14, l * 0.08);
      ctx.fillRect(w * 0.22, l * 0.18, w * 0.14, l * 0.08);
      break;
    }
    case 'trike': {
      drawWheel(ctx, 0, -l * 0.38, wheelR * 0.9, elapsedMs);
      drawWheel(ctx, -w * 0.34, l * 0.32, wheelR, elapsedMs);
      drawWheel(ctx, w * 0.34, l * 0.32, wheelR, elapsedMs);
      ctx.fillStyle = v.bodyColor;
      ctx.fillRect(-w * 0.42, -l * 0.34, w * 0.84, l * 0.68);
      ctx.strokeStyle = v.accentColor;
      ctx.lineWidth = v.outline;
      ctx.strokeRect(-w * 0.42, -l * 0.34, w * 0.84, l * 0.68);
      ctx.fillStyle = 'rgba(190,225,255,0.9)';
      ctx.fillRect(-w * 0.22, -l * 0.3, w * 0.44, l * 0.14);
      ctx.fillStyle = '#ff3b3b';
      ctx.fillRect(-w * 0.38, l * 0.2, w * 0.14, l * 0.08);
      ctx.fillRect(w * 0.24, l * 0.2, w * 0.14, l * 0.08);
      break;
    }
    default: {
      // 바퀴 — 앞(멀리, 작게) + 뒤(가까이, 크게). 살짝 옆으로 삐져나오게.
      drawWheel(ctx, -w * 0.5, -l * 0.22, wheelR * 0.82, elapsedMs);
      drawWheel(ctx, w * 0.5, -l * 0.22, wheelR * 0.82, elapsedMs);
      drawWheel(ctx, -w * 0.52, l * 0.24, wheelR * 1.12, elapsedMs);
      drawWheel(ctx, w * 0.52, l * 0.24, wheelR * 1.12, elapsedMs);
      drawRearBody(ctx, v, w, l);
      break;
    }
  }

  // 피격 플래시
  if (truck.hitFlashMs > 0) {
    ctx.globalAlpha = Math.min(0.6, truck.hitFlashMs / 400);
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(-w * 0.52, -l * 0.46, w * 1.04, l * 0.92);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  ctx.restore();
}
