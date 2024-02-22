"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const adm_zip_1 = __importDefault(require("adm-zip"));
const glob_1 = require("glob");
const make_dir_1 = __importDefault(require("make-dir"));
const comment_1 = require("./comment");
const compare_1 = require("./compare");
const constants_1 = require("./constants");
const logger_1 = require("./logger");
const path_2 = require("./path");
const run_1 = require("./run");
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
const run = async ({ event, runId, sha, client, date, config, }) => {
    logger_1.log.info(`start initialization.`);
    // Create workspace
    await (0, make_dir_1.default)((0, path_2.workspace)());
    await copyActualJsons(config);
    // If event is not pull request, upload jsons then finish actions.
    // This data is used as expected data for the next time.
    if (typeof event.number === 'undefined') {
        logger_1.log.info(`event number is not detected.`);
        await compareAndUploadArtifact(client, config);
        return;
    }
    logger_1.log.info(`start to find run and artifact.`);
    // Find current run and target run and artifact.
    const runAndArtifact = await (0, run_1.findRunAndArtifact)({
        event,
        client,
        targetHash: config.targetHash,
        artifactName: config.artifactName,
    });
    // If target artifact is not found, upload jsons.
    if (!runAndArtifact || !runAndArtifact.run || !runAndArtifact.artifact) {
        logger_1.log.warn('Failed to find current or target runs');
        const result = await compareAndUploadArtifact(client, config);
        // If we have current run, add comment to PR.
        if (runId) {
            const comment = (0, comment_1.createCommentWithoutTarget)({
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
    logger_1.log.info(result);
    const comment = (0, comment_1.createCommentWithTarget)({
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
    logger_1.log.info('post summary comment');
    await client.summary(comment);
};
exports.run = run;
/**
 * copy actual json to workspace.
 *
 * @param config
 */
const copyActualJsons = async (config) => {
    logger_1.log.info(`Start copy jsons from ${config.jsonDirectoryPath}`);
    try {
        await cpy((0, path_1.join)(config.jsonDirectoryPath, `**/*.json`), (0, path_1.join)((0, path_2.workspace)(), constants_1.ACTUAL_DIR_NAME));
    }
    catch (e) {
        logger_1.log.error(`Failed to copy jsons ${e}`);
    }
    logger_1.log.info(`Succeeded to initialization.`);
};
/**
 * compare actual <=> expected files.
 * upload files exist on the workspace as GitHub Actions run's artifact.
 *
 * @param client
 * @param config
 */
const compareAndUploadArtifact = async (client, config) => {
    const result = await (0, compare_1.compare)(config);
    logger_1.log.debug('compare result', result);
    const files = (0, glob_1.sync)((0, path_1.join)((0, path_2.workspace)(), '**/*'));
    logger_1.log.info('Start upload artifact');
    try {
        await client.uploadArtifact(files, config.artifactName);
    }
    catch (e) {
        logger_1.log.error(e);
        throw new Error('Failed to upload artifact');
    }
    logger_1.log.info('Succeeded to upload artifact');
    return result;
};
/**
 * download expected json from past artifact to workspace.
 *
 * @param client
 * @param latestArtifactId
 */
const downloadExpectedJsons = async (client, latestArtifactId) => {
    logger_1.log.info(`Start to download expected jsons, artifact id = ${latestArtifactId}`);
    try {
        const zip = await client.downloadArtifact(latestArtifactId);
        await Promise.all(new adm_zip_1.default(Buffer.from(zip.data))
            .getEntries()
            .filter((f) => !f.isDirectory && f.entryName.startsWith(constants_1.ACTUAL_DIR_NAME))
            .map(async (file) => {
            const f = (0, path_1.join)((0, path_2.workspace)(), file.entryName.replace(constants_1.ACTUAL_DIR_NAME, constants_1.EXPECTED_DIR_NAME));
            await (0, make_dir_1.default)((0, path_1.dirname)(f));
            await fs_1.promises.writeFile(f, file.getData());
        })).catch(e => {
            logger_1.log.error('Failed to extract jsons.', e);
            throw e;
        });
    }
    catch (e) {
        if (e.message === 'Artifact has expired') {
            logger_1.log.error('Failed to download expected jsons. Because expected artifact has already expired.');
            return;
        }
        logger_1.log.error(`Failed to download artifact ${e}`);
    }
};
//# sourceMappingURL=service.js.map