
export type ModelType = 'linear' | 'lotka-volterra' | 'custom';

export interface Point {
  x: number;
  y: number;
}

export interface Trajectory {
  id: string;
  points: Point[];
  initial: Point;
  color: string;
}

export interface SystemDefinition {
  type: ModelType;
  params: Record<string, string>;
  expressions: {
    dx: string;
    dy: string;
  };
}

export interface ViewportConfig {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Added Matrix2x2 interface for linear system components
export interface Matrix2x2 {
  a: string | number;
  b: string | number;
  c: string | number;
  d: string | number;
}

// Added EquilibriumAnalysis interface for system property details
export interface EquilibriumAnalysis {
  trace: string | number;
  determinant: string | number;
  discriminant: string | number;
  classification: string;
  stability: string;
  eigenvalues: any;
  eigenvectors: any;
}
