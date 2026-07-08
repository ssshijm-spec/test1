/**
 * 한손 조작 입력 처리.
 * - 터치/마우스 드래그: 손가락(포인터) x 위치 → 그 위치가 속한 레인을 즉시 목표 레인으로 설정.
 * - 데스크톱 키보드: 방향키/A-D 한 번 입력 = 레인 한 칸 이동(연타 방지를 위해 keydown 엣지에서만 반응).
 * 실제 트럭의 이동은 렌더/시뮬레이션 쪽에서 목표 레인으로 부드럽게 보간한다.
 */
export class InputController {
  private targetLane = 1;
  private laneCount: number;
  private pointerActive = false;

  constructor(
    private element: HTMLElement,
    laneCount: number,
  ) {
    this.laneCount = laneCount;
    this.bind();
  }

  getTargetLane(): number {
    return this.targetLane;
  }

  setLaneCount(n: number) {
    this.laneCount = n;
    this.targetLane = Math.min(this.targetLane, n - 1);
  }

  reset() {
    this.targetLane = Math.floor(this.laneCount / 2);
  }

  private bind() {
    const toLane = (clientX: number) => {
      const rect = this.element.getBoundingClientRect();
      const relX = Math.min(Math.max(clientX - rect.left, 0), rect.width - 1);
      return Math.floor((relX / rect.width) * this.laneCount);
    };

    this.element.addEventListener('pointerdown', (e) => {
      this.pointerActive = true;
      this.targetLane = toLane(e.clientX);
    });
    this.element.addEventListener('pointermove', (e) => {
      if (!this.pointerActive) return;
      this.targetLane = toLane(e.clientX);
    });
    window.addEventListener('pointerup', () => {
      this.pointerActive = false;
    });
    window.addEventListener('pointercancel', () => {
      this.pointerActive = false;
    });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.targetLane = Math.max(0, this.targetLane - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.targetLane = Math.min(this.laneCount - 1, this.targetLane + 1);
      }
    });
  }
}
