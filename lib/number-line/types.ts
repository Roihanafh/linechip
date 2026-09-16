export type Operation = '+' | '-';
export type CarDirection = 'left' | 'right';

export interface NumberLineCanvasProps {
  num1: number;
  num2: number;
  operation: Operation;
  runKey?: number;
  onResult?: (result: number) => void;
}

export interface InputPanelProps {
  num1: number;
  num2: number;
  operation: Operation;
  onNum1Change: (val: number) => void;
  onNum2Change: (val: number) => void;
  onCalculate: () => void;
  onShowInstructions: () => void;
}

export interface ResultPanelProps {
  num1: number;
  num2: number;
  operation: Operation;
  result: number | null;
}

export interface InstructionModalProps {
  operationType: 'addition' | 'subtraction';
  isOpen: boolean;
  onClose: () => void;
}

export type AnimPhase = 'IDLE' | 'PHASE_1' | 'PHASE_2' | 'DONE';

export interface ScrollState {
  scrollOffset: number;       // px dari kiri canvas virtual
  virtualWidth: number;       // total lebar canvas virtual (px)
  tickSpacing: number;        // px per unit bilangan bulat (default 60)
  viewportWidth: number;      // lebar container yang terlihat (px)
}

export interface ScrollableTickLayout {
  uniqueTicks: number[];      // semua nilai tick yang ada
  minTick: number;            // tick paling kiri
  maxTick: number;            // tick paling kanan
  tickSpacing: number;        // px per unit (60 default, min 30)
  virtualWidth: number;       // total lebar canvas virtual
  // Fungsi konversi: nilai → posisi piksel pada canvas virtual
  toPixel: (value: number) => number;
}
