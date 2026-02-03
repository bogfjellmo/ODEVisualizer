
import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { Point, Trajectory, ViewportConfig } from '../types';
import { VectorField } from '../services/odeSolver';

interface PhasePortraitProps {
  field: VectorField;
  trajectories: Trajectory[];
  viewport: ViewportConfig;
  onAddTrajectory: (point: Point) => void;
  eigenvectors?: Point[];
}

const PhasePortrait: React.FC<PhasePortraitProps> = ({ field, trajectories, viewport, onAddTrajectory, eigenvectors = [] }) => {
  const width = 600;
  const height = 600;
  const margin = 50;

  const xScale = useMemo(() => d3.scaleLinear().domain([viewport.minX, viewport.maxX]).range([margin, width - margin]), [viewport]);
  const yScale = useMemo(() => d3.scaleLinear().domain([viewport.minY, viewport.maxY]).range([height - margin, margin]), [viewport]);

  const gridPoints = useMemo(() => {
    const points: { x: number; y: number; dx: number; dy: number; length: number }[] = [];
    const steps = 18;
    const xStep = (viewport.maxX - viewport.minX) / steps;
    const yStep = (viewport.maxY - viewport.minY) / steps;
    
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const x = viewport.minX + i * xStep;
        const y = viewport.minY + j * yStep;
        const d = field({ x, y });
        const mag = Math.sqrt(d.x * d.x + d.y * d.y);
        
        points.push({
          x, y,
          dx: mag === 0 ? 0 : d.x / mag,
          dy: mag === 0 ? 0 : d.y / mag,
          length: mag
        });
      }
    }
    return points;
  }, [field, viewport]);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = xScale.invert(e.clientX - rect.left);
    const y = yScale.invert(e.clientY - rect.top);
    onAddTrajectory({ x, y });
  };

  const lineGenerator = d3.line<Point>().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(d3.curveBasis);

  // Helper to draw lines across the entire viewport for eigenvectors
  const getEigenvectorLine = (v: Point) => {
    const scale = Math.max(viewport.maxX - viewport.minX, viewport.maxY - viewport.minY) * 2;
    return {
      x1: xScale(-v.x * scale),
      y1: yScale(-v.y * scale),
      x2: xScale(v.x * scale),
      y2: yScale(v.y * scale)
    };
  };

  const getArrowHeads = (traj: Trajectory) => {
    const heads: { x: number, y: number, angle: number }[] = [];
    const pts = traj.points;
    if (pts.length < 20) return heads;
    const indices = [Math.floor(pts.length * 0.15), Math.floor(pts.length * 0.45), Math.floor(pts.length * 0.75)];
    indices.forEach(idx => {
      const p1 = pts[idx], p2 = pts[Math.min(idx + 1, pts.length - 1)];
      if (!p1 || !p2) return;
      const sx1 = xScale(p1.x), sy1 = yScale(p1.y), sx2 = xScale(p2.x), sy2 = yScale(p2.y);
      heads.push({ x: sx1, y: sy1, angle: Math.atan2(sy2 - sy1, sx2 - sx1) });
    });
    return heads;
  };

  return (
    <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden select-none">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onClick={handleSvgClick}
        className="cursor-crosshair block mx-auto bg-slate-50/30"
      >
        <defs>
          <clipPath id="portrait-clip">
            <rect x={margin} y={margin} width={width - 2 * margin} height={height - 2 * margin} />
          </clipPath>
        </defs>

        <g className="grid-lines opacity-[0.05]">
          {xScale.ticks(10).map(t => <line key={`v-${t}`} x1={xScale(t)} y1={margin} x2={xScale(t)} y2={height - margin} stroke="black" />)}
          {yScale.ticks(10).map(t => <line key={`h-${t}`} x1={margin} y1={yScale(t)} x2={width - margin} y2={yScale(t)} stroke="black" />)}
        </g>

        {/* Axes */}
        <line x1={margin} y1={yScale(0)} x2={width - margin} y2={yScale(0)} stroke="#64748b" strokeWidth="1" opacity="0.3" />
        <line x1={xScale(0)} y1={margin} x2={xScale(0)} y2={height - margin} stroke="#64748b" strokeWidth="1" opacity="0.3" />

        {/* Eigenvectors (Invariant Lines) */}
        <g clipPath="url(#portrait-clip)">
          {eigenvectors.map((v, i) => {
            const line = getEigenvectorLine(v);
            return (
              <line 
                key={`eigen-${i}`} 
                x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} 
                stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5,5" opacity="0.6" 
              />
            );
          })}
        </g>

        <g className="direction-field">
          {gridPoints.map((p, i) => {
            const arrowSize = 10;
            const x1 = xScale(p.x), y1 = yScale(p.y);
            return (
              <line key={`arrow-${i}`} x1={x1} y1={y1} x2={x1 + p.dx * arrowSize} y2={y1 - p.dy * arrowSize} stroke="#3b82f6" strokeWidth="1" opacity="0.25" />
            );
          })}
        </g>

        <g className="trajectories" clipPath="url(#portrait-clip)">
          {trajectories.map((traj) => (
            <g key={traj.id}>
              <path d={lineGenerator(traj.points) || ''} fill="none" stroke={traj.color} strokeWidth="2.5" className="opacity-90" />
              {getArrowHeads(traj).map((head, hi) => (
                <path
                  key={`${traj.id}-h-${hi}`}
                  d="M -4 -3 L 4 0 L -4 3 Z"
                  transform={`translate(${head.x}, ${head.y}) rotate(${(head.angle * 180) / Math.PI})`}
                  fill={traj.color}
                />
              ))}
            </g>
          ))}
        </g>
      </svg>
      <div className="absolute bottom-4 right-4 flex items-center gap-4 pointer-events-none">
        {eigenvectors.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
            <span className="w-3 h-0.5 bg-amber-500 border-dashed border-b border-amber-500"></span>
            Eigenvectors
          </div>
        )}
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Click to trace path
        </div>
      </div>
    </div>
  );
};

export default PhasePortrait;
