import * as fs from 'fs';
import * as path from 'path';
import { sync as globSync } from 'glob';
import makeDir from 'make-dir';
import Zip from 'adm-zip';
import { log } from './logger';
import { Config } from './config';
import { Event } from './event';
import { findRunAndArtifact } from './run';
import { compare, CompareOutput } from './compare';
import { createCommentWithTarget, createCommentWithoutTarget } from './comment';
import * as constants from './constants';
import { workspace } from './path';
import { DownloadClient, UploadClient, Client } from './client';

const { cpy } = require('cpy');

// Download expected jsons from target artifact.
const downloadExpectedJsons = async (client: DownloadClient, latestArtifactId: number) => {
  log.info(`Start to download expected jsons, artifact id = ${latestArtifactId}`);
  try {
    const zip = await client.downloadArtifact(latestArtifactId);
    await Promise.all(
      new Zip(Buffer.from(zip.data as any))
        .getEntries()
        .filter((f: any) => !f.isDirectory && f.entryName.startsWith(constants.ACTUAL_DIR_NAME))
        .map(async (file: any) => {
          const f = path.join(
            workspace(),
            file.entryName.replace(constants.ACTUAL_DIR_NAME, constants.EXPECTED_DIR_NAME),
          );
          await makeDir(path.dirname(f));
          await fs.promises.writeFile(f, file.getData());
        }),
    ).catch(e => {
      log.error('Failed to extract jsons.', e);
      throw e;
    });
  } catch (e: any) {
    if (e.message === 'Artifact has expired') {
      log.error('Failed to download expected jsons. Because expected artifact has already expired.');
      return;
    }
    log.error(`Failed to download artifact ${e}`);
  }
};

const copyActualJsons = async (jsonPath: string) => {
  log.info(`Start copy jsons from ${jsonPath}`);

  try {
    await cpy(path.join(jsonPath, `**/*.json`), path.join(workspace(), constants.ACTUAL_DIR_NAME));
  } catch (e) {
    log.error(`Failed to copy jsons ${e}`);
  }
};

// Compare jsons and upload result.
const compareAndUploadArtifact = async (client: UploadClient, config: Config): Promise<CompareOutput> => {
  const result = await compare(config);
  log.debug('compare result', result);

  const files = globSync(path.join(workspace(), '**/*'));
  log.info('Start upload artifact');

  try {
    await client.uploadArtifact(files, config.artifactName);
  } catch (e) {
    log.error(e);
    throw new Error('Failed to upload artifact');
  }
  log.info('Succeeded to upload artifact');

  return result;
};

const init = async (config: Config) => {
  log.info(`start initialization.`);
  // Create workspace
  await makeDir(workspace());

  log.info(`Succeeded to cerate directory.`);

  // Copy actual jsons
  await copyActualJsons(config.jsonDirectoryPath);

  log.info(`Succeeded to initialization.`);
};

export const run = async ({
  event,
  runId,
  sha,
  client,
  date,
  config,
}: {
  event: Event;
  runId: number;
  sha: string;
  client: Client;
  date: string;
  config: Config;
}) => {
  // Setup directory for artifact and copy jsons.
  await init(config);

  // If event is not pull request, upload jsons then finish actions.
  // This data is used as expected data for the next time.
  if (typeof event.number === 'undefined') {
    log.info(`event number is not detected.`);
    await compareAndUploadArtifact(client, config);
    return;
  }

  log.info(`start to find run and artifact.`);
  // Find current run and target run and artifact.
  const runAndArtifact = await findRunAndArtifact({
    event,
    client,
    targetHash: config.targetHash,
    artifactName: config.artifactName,
  });

  // If target artifact is not found, upload jsons.
  if (!runAndArtifact || !runAndArtifact.run || !runAndArtifact.artifact) {
    log.warn('Failed to find current or target runs');
    const result = await compareAndUploadArtifact(client, config);

    // If we have current run, add comment to PR.
    if (runId) {
      const comment = createCommentWithoutTarget({
        event,
        runId,
        artifactName: config.artifactName,
        result,
      });
      await client.postComment(event.number, comment);
    }
    return;
  }

  const { run: targetRun, artifact } = runAndArtifact;

  // Download and copy expected jsons to workspace.
  await downloadExpectedJsons(client, artifact.id);

  const result = await compareAndUploadArtifact(client, config);

  log.info(result);

  const comment = createCommentWithTarget({
    event,
    runId,
    sha,
    targetRun,
    date,
    result,
    artifactName: config.artifactName,
    regBranch: config.branch,
  });

  await client.postComment(event.number, comment);

  log.info('post summary comment');

  await client.summary(comment);
};
