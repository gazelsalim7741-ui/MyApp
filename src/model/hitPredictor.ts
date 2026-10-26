import hitModelRaw from '../assets/hit_model.json';
import hitEvalData from './hitEvaluationData.json';

export interface HitTreeData {
  l: number[];
  r: number[];
  f: number[];
  t: number[];
  p: number[];
}

export interface HitModelData {
  features: string[];
  trees: HitTreeData[];
}

export const HIT_FEATURES = [
  'danceability',
  'energy',
  'loudness',
  'speechiness',
  'acousticness',
  'instrumentalness',
  'valence',
  'tempo',
  'duration_min',
];

export const HIT_DEFAULTS = [0.65, 0.65, -6.0, 0.08, 0.2, 0.0, 0.5, 120.0, 3.5];

export const HIT_EVALUATION = hitEvalData;

export class HitPredictor {
  readonly features: string[];
  private readonly trees: HitTreeData[];

  constructor(data: HitModelData) {
    this.features = data.features;
    this.trees = data.trees;
  }

  hitProbability(x: number[]): number {
    let sum = 0.0;
    for (const tr of this.trees) {
      let k = 0;
      while (tr.l[k] !== -1) {
        const val = x[tr.f[k]];
        k = val <= tr.t[k] ? tr.l[k] : tr.r[k];
      }
      sum += tr.p[k];
    }
    return sum / this.trees.length;
  }

  getSensitivityCurve(
    baseVector: number[],
    featureIdx: number,
    minVal: number,
    maxVal: number,
    steps: number = 25
  ): { val: number; prob: number }[] {
    const points: { val: number; prob: number }[] = [];
    const stepSize = (maxVal - minVal) / steps;

    for (let i = 0; i <= steps; i++) {
      const val = minVal + i * stepSize;
      const testVec = [...baseVector];
      testVec[featureIdx] = val;
      const prob = this.hitProbability(testVec);
      points.push({ val: Math.round(val * 100) / 100, prob: Math.round(prob * 1000) / 1000 });
    }
    return points;
  }

  static load(): HitPredictor {
    return new HitPredictor(hitModelRaw as unknown as HitModelData);
  }
}
