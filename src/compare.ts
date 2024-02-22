import chalk from 'chalk'

import { log } from './logger'
import { Config } from './config'
import * as constants from './constants'
import { workspace } from './path'
import path from 'path/posix'

export type CompareOutput = {
  passedItems: string[]
  failedItems: string[]
  newItems: string[]
  deletedItems: string[]
}

export const compare = async (config: Config): Promise<CompareOutput> => {
  const result = {
    passedItems: [],
    failedItems: [],
    newItems: [],
    deletedItems: []
  }
  log.debug('compare result', result)
  log.info('Comparison Complete')
  log.info(chalk.red('   Changed items: ' + result.failedItems.length))
  log.info(chalk.cyan('   New items: ' + result.newItems.length))
  log.info(chalk.redBright('   Deleted items: ' + result.deletedItems.length))
  log.info(chalk.green('   Passed items: ' + result.passedItems.length))
  return result
}
