import { VIEWPORT } from '../data/balance';

/**
 * 픽셀아트 레트로 스타일의 핵심 — 게임을 저해상도 오프스크린 버퍼에 그린 뒤, 스무딩을 끈 채
 * 실제 캔버스로 정수배 업스케일(니어리스트 네이버)한다. 이 한 단계가 부드러운 벡터 그림을 즉시
 * "도트가 큼직한" 레트로 룩으로 바꿔준다.
 *
 * PIXEL_SCALE이 클수록 도트가 커지고 해상도가 낮아진다. 2 => 240×427 버퍼(가독성/레트로 균형점).
 * 상수만 바꾸면 도트 크기를 조절할 수 있다(3으로 올리면 더 거칠고 복고적).
 */
export const PIXEL_SCALE = 2;

export const BUFFER_W = Math.round(VIEWPORT.width / PIXEL_SCALE);
export const BUFFER_H = Math.round(VIEWPORT.height / PIXEL_SCALE);

export interface PixelBuffer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export function createPixelBuffer(): PixelBuffer {
  const canvas = document.createElement('canvas');
  canvas.width = BUFFER_W;
  canvas.height = BUFFER_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('픽셀 버퍼 2D 컨텍스트를 만들 수 없습니다.');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/**
 * 저해상도 버퍼를 실제(풀 해상도) 캔버스로 니어리스트 네이버 업스케일한다.
 * VIEWPORT 좌표계를 그대로 쓰는 렌더 코드가 버퍼에 그려지도록, 그리기 전 버퍼 컨텍스트에
 * scale(1/PIXEL_SCALE)을 적용해 반환한다(호출부는 이 컨텍스트에 VIEWPORT 좌표로 그리면 됨).
 */
export function beginPixelFrame(buffer: PixelBuffer): CanvasRenderingContext2D {
  const b = buffer.ctx;
  b.setTransform(1, 0, 0, 1, 0, 0);
  b.imageSmoothingEnabled = false;
  b.clearRect(0, 0, BUFFER_W, BUFFER_H);
  b.save();
  b.scale(1 / PIXEL_SCALE, 1 / PIXEL_SCALE);
  return b;
}

export function endPixelFrame(buffer: PixelBuffer, target: CanvasRenderingContext2D) {
  buffer.ctx.restore();
  target.imageSmoothingEnabled = false;
  target.clearRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  target.drawImage(buffer.canvas, 0, 0, BUFFER_W, BUFFER_H, 0, 0, VIEWPORT.width, VIEWPORT.height);
}
