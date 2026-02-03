
import { Point } from '../types';
import * as math from 'mathjs';

export type VectorField = (p: Point) => Point;

/**
 * Runge-Kutta 4th Order Integrator
 */
export const solveODE = (
  field: VectorField,
  initial: Point,
  steps: number = 1000,
  dt: number = 0.02
): Point[] => {
  const points: Point[] = [initial];
  let current = { ...initial };

  for (let i = 0; i < steps; i++) {
    const k1 = field(current);
    const k2 = field({
      x: current.x + (dt / 2) * k1.x,
      y: current.y + (dt / 2) * k1.y
    });
    const k3 = field({
      x: current.x + (dt / 2) * k2.x,
      y: current.y + (dt / 2) * k2.y
    });
    const k4 = field({
      x: current.x + dt * k3.x,
      y: current.y + dt * k3.y
    });

    current = {
      x: current.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
      y: current.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y)
    };

    if (!isFinite(current.x) || !isFinite(current.y)) break;
    if (Math.abs(current.x) > 1000 || Math.abs(current.y) > 1000) break;
    
    points.push({ ...current });
  }

  return points;
};

/**
 * Creates a vector field function from user-defined expressions.
 */
export const createVectorField = (
  dxExpr: string, 
  dyExpr: string, 
  params: Record<string, number> = {}
): VectorField => {
  try {
    // Handle empty or whitespace-only strings to prevent "Value expected" error
    const safeDx = dxExpr.trim() || '0';
    const safeDy = dyExpr.trim() || '0';
    
    const dxCompiled = math.compile(safeDx);
    const dyCompiled = math.compile(safeDy);

    return (p: Point) => {
      const scope = { x: p.x, y: p.y, ...params };
      return {
        x: dxCompiled.evaluate(scope),
        y: dyCompiled.evaluate(scope)
      };
    };
  } catch (e) {
    // Returning a zero field on error
    return () => ({ x: 0, y: 0 });
  }
};

/**
 * Performs analysis on a 2x2 linear system matrix A = [[a, b], [c, d]]
 */
export const analyzeLinearSystem = (a: number, b: number, c: number, d: number) => {
  const trace = a + d;
  const determinant = a * d - b * c;
  const discriminant = trace * trace - 4 * determinant;
  
  const eigenvalues: { real: number; imag: number }[] = [];
  const eigenvectors: Point[] = [];

  if (discriminant >= 0) {
    const l1 = (trace + Math.sqrt(discriminant)) / 2;
    const l2 = (trace - Math.sqrt(discriminant)) / 2;
    eigenvalues.push({ real: l1, imag: 0 }, { real: l2, imag: 0 });

    // Calculate eigenvectors
    // Case 1: Matrix is not diagonal and b != 0
    const findVector = (lambda: number) => {
      if (Math.abs(b) > 1e-9) return { x: b, y: lambda - a };
      if (Math.abs(c) > 1e-9) return { x: lambda - d, y: c };
      if (lambda === a) return { x: 1, y: 0 };
      if (lambda === d) return { x: 0, y: 1 };
      return { x: 0, y: 0 };
    };

    const v1 = findVector(l1);
    const v2 = findVector(l2);
    
    // Normalize and add if not zero
    const norm = (v: Point) => {
      const m = Math.sqrt(v.x * v.x + v.y * v.y);
      return m > 1e-9 ? { x: v.x / m, y: v.y / m } : null;
    };

    const nv1 = norm(v1);
    const nv2 = norm(v2);
    if (nv1) eigenvectors.push(nv1);
    if (nv2 && (Math.abs(l1 - l2) > 1e-9)) eigenvectors.push(nv2);

  } else {
    const real = trace / 2;
    const imag = Math.sqrt(-discriminant) / 2;
    eigenvalues.push({ real, imag }, { real, imag: -imag });
  }

  return { trace, determinant, discriminant, eigenvalues, eigenvectors };
};
