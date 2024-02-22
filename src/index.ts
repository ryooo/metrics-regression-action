/**
 * The entrypoint for the action.
 */
import { run } from './main';
import { setFailed } from '@actions/core';

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(e => setFailed(e.message));
