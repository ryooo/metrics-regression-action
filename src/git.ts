import { ExecOptions } from '@actions/exec';

import { log } from './logger';
import { capture, ExecResult } from './helper';

export const findTargetHash = async (baseSha: string, headSha: string): Promise<string> => {
  log.info(`base sha is ${baseSha}, head sha is ${headSha}`);

  await capture('git', ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*']);

  await capture('git', ['fetch', '--all']);

  const args = ['merge-base', '-a', `${baseSha}`, `${headSha}`];

  const res = await capture('git', args);

  if (res.code !== 0) {
    throw new Error(`Command 'git ${args.join(' ')}' failed: ${JSON.stringify(res)}`);
  }
  const targetHash = res.stdout;
  return targetHash;
};

export const configureName = async (name: string): Promise<void> => {
  await capture('git', ['config', '--global', 'user.name', name]);
};

export const configureEmail = async (email: string): Promise<void> => {
  await capture('git', ['config', '--global', 'user.email', email]);
};

export const clone = async (input: { repo: string; dist: string }, options: ExecOptions = {}): Promise<ExecResult> => {
  return capture('git', ['clone', input.repo, input.dist], options);
};

export const fetchOrigin = async (input: { branch: string }, options: ExecOptions = {}): Promise<ExecResult> => {
  return capture('git', ['fetch', '-u', 'origin', `${input.branch}:${input.branch}`], options);
};

export const hasBranch = async (branch: string, options: ExecOptions = {}): Promise<boolean> => {
  const res = await capture('git', ['branch', '--list', branch], options);
  return res.stdout.trim() !== '';
};

export const checkout = async (branch: string, orphan: boolean, options: ExecOptions = {}): Promise<ExecResult> => {
  const args = orphan ? ['checkout', '--orphan', branch] : ['checkout', branch];
  return capture('git', args, options);
};

export const add = async (options: ExecOptions = {}): Promise<ExecResult> => {
  return capture('git', ['add', '-A', '.'], options);
};

export const commit = async (message: string, options: ExecOptions = {}): Promise<ExecResult> => {
  return capture('git', ['commit', '-m', message], options);
};

export const push = async (branch: string, options: ExecOptions = {}): Promise<ExecResult> => {
  return capture('git', ['push', 'origin', branch], options);
};

export const rebase = async (branch: string, options: ExecOptions = {}): Promise<ExecResult> => {
  return capture('git', ['rebase', `origin/${branch}`], options);
};
