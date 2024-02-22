import { promises } from 'fs';
import { join, dirname } from 'path';

import Zip, { IZipEntry } from 'adm-zip';
import { sync as globSync } from 'glob';
import makeDir from 'make-dir';

import { DownloadClient, UploadClient, Client } from './client';
import { createCommentWithRun, createCommentWithoutRun } from './comment';
import { compare, CompareOutput } from './compare';
import { Config } from './config';
import { ACTUAL_DIR_NAME, EXPECTED_DIR_NAME } from './constants';
import { Event } from './event';
import { log } from './logger';
import { workspace } from './path';
import { findRunAndArtifact } from './run';

const { cpy } = require('cpy');

/**
 * Compare and post report on comment.
 * 1. create workspace.
 * 2. copy actual json to workspace.
 * 3. specify GitHub Actions run.
 * 4. download expected json from past artifact to workspace.
 * 5. compare actual <=> expected files.
 * 6. upload files exist on the workspace as GitHub Actions run's artifact.
 * 7. post report comment.
 *
 * @param event
 * @param runId
 * @param sha
 * @param client
 * @param date
 * @param config
 */
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
}): Promise<void> => {
  log.info(`start initialization.`);
  // Create workspace
  await makeDir(workspace());
  await copyActualJsons(config);

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
      const comment = createCommentWithoutRun({
        event,
        runId,
        artifactName: config.artifactName,
        result,
      });
      await client.postComment(event.number, comment);
    }
    return;
  }

  // Download and copy expected jsons to workspace.
  await downloadExpectedJsons(client, runAndArtifact.artifact.id);

  // compare actual <=> expected files.
  //  upload files exist on the workspace as GitHub Actions run's artifact.
  const result = await compareAndUploadArtifact(client, config);
  log.info(result);
  const comment = createCommentWithRun({
    event,
    runId,
    sha,
    targetRun: runAndArtifact.run,
    date,
    result,
    artifactName: config.artifactName,
    regBranch: config.branch,
  });

  await client.postComment(event.number, comment);

  log.info('post summary comment');

  await client.summary(comment);
};

/**
 * copy actual json to workspace.
 *
 * @param config
 */
const copyActualJsons = async (config: Config): Promise<void> => {
  log.info(`Start copy jsons from ${config.jsonDirectoryPath}`);
  try {
    await cpy(join(config.jsonDirectoryPath, `**/*.json`), join(workspace(), ACTUAL_DIR_NAME));
  } catch (e) {
    log.error(`Failed to copy jsons ${e}`);
  }

  log.info(`Succeeded to initialization.`);
};

/**
 * compare actual <=> expected files.
 * upload files exist on the workspace as GitHub Actions run's artifact.
 *
 * @param client
 * @param config
 */
const compareAndUploadArtifact = async (client: UploadClient, config: Config): Promise<CompareOutput> => {
  const result = await compare(config);
  log.debug('compare result', result);

  const files = globSync(join(workspace(), '**/*'));
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

/**
 * download expected json from past artifact to workspace.
 *
 * @param client
 * @param latestArtifactId
 */
const downloadExpectedJsons = async (client: DownloadClient, latestArtifactId: number): Promise<void> => {
  log.info(`Start to download expected jsons, artifact id = ${latestArtifactId}`);
  try {
    const zip = await client.downloadArtifact(latestArtifactId);
    await Promise.all(
      new Zip(Buffer.from(zip.data as any))
        .getEntries()
        .filter((f: IZipEntry) => !f.isDirectory && f.entryName.startsWith(ACTUAL_DIR_NAME))
        .map(async (file: IZipEntry): Promise<void> => {
          const f = join(workspace(), file.entryName.replace(ACTUAL_DIR_NAME, EXPECTED_DIR_NAME));
          await makeDir(dirname(f));
          await promises.writeFile(f, file.getData());
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
