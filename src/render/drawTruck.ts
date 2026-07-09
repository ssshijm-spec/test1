import { TierDef } from '../data/tiers';
import { Truck } from '../entities/truck';
import { laneCenterX, TRUCK_SCREEN_Y } from './layout';

const BASE_W = 46;
const BASE_L = 64;
const TAU = Math.PI * 2;

/**
 * "백뷰" 자동차. y<0(위)=도로 저 앞쪽(멀리, 지붕/캐빈), y>0(아래)=카메라와 가장 가까운 후미
 * (테일라이트/범퍼/배기). 레인 이동 시 truck.steer로 차체가 그쪽으로 기운다(banking).
 *
 * 박스가 아니라 "자동차"로 읽히게 하는 핵심: ① 어깨(펜더)가 불룩하고 지붕이 좁아지는 곡선 실루엣
 * ② 위→아래 밝기 밴딩으로 둥근 볼륨감 ③ 리어 글라스+필러 ④ 테일라이트 클러스터 ⑤ 펜더 아치 안의 바퀴.
 */

type Visual = TierDef['visual'];

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * 백뷰 타이어 — 전진하는 차를 뒤에서 보면 뒷바퀴는 "뒤 트레드 면"이 보인다(옆면 허브가 아니라).
 * 그래서 허브 없는 둥근 사각으로 그리고, 트레드 홈이 아래로 흘러(전진) 굴러가는 느낌을 준다.
 */
function drawTire(ctx: CanvasRenderingContext2D, x: number, y: number, tw: number, th: number, elapsedMs: number) {
  const rad = Math.min(tw, th) * 0.36;
  ctx.fillStyle = '#0c0c10';
  roundRect(ctx, x - tw / 2, y - th / 2, tw, th, rad);
  ctx.fill();

  ctx.save();
  roundRect(ctx, x - tw / 2, y - th / 2, tw, th, rad);
  ctx.clip();
  const band = th * 0.4;
  const off = (elapsedMs * 0.13) % band; // 아래로 흐름 = 전진
  ctx.strokeStyle = 'rgba(150,155,170,0.4)';
  ctx.lineWidth = Math.max(1, th * 0.12);
  for (let i = -1; i <= 3; i++) {
    const yy = y - th / 2 + off + i * band;
    ctx.beginPath();
    ctx.moveTo(x - tw / 2, yy);
    ctx.lineTo(x + tw / 2, yy);
    ctx.stroke();
  }
  ctx.restore();

  // 사이드월 하이라이트(둥근 고무 느낌)
  ctx.strokeStyle = '#2a2a34';
  ctx.lineWidth = Math.max(1, th * 0.1);
  roundRect(ctx, x - tw / 2 + 1, y - th / 2 + 1, tw - 2, th - 2, rad * 0.8);
  ctx.stroke();
}

