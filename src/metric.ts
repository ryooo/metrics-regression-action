import { readFileSync } from 'fs';
import { basename } from 'path';

export type MetricsFileContents = {
  [key in string]: {
    value: number;
    threshold?: number;
    unit?: string;
    decimalDigits?: number;
  };
};

export type Metric = {
  type: 'metric';
  fileName: string;
  metricName: string;
  value: number;
  threshold: number;
  unit: string;
  decimalDigits: number;
};

export type ComparedMetric = {
  type: 'compared-metric';
  fileName: string;
  metricName: string;
  actualStr: string;
  expectedStr: string;
  diffStr: string;
  within: boolean;

  actual: Metric;
  expected: Metric;
};

export const isComparedMetric = (n: Metric | ComparedMetric): n is ComparedMetric => n.type === 'compared-metric';

export const parseMetricsFile = (path: string): Metric[] => {
  const fileContents = JSON.parse(readFileSync(path, 'utf8')) as MetricsFileContents;
  const metrics: Metric[] = [];
  for (const metricName in fileContents) {
    const h = fileContents[metricName];
    if (h.value !== undefined) {
      metrics.push({
        type: 'metric',
        fileName: basename(path),
        metricName,
        value: h.value,
        threshold: h.threshold || 1,
        unit: h.unit || '',
        decimalDigits: h.decimalDigits || 2,
      });
    }
  }
  return metrics;
};

export const sortMetricsFunc = (a: Metric, b: Metric): number => {
  if (a.fileName === b.fileName) {
    return a.metricName < b.metricName ? -1 : 1;
  }
  return a.fileName < b.fileName ? -1 : 1;
};

export const isSameMetric = (a: Metric, b: Metric): boolean => {
  return a.fileName === b.fileName && a.metricName === b.metricName;
};

export const compareMetrics = (expected: Metric, actual: Metric): ComparedMetric => {
  const diff = actual.value - expected.value;
  const diffStr = numberToStr(diff, actual.decimalDigits, actual.unit);
  return {
    type: 'compared-metric',
    fileName: actual.fileName,
    metricName: actual.metricName,
    actualStr: numberToStr(actual.value, actual.decimalDigits, actual.unit),
    expectedStr: numberToStr(expected.value, actual.decimalDigits, actual.unit),
    diffStr: diffStr === '0' ? `±0${actual.unit}` : diff > 0 ? `+${diffStr}` : `${diffStr}`,
    within: Math.abs(diff) <= actual.threshold,

    actual,
    expected,
  };
};

const numberToStr = (value: number, digit: number, unit: string): string => {
  if (digit > 0) {
    const base = Math.pow(10, digit);
    return (Math.floor(value * base) / base).toString() + unit;
  }
  return Math.floor(value).toString() + unit;
};

export const metricToTd = (m: Metric | ComparedMetric): string => {
  const fileName = m.fileName.replace('.json', '');
  const val = isComparedMetric(m) ? `${m.actualStr}(${m.diffStr})` : numberToStr(m.value, m.decimalDigits, m.unit);
  return `| ${fileName} | ${m.metricName} | ${val} |${debugPrint(m)}`;
};

const debugPrint = (m: Metric | ComparedMetric): string => {
  if (isComparedMetric(m)) {
    return `<!-- expected: ${JSON.stringify(m.expected)}, actual: ${JSON.stringify(m.actual)} -->`;
  }
  return `<!-- actual: ${JSON.stringify(m)} -->`;
};
