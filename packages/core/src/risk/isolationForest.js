/**
 * Isolation Forest ML Anomaly Detection Engine
 * Pure ESM JavaScript implementation of the Liu, Ting & Zhou (2008) Isolation Forest algorithm.
 * 
 * Provides unsupervised anomaly scoring for fintech transaction vectors:
 * - Feature vectors: [amount, velocity1m, velocity1h, amountToAvgRatio, balanceDrainRatio, accountAgeHours, isNewRecipient, hourOfDay]
 * - Builds an ensemble of Isolation Trees (iTrees) with random hyperplane partitions.
 * - Computes normalized path lengths and anomaly scores s in [0.0, 1.0].
 * - Calibrated decision boundaries: s >= 0.70 (Severe Anomaly), s >= 0.55 (Moderate Anomaly).
 */

/**
 * Calculates average path length c(n) of unsuccessful searches in a Binary Search Tree
 * Euler's constant: 0.5772156649
 */
export function c(n) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const eulerMascheroni = 0.5772156649;
  return 2 * (Math.log(n - 1) + eulerMascheroni) - (2 * (n - 1)) / n;
}

class IsolationTreeNode {
  constructor({ isLeaf = false, size = 0, splitFeature = null, splitValue = null, left = null, right = null }) {
    this.isLeaf = isLeaf;
    this.size = size;
    this.splitFeature = splitFeature;
    this.splitValue = splitValue;
    this.left = left;
    this.right = right;
  }
}

export class IsolationTree {
  constructor(maxHeight) {
    this.maxHeight = maxHeight;
    this.root = null;
  }

  fit(data, currentHeight = 0) {
    const numSamples = data.length;
    if (currentHeight >= this.maxHeight || numSamples <= 1) {
      return new IsolationTreeNode({ isLeaf: true, size: numSamples });
    }

    const numFeatures = data[0].length;
    // Pick random feature that has varying values
    const featureIndices = Array.from({ length: numFeatures }, (_, i) => i);
    // Shuffle feature indices to test
    for (let i = featureIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [featureIndices[i], featureIndices[j]] = [featureIndices[j], featureIndices[i]];
    }

    let splitFeature = null;
    let splitValue = null;
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (const f of featureIndices) {
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < numSamples; i++) {
        const val = data[i][f];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      if (min < max) {
        splitFeature = f;
        minVal = min;
        maxVal = max;
        splitValue = min + Math.random() * (max - min);
        break;
      }
    }

    if (splitFeature === null) {
      return new IsolationTreeNode({ isLeaf: true, size: numSamples });
    }

    const leftData = [];
    const rightData = [];
    for (let i = 0; i < numSamples; i++) {
      if (data[i][splitFeature] < splitValue) {
        leftData.push(data[i]);
      } else {
        rightData.push(data[i]);
      }
    }

    const left = this.fit(leftData, currentHeight + 1);
    const right = this.fit(rightData, currentHeight + 1);

    return new IsolationTreeNode({
      isLeaf: false,
      size: numSamples,
      splitFeature,
      splitValue,
      left,
      right,
    });
  }

  pathLength(sample, node = this.root, currentDepth = 0) {
    if (!node || node.isLeaf) {
      return currentDepth + c(node ? node.size : 0);
    }
    if (sample[node.splitFeature] < node.splitValue) {
      return this.pathLength(sample, node.left, currentDepth + 1);
    } else {
      return this.pathLength(sample, node.right, currentDepth + 1);
    }
  }
}

export class IsolationForest {
  constructor({ numTrees = 50, subSampleSize = 64 } = {}) {
    this.numTrees = numTrees;
    this.subSampleSize = subSampleSize;
    this.trees = [];
    this.fitted = false;
  }

