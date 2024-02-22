import * as core from '@actions/core';
import * as github from '@actions/github';

import { getConfig } from './config';
import { getEvent } from './event';
import { run as serviceRun } from './service';
import { createClient } from './client';
import { log } from './logger';

export const run = async () => {
  const config = getConfig();

  const { repo, runId, sha } = github.context;
  log.info(`runid = ${runId}, sha = ${sha}`);

  const date = new Date().toISOString().split('T')[0];
  const event = getEvent();
  log.info(`succeeded to get event, number = ${event.number}`);

  const octokit = github.getOctokit(config.githubToken);
  const client = createClient(repo, octokit);

  log.info(`start`);
  await serviceRun({ event, runId, sha, client, date, config });
};

run().catch(e => core.setFailed(e.message));
