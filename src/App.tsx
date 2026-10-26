import React, { useState, useMemo } from 'react';
import { RandomForest } from './model/randomForest';
import { HitPredictor } from './model/hitPredictor';
import { PredictionGraph } from './components/PredictionGraph';
import { ConfusionMatrix } from './components/ConfusionMatrix';
import { HitPredictorScreen } from './components/HitPredictorScreen';
import { ChevronDown, LineChart, Grid, Laptop, Music } from 'lucide-react';

const DEFAULTS: Record<string, string> = {
  brand: 'Dell',
  processor: 'Intel i5',
  ram: '8 GB',
  storage: '512 GB',
  storage_type: 'SSD',
  condition: 'Good',
  gpu: 'No',
};

const DEFAULT_AGE = '3';

export default function App() {
  const [activeApp, setActiveApp] = useState<'laptop' | 'hitpredict'>('hitpredict');

  const rfModel = useMemo(() => {
    try {
      return RandomForest.load();
    } catch (e) {
      console.error('Failed to load Laptop model', e);
      return null;
    }
  }, []);

  const hitModel = useMemo(() => {
    try {
      return HitPredictor.load();
    } catch (e) {
      console.error('Failed to load Hit model', e);
      return null;
    }
  }, []);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        activeApp === 'hitpredict' ? 'bg-[#121212]' : 'bg-[#F4F7FC]'
      }`}
    >
      {/* Top Application Switcher Bar */}
      <header className="sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-200 bg-black/60 border-neutral-800">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Active Project:
            </span>
          </div>

          <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveApp('hitpredict')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeApp === 'hitpredict'
                  ? 'bg-[#1DB954] text-black shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>HitPredict (MyApp)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveApp('laptop')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeApp === 'laptop'
                  ? 'bg-white text-[#0D2B5E] shadow-md font-bold'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Laptop Predictor</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="py-6 px-4 sm:px-6 flex justify-center">
        <div className="w-full max-w-2xl">
          {activeApp === 'hitpredict' ? (
            hitModel ? (
              <HitPredictorScreen model={hitModel} />
            ) : (
              <div className="p-8 text-center text-red-400">Could not load HitPredict model.</div>
            )
          ) : rfModel ? (
            <LaptopPredictorScreen model={rfModel} />
          ) : (
            <div className="p-8 text-center text-red-600">Could not load Laptop prediction model.</div>
          )}
        </div>
      </main>
    </div>
  );
}

interface LaptopPredictorScreenProps {
  model: RandomForest;
}

function LaptopPredictorScreen({ model }: LaptopPredictorScreenProps) {
  const [sel, setSel] = useState<Record<string, string>>({ ...DEFAULTS });
  const [age, setAge] = useState<string>(DEFAULT_AGE);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [activeAnalysisView, setActiveAnalysisView] = useState<'both' | 'graph' | 'matrix'>('both');

  const parsedAge = useMemo(() => {
    const num = parseInt(age, 10);
    return isNaN(num) ? 3 : Math.max(0, Math.min(10, num));
  }, [age]);

  const handleSelectChange = (key: string, val: string) => {
    setSel((prev) => ({ ...prev, [key]: val }));
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 2);
    setAge(digitsOnly);
    setAgeError(null);
  };

  const predict = () => {
    const trimmed = age.trim();
    const a = trimmed === '' ? null : Number(trimmed);
    if (a === null || isNaN(a) || !Number.isInteger(a) || a < 0 || a > 10) {
      setAgeError('Enter a whole number from 0 to 10');
      setResult(null);
      return;
    }
    setAgeError(null);
    const encoded = model.encode(sel, a);
    const price = model.predict(encoded);
    setResult(Math.round(price / 100.0) * 100.0);
  };

  const reset = () => {
    setSel({ ...DEFAULTS });
    setAge(DEFAULT_AGE);
    setAgeError(null);
    setResult(null);
  };

  const formatPrice = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-[28px] font-bold text-[#0D2B5E] leading-tight">
          Laptop Price Predictor
        </h1>
        <p className="text-[15px] text-[#1E5AA8]">
          Estimate the resale price of a used laptop with on-device machine learning
        </p>
      </div>

      {/* Input Form Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 sm:p-5 space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Dropdown
            label="Brand"
            options={model.options['brand'] || []}
            value={sel['brand']}
            onChange={(val) => handleSelectChange('brand', val)}
          />
          <Dropdown
            label="Processor"
            options={model.options['processor'] || []}
            value={sel['processor']}
            onChange={(val) => handleSelectChange('processor', val)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Dropdown
            label="RAM"
            options={model.options['ram'] || []}
            value={sel['ram']}
            onChange={(val) => handleSelectChange('ram', val)}
          />
          <Dropdown
            label="Storage capacity"
            options={model.options['storage'] || []}
            value={sel['storage']}
            onChange={(val) => handleSelectChange('storage', val)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <Dropdown
            label="Storage type"
            options={model.options['storage_type'] || []}
            value={sel['storage_type']}
            onChange={(val) => handleSelectChange('storage_type', val)}
          />
          <Dropdown
            label="Condition"
            options={model.options['condition'] || []}
            value={sel['condition']}
            onChange={(val) => handleSelectChange('condition', val)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="relative">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Age (years, 0–10)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={age}
              onChange={handleAgeChange}
              placeholder="e.g. 3"
              className={`w-full h-12 px-3.5 rounded-lg border bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 transition-colors ${
                ageError
                  ? 'border-red-500 focus:ring-red-400 focus:border-red-500'
                  : 'border-slate-300 focus:ring-[#1E5AA8]/30 focus:border-[#1E5AA8]'
              }`}
            />
            {ageError && <p className="mt-1 text-xs text-red-600">{ageError}</p>}
          </div>

          <Dropdown
            label="Dedicated graphics"
            options={model.options['gpu'] || []}
            value={sel['gpu']}
            onChange={(val) => handleSelectChange('gpu', val)}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          onClick={predict}
          className="w-full h-[52px] bg-[#0D2B5E] hover:bg-[#091e42] active:bg-[#06152e] text-white text-[17px] font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          Predict Price
        </button>

        <button
          type="button"
          onClick={reset}
          className="w-full h-11 border border-[#0D2B5E] text-[#0D2B5E] hover:bg-slate-100/60 active:bg-slate-100 text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          Reset
        </button>
      </div>

      {/* Prediction Result Display */}
      {result !== null && (
        <div className="bg-[#0D2B5E] text-white rounded-xl p-5 shadow-md">
          <p className="text-[#BFD3F2] text-sm">Estimated resale price</p>
          <p className="text-[34px] font-bold mt-1 tracking-tight">₹ {formatPrice(result)}</p>
        </div>
      )}

      {/* Visual Analytics Selector Tabs */}
      <div className="pt-2">
        <div className="flex items-center justify-between pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Analytics & Validation
          </span>
          <div className="flex bg-slate-200/70 p-1 rounded-lg text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveAnalysisView('both')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeAnalysisView === 'both'
                  ? 'bg-white text-[#0D2B5E] shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              All Views
            </button>
            <button
              type="button"
              onClick={() => setActiveAnalysisView('graph')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeAnalysisView === 'graph'
                  ? 'bg-white text-[#0D2B5E] shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Prediction Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveAnalysisView('matrix')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                activeAnalysisView === 'matrix'
                  ? 'bg-white text-[#0D2B5E] shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Confusion Matrix</span>
            </button>
          </div>
        </div>

        {/* Graph Section */}
        {(activeAnalysisView === 'both' || activeAnalysisView === 'graph') && (
          <div className="mb-5">
            <PredictionGraph
              model={model}
              currentSelection={sel}
              currentAge={parsedAge}
              currentPrice={result}
            />
          </div>
        )}

        {/* Confusion Matrix Section */}
        {(activeAnalysisView === 'both' || activeAnalysisView === 'matrix') && (
          <div className="mb-5">
            <ConfusionMatrix currentPrice={result} />
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-[12px] leading-relaxed text-[#5B6B85] pt-1 pb-4">
        This is only an estimate from a Random Forest model trained on sample data. Actual resale
        prices vary with market and seller.
      </p>
    </div>
  );
}

interface DropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}

function Dropdown({ label, options, value, onChange }: DropdownProps) {
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 pl-3.5 pr-10 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#1E5AA8]/30 focus:border-[#1E5AA8] transition-colors cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
