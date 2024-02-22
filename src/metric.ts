import { readFileSync } from 'fs';
import { basename } from 'path';

export type MetricsFileContents = { [key in string]: number };

export type Metric = {
  type: 'metric';
  fileName: string;
  metricName: string;
  value: number;
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
    metrics.push({
      type: 'metric',
      fileName: basename(path),
      metricName,
      value: fileContents[metricName],
    });
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
  const diffStr = numberToStr(diff, 1);
  const threshold = 1; // TODO use config.
  return {
    type: 'compared-metric',
    fileName: actual.fileName,
    metricName: actual.metricName,
    actualStr: numberToStr(actual.value, 2), // TODO get digit by config.
    expectedStr: numberToStr(expected.value, 2), // TODO get digit by config.
    diffStr: diff > 0 ? `+${diffStr}` : `-${diffStr}`,
    within: Math.abs(diff) <= threshold,

    actual,
    expected,
  };
};

const numberToStr = (value: number, digit: number): string => {
  if (digit > 0) {
    const str = Math.floor(value * 10 * digit).toString();
    return `${str.slice(0, str.length - digit)}.${str.slice(-1 * digit)}`;
  }
  return Math.floor(value).toString();
};

export const metricToTd = (m: Metric | ComparedMetric): string => {
  const fileName = m.fileName.replace('.json', '');
  return `| ${fileName} | ${m.metricName} | ${isComparedMetric(m) ? `${m.actualStr}(${m.diffStr})` : m.value} |`;
};
