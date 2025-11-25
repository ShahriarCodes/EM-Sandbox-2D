
import React from 'react';
import { SimulationParams } from '../types';
import { Play, Pause, RotateCcw, Activity, Palette } from 'lucide-react';

interface ControlsProps {
  params: SimulationParams;
  onParamChange: (newParams: SimulationParams) => void;
  isRunning: boolean;
  onToggleRun: () => void;
  onReset: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  params,
  onParamChange,
  isRunning,
  onToggleRun,
  onReset,
}) => {
  const handleChange = (key: keyof SimulationParams, value: string | boolean) => {
    if (typeof value === 'boolean') {
      onParamChange({ ...params, [key]: value });
    } else if (key === 'vectorColor' || key === 'colorMap') {
      onParamChange({ ...params, [key]: value as any });
    } else {
      const numVal = parseFloat(value as string);
      if (!isNaN(numVal)) {
        onParamChange({ ...params, [key]: numVal });
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-neutral-900 text-neutral-200 w-full md:w-80 border-r border-neutral-700 h-full overflow-y-auto">
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-white">EM Sandbox 2D</h1>
        <p className="text-xs text-neutral-400">
          Poisson solver (Finite Difference)
          <br />
          Grid: {params.gridSize}x{params.gridSize}
        </p>
      </div>

      {/* Main Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onToggleRun}
          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md font-semibold transition-colors ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <Pause size={18} /> Pause
            </>
          ) : (
            <>
              <Play size={18} /> Run
            </>
          )}
        </button>

        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
        >
          <RotateCcw size={18} /> Reset
        </button>
      </div>

      <hr className="border-neutral-700" />

      {/* Inputs */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Visuals
        </h2>

        {/* Color Map Selector */}
        <div className="bg-neutral-800 p-3 rounded border border-neutral-700 space-y-2">
           <div className="flex items-center gap-2 text-sm mb-1">
              <Palette size={16} className="text-pink-400"/>
              <span>Color Map</span>
            </div>
           <select
            value={params.colorMap}
            onChange={(e) => handleChange('colorMap', e.target.value)}
            className="w-full bg-neutral-700 border border-neutral-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="turbo">Turbo (Default)</option>
            <option value="jet">Jet (Rainbow)</option>
            <option value="hot">Hot (Red-Yellow)</option>
            <option value="magma">Magma (Dark)</option>
            <option value="gray">Grayscale</option>
          </select>
        </div>

        {/* Vectors Control */}
        <div className="bg-neutral-800 p-3 rounded border border-neutral-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              <Activity size={16} className="text-blue-400"/>
              <span>E-Field Vectors</span>
            </div>
            <input 
              type="checkbox"
              checked={params.showVectors}
              onChange={(e) => handleChange('showVectors', e.target.checked)}
              className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
            />
          </div>
          
          {params.showVectors && (
            <div className="space-y-3 pt-2 border-t border-neutral-700">
               <div className="flex items-center justify-between">
                  <label className="text-xs text-neutral-400">Color</label>
                  <input 
                    type="color" 
                    value={params.vectorColor}
                    onChange={(e) => handleChange('vectorColor', e.target.value)}
                    className="w-8 h-8 bg-transparent cursor-pointer rounded overflow-hidden"
                  />
               </div>
               <div className="space-y-1">
                  <div className="flex justify-between">
                     <label className="text-xs text-neutral-400">Opacity</label>
                     <span className="text-xs text-neutral-500">{params.vectorOpacity}</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="1" step="0.1"
                    value={params.vectorOpacity}
                    onChange={(e) => handleChange('vectorOpacity', e.target.value)}
                    className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
               </div>
               <div className="space-y-1">
                  <div className="flex justify-between">
                     <label className="text-xs text-neutral-400">Stroke Width</label>
                     <span className="text-xs text-neutral-500">{params.vectorWidth}px</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="4" step="0.5"
                    value={params.vectorWidth}
                    onChange={(e) => handleChange('vectorWidth', e.target.value)}
                    className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
               </div>
            </div>
          )}
        </div>

        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mt-6">
          Dielectrics
        </h2>
        
        <div className="space-y-1">
          <label className="block text-sm">Slab Permittivity (ε)</label>
          <input
            type="number"
            value={params.epsilonSlab}
            onChange={(e) => handleChange('epsilonSlab', e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            step="0.5"
            min="1"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm">Background (ε₀)</label>
          <input
            type="number"
            value={params.epsilonBg}
            onChange={(e) => handleChange('epsilonBg', e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            step="0.5"
            min="1"
          />
        </div>

        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mt-6">
          Boundaries
        </h2>

        <div className="space-y-1">
          <label className="block text-sm">Top Voltage (V+)</label>
          <input
            type="number"
            value={params.voltageTop}
            onChange={(e) => handleChange('voltageTop', e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm">Bottom Voltage (V-)</label>
          <input
            type="number"
            value={params.voltageBottom}
            onChange={(e) => handleChange('voltageBottom', e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
};

export default Controls;