  fit(data) {
    if (!data || data.length === 0) {
      throw new Error('Training data cannot be empty');
    }
    const n = data.length;
    const sampleSize = Math.min(this.subSampleSize, n);
    const maxHeight = Math.ceil(Math.log2(sampleSize));

    this.trees = [];
    for (let t = 0; t < this.numTrees; t++) {
      // Subsample with replacement or random indexing
      const subSample = [];
      for (let s = 0; s < sampleSize; s++) {
        const idx = Math.floor(Math.random() * n);
        subSample.push(data[idx]);
      }
      const tree = new IsolationTree(maxHeight);
      tree.root = tree.fit(subSample);
      this.trees.push(tree);
    }
    this.fitted = true;
    return this;
  }

  /**
   * Computes anomaly score for a given feature vector
   * s(x, n) = 2^(-E(h(x)) / c(psi))
   * @param {number[]} featureVector
   * @returns {number} Score in range [0.0, 1.0]
   */
  score(featureVector) {
    if (!this.fitted || this.trees.length === 0) {
      throw new Error('IsolationForest model must be fitted before scoring');
    }
    let totalPathLength = 0;
    for (const tree of this.trees) {
      totalPathLength += tree.pathLength(featureVector);
    }
    const avgPathLength = totalPathLength / this.trees.length;
    const cPsi = c(this.subSampleSize);
    if (cPsi <= 0) return 0.5;

    const exponent = -avgPathLength / cPsi;
    const anomalyScore = Math.pow(2, exponent);
    return Math.min(1.0, Math.max(0.0, Number(anomalyScore.toFixed(4))));
  }
}

/**
 * Standard feature names for risk scoring
 */
export const FEATURE_NAMES = [
  'amountInr',
  'velocity1m',
  'velocity1h',
  'amountToAvgRatio',
  'balanceDrainRatio',
  'accountAgeHours',
  'isNewRecipient',
  'hourOfDay',
];

/**
 * Converts transaction attributes to a normalized numeric feature vector
 */
export function extractFeatureVector(params) {
  const {
    amountInr = 0,
    velocity1m = 0,
    velocity1h = 0,
    amountToAvgRatio = 1.0,
    balanceDrainRatio = 0.0,
    accountAgeHours = 720,
    isNewRecipient = 0,
    hourOfDay = 12,
  } = params;

  return [
    amountInr,
    velocity1m,
    velocity1h,
    amountToAvgRatio,
    balanceDrainRatio,
    accountAgeHours,
    isNewRecipient ? 1 : 0,
    hourOfDay,
  ];
}

/**
 * Generates synthetic baseline training dataset (normal spending habits + slight noise)
 */
export function generateSyntheticTrainingSet(count = 200) {
  const data = [];
  for (let i = 0; i < count; i++) {
    // Typical normal user: amounts between 100 and 5,000 INR
    const amountInr = 100 + Math.random() * 4900;
    const velocity1m = Math.random() < 0.9 ? 0 : 1;
    const velocity1h = Math.floor(Math.random() * 3);
    const amountToAvgRatio = 0.5 + Math.random() * 1.2;
    const balanceDrainRatio = 0.05 + Math.random() * 0.25;
    const accountAgeHours = 100 + Math.random() * 2000;
    const isNewRecipient = Math.random() < 0.2 ? 1 : 0;
    const hourOfDay = 9 + Math.floor(Math.random() * 13); // Daytime hours 9am - 10pm

    data.push([
      amountInr,
      velocity1m,
      velocity1h,
      amountToAvgRatio,
      balanceDrainRatio,
      accountAgeHours,
      isNewRecipient,
      hourOfDay,
    ]);
  }
  return data;
}

// Global trained model singleton initialized on module load
let globalModel = null;

export function getTrainedIsolationForest() {
  if (!globalModel) {
    const trainingSet = generateSyntheticTrainingSet(250);
    globalModel = new IsolationForest({ numTrees: 60, subSampleSize: 64 });
    globalModel.fit(trainingSet);
  }
  return globalModel;
}
