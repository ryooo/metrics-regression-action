import { statSync } from 'fs';

import { getInput } from '@actions/core';
import { log } from './logger';

export interface Config {
  actualDirectoryPath: string;
  expectedDirectoryPath: string;
  githubToken: string;
  targetHash: string | null;
  artifactName: string;
  branch: string;
}

const validateGitHubToken = (githubToken: string | undefined): void => {
  if (!githubToken) {
    throw new Error(`'github-token' is not set. Please give API token.`);
  }
};

const validateActualDirPath = (path: string | undefined): void => {
  if (!path) {
    throw new Error(`'actual-directory-path' is not set. Please specify path to json directory.`);
  }
  try {
    const s = statSync(path);
    if (s.isDirectory()) return;
  } catch (_) {
    throw new Error(`'actual-directory-path' is not directory. Please specify path to json directory.`);
  }
};

const validateExpectedDirPath = (path: string | undefined): void => {
  if (!path) {
    return;
  }
  try {
    const s = statSync(path);
    if (s.isDirectory()) return;
  } catch (_) {
    throw new Error(`'expected-directory-path' is not directory. Please specify path to json directory.`);
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getBoolInput = (name: string): boolean => {
  const input = getInput(name);
  if (!input) {
    return false;
  }
  if (input !== 'true' && input !== 'false') {
    throw new Error(`'${name}' input must be boolean value 'true' or 'false' but got '${input}'`);
  }
  return input === 'true';
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getNumberInput = (name: string): number | null => {
  const v = getInput(name);
  if (!v) return null;
  const n = Number(v);
  if (typeof n === 'number') return n;
  throw new Error(`'${name}' input must be number value but got '${n}'`);
};

const validateTargetHash = (h: string | null): void => {
  if (!h) return;
  if (!/[0-9a-f]{5,40}/.test(h)) {
    throw new Error(`'target-hash' input must be commit hash but got '${h}'`);
  }
};

export const getConfig = (): Config => {
  const githubToken = getInput('github-token');
  validateGitHubToken(githubToken);

  const actualDirectoryPath = getInput('actual-directory-path');
  validateActualDirPath(actualDirectoryPath);

  const expectedDirectoryPath = getInput('expected-directory-path');
  validateExpectedDirPath(expectedDirectoryPath);

  const targetHash = getInput('target-hash') || null;
  validateTargetHash(targetHash);

  const artifactName = getInput('artifact-name') || 'metrics';
  const branch = getInput('branch') || 'metrics-regression-action';

  log.info(`--------config--------`);
  log.info(`actualDirectoryPath is `, actualDirectoryPath);
  log.info(`expectedDirectoryPath is `, expectedDirectoryPath);
  log.info(`targetHash is `, targetHash);
  log.info(`artifactName is `, artifactName);
  log.info(`branch is `, branch);

  return {
    githubToken,
    actualDirectoryPath,
    expectedDirectoryPath,
    targetHash,
    artifactName,
    branch,
  };
};
