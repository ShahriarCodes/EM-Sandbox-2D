
export type ColorMapType = 'turbo' | 'jet' | 'hot' | 'gray' | 'magma';

export interface SimulationParams {
  gridSize: number;
  epsilonSlab: number;
  epsilonBg: number;
  voltageTop: number;
  voltageBottom: number;
  showVectors: boolean;
  vectorColor: string;
  vectorOpacity: number;
  vectorWidth: number;
  colorMap: ColorMapType;
}

export interface SlabState {
  x: number; // Grid coordinates (0-100)
  y: number;
  width: number;
  height: number;
}

export type SolverState = 'RUNNING' | 'PAUSED';

// Used for the color map interpolation
export interface ColorStop {
  val: number;
  r: number;
  g: number;
  b: number;
}