/** 후미로 흘러나가는 배기 스모크(항상) + 화염(고티어). */
function drawExhaust(ctx: CanvasRenderingContext2D, v: Visual, w: number, l: number, elapsedMs: number) {
  for (let i = 0; i < 3; i++) {
    const phase = (((elapsedMs / 520 + i / 3) % 1) + 1) % 1;
    const py = l * 0.42 + phase * l * 0.7;
    const pr = (3 + phase * 9) * (0.8 + v.bodyWidth * 0.2);
    ctx.globalAlpha = (1 - phase) * 0.26;
    ctx.fillStyle = '#c9ccd6';
    ctx.beginPath();
    ctx.arc((i - 1) * w * 0.22, py, pr, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (v.hasExhaustFlames) {
    const flick = 0.6 + 0.4 * Math.sin(elapsedMs / 55);
    for (const sx of [-w * 0.22, w * 0.22]) {
      ctx.fillStyle = `rgba(255,${150 + Math.floor(flick * 70)},60,${0.6 + flick * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(sx - w * 0.06, l * 0.4);
      ctx.lineTo(sx, l * 0.4 + 15 * flick);
      ctx.lineTo(sx + w * 0.06, l * 0.4);
      ctx.closePath();
      ctx.fill();
    }
  }
}

/** 자동차 실루엣 경로(어깨 불룩, 지붕 좁음). fill/clip/stroke에 재사용. */
function carPath(ctx: CanvasRenderingContext2D, w: number, l: number) {
  const roofY = -l * 0.46;
  const shY = -l * 0.04;
  const hipY = l * 0.16;
  const bumpY = l * 0.26;
  const botY = l * 0.36;
  const roofHW = w * 0.3;
  const shHW = w * 0.44;
  const hipHW = w * 0.52;
  const bumpHW = w * 0.48;

  ctx.beginPath();
  ctx.moveTo(-roofHW, roofY);
  ctx.lineTo(roofHW, roofY);
  ctx.quadraticCurveTo(shHW, roofY + l * 0.02, shHW, shY);
  ctx.quadraticCurveTo(hipHW, hipY - l * 0.06, hipHW, hipY);
  ctx.lineTo(bumpHW, bumpY);
  ctx.lineTo(bumpHW, botY);
  ctx.lineTo(-bumpHW, botY);
  ctx.lineTo(-bumpHW, bumpY);
  ctx.lineTo(-hipHW, hipY);
  ctx.quadraticCurveTo(-hipHW, hipY - l * 0.06, -shHW, shY);
  ctx.quadraticCurveTo(-shHW, roofY + l * 0.02, -roofHW, roofY);
  ctx.closePath();
}

function drawCar(ctx: CanvasRenderingContext2D, v: Visual, w: number, l: number, elapsedMs: number) {
  const roofY = -l * 0.46;
  const shY = -l * 0.04;
  const hipY = l * 0.16;
  const bumpY = l * 0.26;
  const botY = l * 0.36;
  const light = shade(v.bodyColor, 1.32);
  const dark = shade(v.bodyColor, 0.6);
  const accentDark = shade(v.accentColor, 0.7);

  // 배기(본체 뒤)
  drawExhaust(ctx, v, w, l, elapsedMs);

  const rearR = 7.5 * v.wheelSize;
  // 본체 채우기
  carPath(ctx, w, l);
  ctx.fillStyle = v.bodyColor;
  ctx.fill();

  // 볼륨 음영 — 실루엣 안에서 위(밝게)→아래(어둡게) 밴딩
  ctx.save();
  carPath(ctx, w, l);
  ctx.clip();
  ctx.fillStyle = light;
  ctx.fillRect(-w, roofY, w * 2, l * 0.14);
  ctx.fillStyle = dark;
  ctx.fillRect(-w, hipY, w * 2, botY - hipY);
  // 좌우 측면 살짝 어둡게(둥근 느낌)
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(-w * 0.52, shY, w * 0.1, hipY - shY + l * 0.1);
  ctx.fillRect(w * 0.42, shY, w * 0.1, hipY - shY + l * 0.1);
  ctx.restore();

  // 외곽선(픽셀아트 정의감)
  carPath(ctx, w, l);
  ctx.strokeStyle = accentDark;
  ctx.lineWidth = Math.max(1.5, v.outline);
  ctx.stroke();

  // 리어 글라스(사다리꼴) + 필러 + 하이라이트
  ctx.fillStyle = '#12203a';
  ctx.beginPath();
  ctx.moveTo(-w * 0.24, roofY + l * 0.03);
  ctx.lineTo(w * 0.24, roofY + l * 0.03);
  ctx.lineTo(w * 0.3, shY - l * 0.03);
  ctx.lineTo(-w * 0.3, shY - l * 0.03);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,190,240,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-w * 0.16, roofY + l * 0.05);
  ctx.lineTo(w * 0.05, shY - l * 0.05);
  ctx.stroke();

  // 숄더 라인(악센트)
  ctx.strokeStyle = v.accentColor;
  ctx.lineWidth = Math.max(1, v.outline * 0.7);
  ctx.beginPath();
  ctx.moveTo(-w * 0.44, shY + l * 0.04);
  ctx.lineTo(w * 0.44, shY + l * 0.04);
  ctx.stroke();

  // 스포일러(트렁크 립 윙)
  if (v.hasSpoiler) {
    ctx.fillStyle = accentDark;
    ctx.fillRect(-w * 0.5, shY - l * 0.02, w * 1.0, l * 0.05);
    ctx.fillRect(-w * 0.42, shY - l * 0.08, w * 0.06, l * 0.06);
    ctx.fillRect(w * 0.36, shY - l * 0.08, w * 0.06, l * 0.06);
  }
  // 장갑판
  if (v.hasArmorPlates) {
    ctx.fillStyle = 'rgba(15,15,22,0.5)';
    ctx.fillRect(-w * 0.5, hipY - l * 0.02, w * 0.12, l * 0.14);
    ctx.fillRect(w * 0.38, hipY - l * 0.02, w * 0.12, l * 0.14);
  }
  // 사이드 캐논
  if (v.hasCannons) {
    ctx.fillStyle = '#2a2a33';
    ctx.fillRect(-w * 0.6, hipY - l * 0.04, w * 0.1, l * 0.2);
    ctx.fillRect(w * 0.5, hipY - l * 0.04, w * 0.1, l * 0.2);
  }

  // 테일라이트 클러스터(가로 유닛 2개 + 얇은 연결 스트립) — 발광
  const tlY = hipY + l * 0.02;
  const tlH = l * 0.07;
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(-w * 0.46, tlY - 2, w * 0.92, tlH + 4);
  ctx.globalAlpha = 1;
  for (const sgn of [-1, 1]) {
    const lx = sgn < 0 ? -w * 0.46 : w * 0.18;
    ctx.fillStyle = '#8a1a1a';
    ctx.fillRect(lx, tlY, w * 0.28, tlH);
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(lx + 1.5, tlY + 1.5, w * 0.28 - 3, tlH - 3);
    ctx.fillStyle = '#ffd0d0';
    ctx.fillRect(lx + 2.5, tlY + 2.5, w * 0.1, tlH - 5);
  }
  ctx.fillStyle = '#5a0f0f';
  ctx.fillRect(-w * 0.18, tlY + tlH * 0.3, w * 0.36, tlH * 0.3);

  // 범퍼 + 번호판
  ctx.fillStyle = shade(v.accentColor, 0.75);
  ctx.fillRect(-w * 0.5, bumpY + l * 0.02, w * 1.0, botY - bumpY - l * 0.02);
  ctx.fillStyle = '#e9e9db';
  ctx.fillRect(-w * 0.13, bumpY + l * 0.03, w * 0.26, l * 0.06);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-w * 0.1, bumpY + l * 0.045, w * 0.2, l * 0.03);

  // 배기 팁(범퍼 아래, 크롬)
  ctx.fillStyle = '#c9ccd6';
  for (const sx of [-w * 0.2, w * 0.2]) {
    ctx.beginPath();
    ctx.ellipse(sx, botY + l * 0.02, w * 0.06, l * 0.02, 0, 0, TAU);
    ctx.fill();
  }

  // 뒷바퀴(백뷰 타이어) — 펜더 아치 안, 아래로 삐져나옴. 본체 위에 그려 타이어가 밖으로 보이게.
  const tw = rearR * 1.5;
  const th = rearR * 1.7;
  const tyre = hipY + l * 0.12;
  for (const sx of [-w * 0.5, w * 0.5]) {
    drawTire(ctx, sx, tyre, tw, th, elapsedMs);
    // 펜더 아치 립(타이어 위를 덮는 반원)
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(sx, tyre - th * 0.1, tw * 0.66, Math.PI, TAU);
    ctx.fill();
    ctx.strokeStyle = accentDark;
    ctx.lineWidth = Math.max(1.5, v.outline);
    ctx.beginPath();
    ctx.arc(sx, tyre - th * 0.1, tw * 0.66, Math.PI, TAU);
    ctx.stroke();
  }
}

/** 초기 티어용 러프한 소형차(손수레/삼륜) — 조금 조잡하지만 의도된 "고철" 느낌. */
function drawEarly(ctx: CanvasRenderingContext2D, v: Visual, w: number, l: number, elapsedMs: number, trike: boolean) {
  const rearR = 6.5 * v.wheelSize;
  if (trike) drawTire(ctx, 0, -l * 0.32, rearR, rearR * 1.2, elapsedMs);
  drawTire(ctx, -w * 0.42, l * 0.3, rearR * 1.3, rearR * 1.5, elapsedMs);
  drawTire(ctx, w * 0.42, l * 0.3, rearR * 1.3, rearR * 1.5, elapsedMs);

  const dark = shade(v.bodyColor, 0.62);
  // 몸체(위 좁고 아래 넓은 사다리꼴)
  ctx.fillStyle = v.bodyColor;
  ctx.beginPath();
  ctx.moveTo(-w * 0.26, -l * 0.34);
  ctx.lineTo(w * 0.26, -l * 0.34);
  ctx.lineTo(w * 0.42, l * 0.28);
  ctx.lineTo(-w * 0.42, l * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = v.accentColor;
  ctx.lineWidth = v.outline;
  ctx.stroke();
  // 뒤창
  ctx.fillStyle = 'rgba(190,225,255,0.85)';
  ctx.fillRect(-w * 0.18, -l * 0.3, w * 0.36, l * 0.12);
  // 음영
  ctx.fillStyle = dark;
  ctx.fillRect(-w * 0.42, l * 0.1, w * 0.84, l * 0.06);
  // 테일램프
  ctx.fillStyle = '#ff3b3b';
  ctx.fillRect(-w * 0.36, l * 0.16, w * 0.12, l * 0.08);
  ctx.fillRect(w * 0.24, l * 0.16, w * 0.12, l * 0.08);
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

  // 그림자(지면, 기울지 않음)
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(bank * w * 0.15, l * 0.42, w * 0.62, w * 0.24, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // 차체(banking)
  ctx.save();
  ctx.rotate(bank * 0.11);
  ctx.transform(1, 0, bank * 0.13, 1, 0, 0);
  ctx.scale(scale, scale);

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

  if (v.cabinStyle === 'cart') drawEarly(ctx, v, w, l, elapsedMs, false);
  else if (v.cabinStyle === 'trike') drawEarly(ctx, v, w, l, elapsedMs, true);
  else drawCar(ctx, v, w, l, elapsedMs);

  if (truck.hitFlashMs > 0) {
    ctx.globalAlpha = Math.min(0.6, truck.hitFlashMs / 400);
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(-w * 0.55, -l * 0.48, w * 1.1, l * 0.92);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
  ctx.restore();
}
