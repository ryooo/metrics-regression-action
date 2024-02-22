"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const client_1 = require("./client");
const config_1 = require("./config");
const event_1 = require("./event");
const logger_1 = require("./logger");
const service_1 = require("./service");
const run = async () => {
    const config = (0, config_1.getConfig)();
    const { repo, runId, sha } = github_1.context;
    logger_1.log.info(`runid = ${runId}, sha = ${sha}`);
    const date = new Date().toISOString().split('T')[0];
    const event = (0, event_1.getEvent)();
    logger_1.log.info(`succeeded to get event, number = ${event.number}`);
    const octokit = (0, github_1.getOctokit)(config.githubToken);
    const client = (0, client_1.createClient)(repo, octokit);
    logger_1.log.info(`start`);
    await (0, service_1.run)({ event, runId, sha, client, date, config });
};
exports.run = run;
(0, exports.run)().catch(e => (0, core_1.setFailed)(e.message));
//# sourceMappingURL=main.js.map