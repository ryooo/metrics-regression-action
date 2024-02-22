"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRunAndArtifact = void 0;
const git_1 = require("./git");
const logger_1 = require("./logger");
const limitation = 200;
const findRunAndArtifact = async ({ event, client, targetHash: inputTargetHash, artifactName, }) => {
    let page = 0;
    while (true) {
        if (!event.pull_request) {
            return null;
        }
        try {
            logger_1.log.info(`start to fetch runs page = ${page}`);
            const runs = await client.fetchRuns(page++);
            logger_1.log.info(`Succeeded to find ${runs.data.workflow_runs.length} runs`);
            // If target is passed to this function, use it.
            const targetHash = inputTargetHash ?? (await (0, git_1.findTargetHash)(event.pull_request.base.sha, event.pull_request.head.sha));
            const targetHashShort = targetHash.slice(0, 7);
            logger_1.log.info(`targetHash = ${targetHash}`);
            for (const targetRun of runs.data.workflow_runs.filter(run => run.head_sha.startsWith(targetHashShort))) {
                const res = await client.fetchArtifacts(targetRun.id);
                const { artifacts } = res.data;
                const found = artifacts.find(a => a.name === artifactName);
                if (found) {
                    return { run: targetRun, artifact: found };
                }
            }
            if (runs.data.workflow_runs.length < 50) {
                logger_1.log.info('Failed to find target run', runs.data.workflow_runs.length);
                return null;
            }
            if (limitation <= page) {
                logger_1.log.info(`Failed to find target run, this is because page reached limitation`, limitation, page);
                return null;
            }
        }
        catch (e) {
            logger_1.log.error('Failed to find run', e);
            return null;
        }
    }
};
exports.findRunAndArtifact = findRunAndArtifact;
//# sourceMappingURL=run.js.map