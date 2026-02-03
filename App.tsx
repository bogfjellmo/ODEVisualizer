
import React, { useState, useMemo, useEffect } from 'react';
import { ModelType, Trajectory, Point, ViewportConfig } from './types';
import { solveODE, createVectorField, analyzeLinearSystem } from './services/odeSolver';
import PhasePortrait from './components/PhasePortrait';

const App: React.FC = () => {
  const [activeModel, setActiveModel] = useState<ModelType>('linear');
  const [trajectories, setTrajectories] = useState<Trajectory[]>([]);
  
  // Parameter State
  const [linearParams, setLinearParams] = useState({ a: '0', b: '-1', c: '1', d: '0' });
  const [lvParams, setLvParams] = useState({ a: '1.5', b: '0.1', c: '0.02', d: '0.5' });
  const [customExpr, setCustomExpr] = useState({ dx: 'y', dy: '-x - 0.2*y' });

  // Viewport configuration based on model
  const viewport: ViewportConfig = useMemo(() => {
    if (activeModel === 'lotka-volterra') return { minX: 0, maxX: 50, minY: 0, maxY: 50 };
    return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
  }, [activeModel]);

  // Derive active vector field
  const vectorField = useMemo(() => {
    if (activeModel === 'linear') {
      const a = parseFloat(linearParams.a) || 0;
      const b = parseFloat(linearParams.b) || 0;
      const c = parseFloat(linearParams.c) || 0;
      const d = parseFloat(linearParams.d) || 0;
      return createVectorField(`${a}*x + ${b}*y`, `${c}*x + ${d}*y`);
    } else if (activeModel === 'lotka-volterra') {
      const a = parseFloat(lvParams.a) || 0;
      const b = parseFloat(lvParams.b) || 0;
      const c = parseFloat(lvParams.c) || 0;
      const d = parseFloat(lvParams.d) || 0;
      return createVectorField(`${a}*x - ${b}*x*y`, `${c}*x*y - ${d}*y`);
    } else {
      return createVectorField(customExpr.dx, customExpr.dy);
    }
  }, [activeModel, linearParams, lvParams, customExpr]);

  // Special analysis for linear mode
  const linearAnalysis = useMemo(() => {
    if (activeModel !== 'linear') return null;
    const a = parseFloat(linearParams.a) || 0;
    const b = parseFloat(linearParams.b) || 0;
    const c = parseFloat(linearParams.c) || 0;
    const d = parseFloat(linearParams.d) || 0;
    return analyzeLinearSystem(a, b, c, d);
  }, [activeModel, linearParams]);

  const handleAddTrajectory = (initial: Point) => {
    const points = solveODE(vectorField, initial, 1500, 0.03);
    const newTraj: Trajectory = {
      id: Math.random().toString(36).substr(2, 9),
      points,
      initial,
      color: `hsl(${Math.random() * 360}, 65%, 45%)`
    };
    setTrajectories(prev => [...prev.slice(-4), newTraj]);
  };

  const clearTrajectories = () => setTrajectories([]);

  useEffect(() => {
    clearTrajectories();
  }, [activeModel]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <header className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
              PhaseFlow
            </h1>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Multi-model ODE Explorer</p>
          </div>
          
          <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200 shadow-inner">
            {(['linear', 'lotka-volterra', 'custom'] as ModelType[]).map(type => (
              <button
                key={type}
                onClick={() => setActiveModel(type)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  activeModel === type 
                  ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {type.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xs font-black mb-6 text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-sliders text-blue-500"></i> System Configuration
            </h2>

            {activeModel === 'linear' && (
              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 font-medium mb-2 italic">x' = ax + by, y' = cx + dy</p>
                <div className="grid grid-cols-2 gap-4">
                  {(['a', 'b', 'c', 'd'] as const).map(k => (
                    <div key={k}>
                      <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">{k}</label>
                      <input 
                        type="text" 
                        value={linearParams[k]} 
                        onChange={e => setLinearParams(p => ({...p, [k]: e.target.value}))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                {linearAnalysis && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                      <span>Eigenvalues</span>
                    </div>
                    {linearAnalysis.eigenvalues.map((ev, idx) => (
                      <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-100 font-mono text-xs flex justify-between">
                        <span className="text-slate-400">λ{idx+1}</span>
                        <span className="font-bold">
                          {ev.real.toFixed(3)}
                          {Math.abs(ev.imag) > 1e-4 ? `${ev.imag > 0 ? '+' : ''}${ev.imag.toFixed(3)}i` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeModel === 'lotka-volterra' && (
              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 font-medium mb-2 italic">x' = ax - bxy, y' = cxy - dy</p>
                {[
                  { k: 'a', label: 'Prey Growth (a)' },
                  { k: 'b', label: 'Predation (b)' },
                  { k: 'c', label: 'Reproduction (c)' },
                  { k: 'd', label: 'Predator Death (d)' }
                ].map(f => (
                  <div key={f.k}>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">{f.label}</label>
                    <input 
                      type="text" 
                      value={(lvParams as any)[f.k]} 
                      onChange={e => setLvParams(p => ({...p, [f.k]: e.target.value}))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeModel === 'custom' && (
              <div className="space-y-4">
                <p className="text-[11px] text-slate-400 font-medium mb-2 italic">Enter custom expressions using x and y. (Unstable) </p>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">dx/dt</label>
                  <input 
                    type="text" 
                    value={customExpr.dx} 
                    onChange={e => setCustomExpr(p => ({...p, dx: e.target.value}))}
                    placeholder="e.g. y"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">dy/dt</label>
                  <input 
                    type="text" 
                    value={customExpr.dy} 
                    onChange={e => setCustomExpr(p => ({...p, dy: e.target.value}))}
                    placeholder="e.g. -x"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button 
              onClick={clearTrajectories}
              className="w-full mt-8 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200"
            >
              Clear Plot
            </button>
          </section>

          <section className="bg-blue-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-100">
            <h3 className="text-xs font-black uppercase tracking-widest mb-2">Pro Tip</h3>
            <p className="text-xs font-medium leading-relaxed opacity-90">
              Interactive tracing is active! Click any point on the phase portrait to see how the system evolves from that initial state.
            </p>
          </section>
        </aside>

        <div className="lg:col-span-8">
          <PhasePortrait 
            field={vectorField} 
            trajectories={trajectories} 
            viewport={viewport}
            onAddTrajectory={handleAddTrajectory} 
            eigenvectors={linearAnalysis?.eigenvectors}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
