import { useState, useMemo } from 'react';
import { HitPredictor, HIT_DEFAULTS, HIT_EVALUATION } from '../model/hitPredictor';
import {
  Sparkles,
  TrendingUp,
  Grid,
  RotateCcw,
  CheckCircle,
  XCircle,
  Sliders,
} from 'lucide-react';

interface HitPredictorScreenProps {
  model: HitPredictor;
}

const SLIDER_CONFIGS = [
  { idx: 0, name: 'Danceability', min: 0, max: 1, step: 0.01, hitBenchmark: 0.72 },
  { idx: 1, name: 'Energy', min: 0, max: 1, step: 0.01, hitBenchmark: 0.74 },
  { idx: 3, name: 'Speechiness', min: 0, max: 1, step: 0.01, hitBenchmark: 0.09 },
  { idx: 4, name: 'Acousticness', min: 0, max: 1, step: 0.01, hitBenchmark: 0.18 },
  { idx: 5, name: 'Instrumentalness', min: 0, max: 1, step: 0.01, hitBenchmark: 0.04 },
  { idx: 6, name: 'Valence (Happiness)', min: 0, max: 1, step: 0.01, hitBenchmark: 0.58 },
];

export function HitPredictorScreen({ model }: HitPredictorScreenProps) {
  // Sliders: danceability(0), energy(1), speechiness(3), acousticness(4), instrumentalness(5), valence(6)
  const [sliders, setSliders] = useState<number[]>([
    HIT_DEFAULTS[0],
    HIT_DEFAULTS[1],
    HIT_DEFAULTS[3],
    HIT_DEFAULTS[4],
    HIT_DEFAULTS[5],
    HIT_DEFAULTS[6],
  ]);

  const [loud, setLoud] = useState<string>('-6');
  const [tempo, setTempo] = useState<string>('120');
  const [dur, setDur] = useState<string>('3.5');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ hit: boolean; prob: number } | null>(null);

  // Selected feature for the Sensitivity Graph
  const [selectedFeatureIdx, setSelectedFeatureIdx] = useState<number>(0);
  const [activeGraphSubtab, setActiveGraphSubtab] = useState<'sensitivity' | 'benchmark'>('sensitivity');

  // Construct current feature vector
  const currentVector = useMemo(() => {
    const l = parseFloat(loud) || -6.0;
    const t = parseFloat(tempo) || 120.0;
    const d = parseFloat(dur) || 3.5;
    return [
      sliders[0], // danceability
      sliders[1], // energy
      l,          // loudness
      sliders[2], // speechiness
      sliders[3], // acousticness
      sliders[4], // instrumentalness
      sliders[5], // valence
      t,          // tempo
      d,          // duration
    ];
  }, [sliders, loud, tempo, dur]);

  const handleSliderChange = (sliderIdxInState: number, val: number) => {
    const next = [...sliders];
    next[sliderIdxInState] = Math.round(val * 100) / 100;
    setSliders(next);
  };

  const predict = () => {
    const err: Record<string, string> = {};

    const l = parseFloat(loud);
    if (isNaN(l) || l < -60 || l > 0) {
      err.loud = 'Loudness must be a number from -60 to 0 dB';
    }

    const t = parseFloat(tempo);
    if (isNaN(t) || t < 40 || t > 220) {
      err.tempo = 'Tempo must be a number from 40 to 220 BPM';
    }

    const d = parseFloat(dur);
    if (isNaN(d) || d < 1 || d > 10) {
      err.dur = 'Duration must be a number from 1 to 10 minutes';
    }

    setErrors(err);
    if (Object.keys(err).length > 0) {
      setResult(null);
      return;
    }

    const p = model.hitProbability(currentVector);
    setResult({ hit: p >= 0.5, prob: p });
  };

  const reset = () => {
    setSliders([
      HIT_DEFAULTS[0],
      HIT_DEFAULTS[1],
      HIT_DEFAULTS[3],
      HIT_DEFAULTS[4],
      HIT_DEFAULTS[5],
      HIT_DEFAULTS[6],
    ]);
    setLoud('-6');
    setTempo('120');
    setDur('3.5');
    setErrors({});
    setResult(null);
  };

  // Compute sensitivity curve for selected feature
  const sensitivityData = useMemo(() => {
    let min = 0;
    let max = 1;
    if (selectedFeatureIdx === 2) {
      min = -30;
      max = 0;
    } else if (selectedFeatureIdx === 7) {
      min = 60;
      max = 180;
    } else if (selectedFeatureIdx === 8) {
      min = 1.5;
      max = 7.0;
    }

    const curve = model.getSensitivityCurve(currentVector, selectedFeatureIdx, min, max, 30);
    return { curve, min, max };
  }, [model, currentVector, selectedFeatureIdx]);

  // SVG dimensions for sensitivity curve
  const sWidth = 540;
  const sHeight = 220;
  const sPad = { top: 20, right: 25, bottom: 40, left: 55 };
  const sPlotW = sWidth - sPad.left - sPad.right;
  const sPlotH = sHeight - sPad.top - sPad.bottom;

  const sX = (v: number) =>
    sPad.left + ((v - sensitivityData.min) / (sensitivityData.max - sensitivityData.min || 1)) * sPlotW;
  const sY = (p: number) => sPad.top + sPlotH - p * sPlotH;

  const sensitivityPath = useMemo(() => {
    return sensitivityData.curve.reduce((acc, pt, idx) => {
      const cmd = idx === 0 ? 'M' : 'L';
      return `${acc} ${cmd} ${sX(pt.val).toFixed(1)} ${sY(pt.prob).toFixed(1)}`;
    }, '');
  }, [sensitivityData]);

  const sensitivityArea = useMemo(() => {
    if (sensitivityData.curve.length === 0) return '';
    const firstX = sX(sensitivityData.curve[0].val).toFixed(1);
    const lastX = sX(sensitivityData.curve[sensitivityData.curve.length - 1].val).toFixed(1);
    const baseY = (sPad.top + sPlotH).toFixed(1);
    return `${sensitivityPath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [sensitivityPath]);

  const currentFeatureVal = currentVector[selectedFeatureIdx];

  // Confusion matrix data
  const cm = HIT_EVALUATION.cm;
  const metrics = HIT_EVALUATION.metrics;

  return (
    <div className="space-y-5 text-white">
      {/* Title */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#1DB954] inline-block animate-pulse"></span>
          <h1 className="text-[28px] font-bold text-white tracking-tight">HitPredict</h1>
        </div>
        <p className="text-[15px] font-semibold text-[#1DB954]">
          Spotify Song Hit Predictor
        </p>
        <p className="text-xs text-neutral-400">
          Audio feature analysis based on 60-tree Random Forest classifier from{' '}
          <span className="text-neutral-300 font-mono">gazelsalim7741-ui/MyApp</span>
        </p>
      </div>

      {/* Input Sliders Card */}
      <div className="bg-[#181818] rounded-xl border border-neutral-800 p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#1DB954]" />
            Audio Feature Sliders
          </span>
          <span className="text-xs text-neutral-500">Range: 0.00 – 1.00</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SLIDER_CONFIGS.map((cfg, i) => (
            <div key={cfg.name} className="space-y-1.5 bg-[#1F1F1F] p-3 rounded-lg border border-neutral-800/80">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-300 font-medium">{cfg.name}</span>
                <span className="font-mono font-bold text-[#1DB954] bg-[#121212] px-2 py-0.5 rounded text-[11px]">
                  {sliders[i].toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={sliders[i]}
                onChange={(e) => handleSliderChange(i, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
              />
            </div>
          ))}
        </div>

        {/* Numeric Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Loudness (-60 to 0 dB)
            </label>
            <input
              type="text"
              value={loud}
              onChange={(e) => setLoud(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-[#1F1F1F] border border-neutral-700 text-sm text-white focus:outline-none focus:border-[#1DB954] font-mono"
            />
            {errors.loud && <p className="text-[11px] text-red-400 mt-1">{errors.loud}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Tempo (40 to 220 BPM)
            </label>
            <input
              type="text"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-[#1F1F1F] border border-neutral-700 text-sm text-white focus:outline-none focus:border-[#1DB954] font-mono"
            />
            {errors.tempo && <p className="text-[11px] text-red-400 mt-1">{errors.tempo}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Duration (1 to 10 min)
            </label>
            <input
              type="text"
              value={dur}
              onChange={(e) => setDur(e.target.value)}
              className="w-full h-11 px-3 rounded-lg bg-[#1F1F1F] border border-neutral-700 text-sm text-white focus:outline-none focus:border-[#1DB954] font-mono"
            />
            {errors.dur && <p className="text-[11px] text-red-400 mt-1">{errors.dur}</p>}
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={predict}
            className="w-full h-[50px] bg-[#1DB954] hover:bg-[#1aa34a] text-black text-base font-bold rounded-lg shadow-lg transition-transform active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>Predict Song Hit</span>
          </button>

          <button
            type="button"
            onClick={reset}
            className="w-full h-10 border border-neutral-700 hover:border-neutral-500 text-neutral-300 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Prediction Result Display */}
      {result !== null && (
        <div
          className={`p-5 rounded-xl border transition-all animate-fadeIn ${
            result.hit
              ? 'bg-[#182a1c] border-[#1DB954]/50'
              : 'bg-[#2a1a1a] border-red-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {result.hit ? (
                <CheckCircle className="w-7 h-7 text-[#1DB954]" />
              ) : (
                <XCircle className="w-7 h-7 text-red-400" />
              )}
              <div>
                <p
                  className={`text-2xl font-bold tracking-tight ${
                    result.hit ? 'text-[#1DB954]' : 'text-red-400'
                  }`}
                >
                  {result.hit ? 'Likely Hit' : 'Unlikely Hit'}
                </p>
                <p className="text-xs text-neutral-300">
                  Random Forest hit probability:{' '}
                  <span className="font-bold text-white text-sm">
                    {Math.round(result.prob * 100)}%
                  </span>
                </p>
              </div>
            </div>

            {/* Hit Probability Gauge Badge */}
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-black/40 rounded-full font-mono text-xs font-semibold border border-neutral-700">
                Threshold: ≥ 50%
              </span>
            </div>
          </div>

          <p className="text-[12px] text-neutral-400 mt-3 pt-3 border-t border-neutral-800 leading-relaxed">
            Based only on the audio features you selected. The model was trained on synthetic
            demo data. Real-world success also depends on marketing, audience preferences,
            artist popularity, and release timing.
          </p>
        </div>
      )}

      {/* PREDICTION GRAPHS SECTION */}
      <div className="bg-[#181818] rounded-xl border border-neutral-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#1DB954]" />
              <span>Prediction Graphs</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Interactive sensitivity curve & hit benchmark comparison
            </p>
          </div>

          <div className="flex rounded-lg bg-neutral-900 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveGraphSubtab('sensitivity')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeGraphSubtab === 'sensitivity'
                  ? 'bg-[#1DB954] text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sensitivity Curve
            </button>
            <button
              type="button"
              onClick={() => setActiveGraphSubtab('benchmark')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                activeGraphSubtab === 'benchmark'
                  ? 'bg-[#1DB954] text-black font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Hit Benchmark
            </button>
          </div>
        </div>

        {activeGraphSubtab === 'sensitivity' ? (
          <div className="space-y-3">
            {/* Feature selector chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-neutral-400 mr-1 text-[11px]">Feature:</span>
              {[
                { idx: 0, label: 'Danceability' },
                { idx: 1, label: 'Energy' },
                { idx: 6, label: 'Valence' },
                { idx: 2, label: 'Loudness' },
                { idx: 7, label: 'Tempo' },
              ].map((f) => (
                <button
                  key={f.idx}
                  type="button"
                  onClick={() => setSelectedFeatureIdx(f.idx)}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                    selectedFeatureIdx === f.idx
                      ? 'bg-neutral-700 text-[#1DB954] font-bold border border-[#1DB954]/50'
                      : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* SVG Sensitivity Curve */}
            <div className="relative w-full overflow-x-auto bg-[#121212] p-2 rounded-lg border border-neutral-800">
              <svg viewBox={`0 0 ${sWidth} ${sHeight}`} className="w-full h-auto min-w-[320px] max-h-[220px]">
                <defs>
                  <linearGradient id="hitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1DB954" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#1DB954" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines for Hit Probability (0%, 25%, 50%, 75%, 100%) */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((p, i) => {
                  const yVal = sY(p);
                  return (
                    <g key={i}>
                      <line
                        x1={sPad.left}
                        y1={yVal}
                        x2={sPad.left + sPlotW}
                        y2={yVal}
                        stroke={p === 0.5 ? '#1DB954' : '#2A2A2A'}
                        strokeDasharray={p === 0.5 ? '4 2' : '2 2'}
                        strokeWidth={p === 0.5 ? '1' : '0.8'}
                      />
                      <text
                        x={sPad.left - 6}
                        y={yVal + 3.5}
                        textAnchor="end"
                        fontSize="9"
                        fill={p === 0.5 ? '#1DB954' : '#737373'}
                      >
                        {Math.round(p * 100)}%
                      </text>
                    </g>
                  );
                })}

                {/* 50% Threshold Label */}
                <text
                  x={sPad.left + sPlotW - 6}
                  y={sY(0.5) - 4}
                  textAnchor="end"
                  fontSize="9"
                  fill="#1DB954"
                  fontWeight="bold"
                >
                  Hit Threshold (50%)
                </text>

                {/* Sensitivity Curve Area and Path */}
                <path d={sensitivityArea} fill="url(#hitGradient)" />
                <path
                  d={sensitivityPath}
                  fill="none"
                  stroke="#1DB954"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Current Song Feature Marker */}
                {(() => {
                  const cx = sX(currentFeatureVal);
                  const cy = sY(result ? result.prob : model.hitProbability(currentVector));
                  return (
                    <g>
                      <circle cx={cx} cy={cy} r="6" fill="#1DB954" stroke="#FFFFFF" strokeWidth="2" />
                      <line
                        x1={cx}
                        y1={sPad.top}
                        x2={cx}
                        y2={sPad.top + sPlotH}
                        stroke="#1DB954"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                      <text
                        x={cx + (cx > sPad.left + sPlotW - 80 ? -8 : 8)}
                        y={Math.max(sPad.top + 15, cy - 10)}
                        textAnchor={cx > sPad.left + sPlotW - 80 ? 'end' : 'start'}
                        fontSize="10"
                        fontWeight="bold"
                        fill="#FFFFFF"
                      >
                        Your Song ({currentFeatureVal.toFixed(2)})
                      </text>
                    </g>
                  );
                })()}

                {/* X-axis Label */}
                <text
                  x={sPad.left + sPlotW / 2}
                  y={sHeight - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#A3A3A3"
                >
                  {SLIDER_CONFIGS.find((c) => c.idx === selectedFeatureIdx)?.name || 'Feature Value'}
                </text>
              </svg>
            </div>
            <p className="text-[11px] text-neutral-400">
              Shows how the song&apos;s Hit probability responds as you shift this specific audio attribute.
            </p>
          </div>
        ) : (
          /* BENCHMARK COMPARISON */
          <div className="space-y-3">
            <p className="text-xs text-neutral-400">
              Comparing your song&apos;s audio signature against average hit songs in the training dataset:
            </p>
            <div className="space-y-2.5">
              {SLIDER_CONFIGS.map((cfg, i) => {
                const userVal = sliders[i];
                const benchVal = cfg.hitBenchmark;
                return (
                  <div key={cfg.name} className="space-y-1 bg-[#121212] p-2.5 rounded-lg border border-neutral-800">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-300 font-medium">{cfg.name}</span>
                      <span className="text-neutral-400 text-[11px]">
                        Your Song: <span className="text-[#1DB954] font-bold">{userVal.toFixed(2)}</span> vs Hit Avg:{' '}
                        <span className="text-white font-bold">{benchVal.toFixed(2)}</span>
                      </span>
                    </div>

                    <div className="relative h-3 w-full bg-neutral-800 rounded-full overflow-hidden">
                      {/* Hit benchmark marker */}
                      <div
                        className="absolute top-0 bottom-0 bg-neutral-600 rounded-full"
                        style={{ width: `${benchVal * 100}%` }}
                      ></div>
                      {/* User value overlay */}
                      <div
                        className="absolute top-0 bottom-0 bg-[#1DB954] rounded-full opacity-85"
                        style={{ width: `${userVal * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-neutral-400 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1DB954] inline-block"></span>
                Your Song Value
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-600 inline-block"></span>
                Hit Song Benchmark
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CONFUSION MATRIX SECTION */}
      <div className="bg-[#181818] rounded-xl border border-neutral-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Grid className="w-5 h-5 text-[#1DB954]" />
              <span>Hit / Non-Hit Confusion Matrix</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Binary classification evaluation on 1,600 holdout test songs
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1DB954]/15 border border-[#1DB954]/40 text-[#1DB954] rounded-full text-xs font-bold">
            Accuracy: {(metrics.accuracy * 100).toFixed(1)}%
          </span>
        </div>

        {/* 4 Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-[#121212] p-3 rounded-lg border border-neutral-800 text-center">
            <p className="text-[11px] text-neutral-400">Accuracy</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {(metrics.accuracy * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-neutral-500">1,260 / 1,600 correct</p>
          </div>

          <div className="bg-[#121212] p-3 rounded-lg border border-neutral-800 text-center">
            <p className="text-[11px] text-neutral-400">Precision</p>
            <p className="text-xl font-bold text-[#1DB954] mt-0.5">
              {(metrics.precision * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-neutral-500">Predicted hits correct</p>
          </div>

          <div className="bg-[#121212] p-3 rounded-lg border border-neutral-800 text-center">
            <p className="text-[11px] text-neutral-400">Recall</p>
            <p className="text-xl font-bold text-[#1DB954] mt-0.5">
              {(metrics.recall * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-neutral-500">Actual hits detected</p>
          </div>

          <div className="bg-[#121212] p-3 rounded-lg border border-neutral-800 text-center">
            <p className="text-[11px] text-neutral-400">F1-Score</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {(metrics.f1 * 100).toFixed(1)}%
            </p>
            <p className="text-[10px] text-neutral-500">Harmonic mean</p>
          </div>
        </div>

        {/* 2x2 Matrix Table */}
        <div className="overflow-x-auto pt-1">
          <div className="min-w-[420px]">
            <div className="text-center pb-2 text-xs font-bold uppercase tracking-wider text-neutral-300">
              Predicted Label →
            </div>

            <div className="grid grid-cols-[130px_repeat(2,1fr)] gap-2 text-xs">
              <div className="flex items-end justify-end p-2 text-neutral-500 text-[11px]">
                Actual Label ↓
              </div>

              <div
                className={`p-2 text-center rounded-lg ${
                  result && !result.hit
                    ? 'bg-neutral-800 text-[#1DB954] border border-[#1DB954] font-bold'
                    : 'bg-neutral-900 text-neutral-300 font-semibold'
                }`}
              >
                Predicted Non-Hit
              </div>

              <div
                className={`p-2 text-center rounded-lg ${
                  result && result.hit
                    ? 'bg-neutral-800 text-[#1DB954] border border-[#1DB954] font-bold'
                    : 'bg-neutral-900 text-neutral-300 font-semibold'
                }`}
              >
                Predicted Hit
              </div>

              {/* Row 0: Actual Non-Hit */}
              <div className="flex flex-col justify-center px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="font-semibold text-neutral-200">Actual Non-Hit</span>
                <span className="text-[10px] text-neutral-400 font-mono">n = {cm[0][0] + cm[0][1]}</span>
              </div>

              {/* TN */}
              <div className="p-4 rounded-lg bg-[#142618] border border-[#1DB954]/50 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white">{cm[0][0]}</span>
                <span className="text-[10px] text-[#1DB954] font-semibold mt-0.5">True Negative (TN)</span>
                <span className="text-[10px] text-neutral-400">
                  {Math.round((cm[0][0] / (cm[0][0] + cm[0][1])) * 100)}% of Non-Hits
                </span>
              </div>

              {/* FP */}
              <div className="p-4 rounded-lg bg-[#2A1D1D] border border-amber-500/40 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white">{cm[0][1]}</span>
                <span className="text-[10px] text-amber-400 font-semibold mt-0.5">False Positive (FP)</span>
                <span className="text-[10px] text-neutral-400">
                  {Math.round((cm[0][1] / (cm[0][0] + cm[0][1])) * 100)}% of Non-Hits
                </span>
              </div>

              {/* Row 1: Actual Hit */}
              <div className="flex flex-col justify-center px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="font-semibold text-neutral-200">Actual Hit</span>
                <span className="text-[10px] text-neutral-400 font-mono">n = {cm[1][0] + cm[1][1]}</span>
              </div>

              {/* FN */}
              <div className="p-4 rounded-lg bg-[#2A1D1D] border border-amber-500/40 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white">{cm[1][0]}</span>
                <span className="text-[10px] text-amber-400 font-semibold mt-0.5">False Negative (FN)</span>
                <span className="text-[10px] text-neutral-400">
                  {Math.round((cm[1][0] / (cm[1][0] + cm[1][1])) * 100)}% of Hits
                </span>
              </div>

              {/* TP */}
              <div className="p-4 rounded-lg bg-[#142618] border border-[#1DB954]/50 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white">{cm[1][1]}</span>
                <span className="text-[10px] text-[#1DB954] font-semibold mt-0.5">True Positive (TP)</span>
                <span className="text-[10px] text-neutral-400">
                  {Math.round((cm[1][1] / (cm[1][0] + cm[1][1])) * 100)}% of Hits
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#121212] rounded-lg border border-neutral-800 text-xs text-neutral-400 flex items-center justify-between">
          <span>Green quadrants represent correct predictions (83.8% diagonal agreement).</span>
          {result && (
            <span className="text-[#1DB954] font-semibold">
              Your song classified as: {result.hit ? 'Predicted Hit (Right Column)' : 'Predicted Non-Hit (Left Column)'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
