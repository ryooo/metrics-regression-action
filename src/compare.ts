import chalk from 'chalk';

import { Config } from './config';
import { log } from './logger';
import { workspace } from './path';
import { globSync } from 'glob';
import { ACTUAL_DIR_NAME, EXPECTED_DIR_NAME } from './constants';
import { ComparedMetric, compareMetrics, isSameMetric, Metric, parseMetricsFile, sortMetricsFunc } from './metric';
import { join } from 'path';

export type CompareOutput = {
  overThresholdMetrics: ComparedMetric[];
  withinThresholdMetrics: ComparedMetric[];
  newMetrics: Metric[];
  deletedMetrics: Metric[];
};

export const compare = async (_config: Config): Promise<CompareOutput> => {
  const result: CompareOutput = {
    overThresholdMetrics: [],
    withinThresholdMetrics: [],
    newMetrics: [],
    deletedMetrics: [],
  };

  const expectedFiles = globSync(join(workspace(), EXPECTED_DIR_NAME, '**/*.json'));
  const actualFiles = globSync(join(workspace(), ACTUAL_DIR_NAME, '**/*.json'));
  const expectedMetrics = expectedFiles
    .map(path => parseMetricsFile(path))
    .flat()
    .sort(sortMetricsFunc);
  const actualMetrics = actualFiles
    .map(path => parseMetricsFile(path))
    .flat()
    .sort(sortMetricsFunc);

  for (const actual of actualMetrics) {
    const expected = expectedMetrics.find(e => isSameMetric(e, actual));
    if (expected) {
      const compared = compareMetrics(expected, actual);
      if (compared.within) {
        result.withinThresholdMetrics.push(compared);
      } else {
        result.overThresholdMetrics.push(compared);
      }
    } else {
      result.newMetrics.push(actual);
    }
  }
  for (const expected of expectedMetrics) {
    const actual = actualMetrics.find(e => isSameMetric(e, expected));
    if (!actual) {
      result.deletedMetrics.push(expected);
    }
  }

  log.info('Comparison Complete');
  log.info(chalk.red(`   Within threshold items: ${result.withinThresholdMetrics.length}`));
  log.info(chalk.red(`   Over threshold items: ${result.overThresholdMetrics.length}`));
  log.info(chalk.cyan(`   New items: ${result.newMetrics.length}`));
  log.info(chalk.redBright(`   Deleted items: ${result.deletedMetrics.length}`));
  return result;
};
