
export type ColorMapType = 'turbo' | 'jet' | 'hot' | 'gray' | 'magma';
export type AppMode = 'fixed' | 'free';
export type BoundaryType = 'dirichlet' | 'neumann';

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
  // Edge Boundaries
  boundaryTop: BoundaryType;
  boundaryBottom: BoundaryType;
  boundaryLeft: BoundaryType;
  boundaryRight: BoundaryType;
}

export interface SlabState {
  x: number; // Grid coordinates (0-100)
  y: number;
  width: number;
  height: number;
}

export interface PlateState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  voltageParam: 'voltageTop' | 'voltageBottom';
}

export type SolverState = 'RUNNING' | 'PAUSED';

// Used for the color map interpolation
export interface ColorStop {
  val: number;
  r: number;
  g: number;
  b: number;
}
