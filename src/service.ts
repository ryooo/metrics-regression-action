import { promises } from 'fs';
import { join, dirname } from 'path';

import Zip, { IZipEntry } from 'adm-zip';
import { sync as globSync } from 'glob';
import makeDir from 'make-dir';

import { DownloadClient, UploadClient, Client } from './client';
import { createCommentWithTarget, createCommentWithoutTarget } from './comment';
import { compare, CompareOutput } from './compare';
import { Config } from './config';
import { ACTUAL_DIR_NAME, EXPECTED_DIR_NAME } from './constants';
import { Event } from './event';
import { log } from './logger';
import { workspace } from './path';
import { findRunAndArtifact } from './run';

const { cpy } = require('cpy');

// Download expected jsons from target artifact, and save on expected directory.
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

const copyActualJsons = async (jsonPath: string): Promise<void> => {
  log.info(`Start copy jsons from ${jsonPath}`);

  try {
    await cpy(join(jsonPath, `**/*.json`), join(workspace(), ACTUAL_DIR_NAME));
  } catch (e) {
    log.error(`Failed to copy jsons ${e}`);
  }
};

// Compare jsons and upload result.
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

const init = async (config: Config): Promise<void> => {
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
}): Promise<void> => {
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
