import { statSync } from 'fs';

import { getInput } from '@actions/core';

import { ARTIFACT_NAME } from './constants';

export interface Config {
  jsonDirectoryPath: string;
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

const validateJsonDirPath = (path: string | undefined): void => {
  if (!path) {
    throw new Error(`'json-directory-path' is not set. Please specify path to json directory.`);
  }
  try {
    const s = statSync(path);
    if (s.isDirectory()) return;
  } catch (_) {
    throw new Error(`'json-directory-path' is not directory. Please specify path to json directory.`);
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

  const jsonDirectoryPath = getInput('json-directory-path');
  validateJsonDirPath(jsonDirectoryPath);

  const targetHash = getInput('target-hash') || null;
  validateTargetHash(targetHash);

  const artifactName = getInput('artifact-name') || ARTIFACT_NAME;
  const branch = getInput('branch') || 'metrics-regression-action';

  return {
    githubToken,
    jsonDirectoryPath,
    targetHash,
    artifactName,
    branch,
  };
};
