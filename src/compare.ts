import chalk from 'chalk';

import { Config } from './config';
import { log } from './logger';

export type CompareOutput = {
  passedItems: string[];
  failedItems: string[];
  newItems: string[];
  deletedItems: string[];
};

export const compare = async (config: Config): Promise<CompareOutput> => {
  config.jsonDirectoryPath;
  const result = {
    passedItems: [],
    failedItems: [],
    newItems: [],
    deletedItems: [],
  };
  log.debug('compare result', result);
  log.info('Comparison Complete');
  log.info(chalk.red(`   Changed items: ${result.failedItems.length}`));
  log.info(chalk.cyan(`   New items: ${result.newItems.length}`));
  log.info(chalk.redBright(`   Deleted items: ${result.deletedItems.length}`));
  log.info(chalk.green(`   Passed items: ${result.passedItems.length}`));
  return result;
};
