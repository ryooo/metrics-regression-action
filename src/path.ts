import { join } from 'path';

import { WORKSPACE_DIR_NAME } from './constants';

export const workspace = (): string => {
  return join('./', WORKSPACE_DIR_NAME);
};
