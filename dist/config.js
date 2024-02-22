"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = void 0;
const fs_1 = require("fs");
const core_1 = require("@actions/core");
const constants_1 = require("./constants");
const validateGitHubToken = (githubToken) => {
    if (!githubToken) {
        throw new Error(`'github-token' is not set. Please give API token.`);
    }
};
const validateJsonDirPath = (path) => {
    if (!path) {
        throw new Error(`'json-directory-path' is not set. Please specify path to json directory.`);
    }
    try {
        const s = (0, fs_1.statSync)(path);
        if (s.isDirectory())
            return;
    }
    catch (_) {
        throw new Error(`'json-directory-path' is not directory. Please specify path to json directory.`);
    }
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getBoolInput = (name) => {
    const input = (0, core_1.getInput)(name);
    if (!input) {
        return false;
    }
    if (input !== 'true' && input !== 'false') {
        throw new Error(`'${name}' input must be boolean value 'true' or 'false' but got '${input}'`);
    }
    return input === 'true';
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getNumberInput = (name) => {
    const v = (0, core_1.getInput)(name);
    if (!v)
        return null;
    const n = Number(v);
    if (typeof n === 'number')
        return n;
    throw new Error(`'${name}' input must be number value but got '${n}'`);
};
const validateTargetHash = (h) => {
    if (!h)
        return;
    if (!/[0-9a-f]{5,40}/.test(h)) {
        throw new Error(`'target-hash' input must be commit hash but got '${h}'`);
    }
};
const getConfig = () => {
    const githubToken = (0, core_1.getInput)('github-token');
    validateGitHubToken(githubToken);
    const jsonDirectoryPath = (0, core_1.getInput)('json-directory-path');
    validateJsonDirPath(jsonDirectoryPath);
    const targetHash = (0, core_1.getInput)('target-hash') || null;
    validateTargetHash(targetHash);
    const artifactName = (0, core_1.getInput)('artifact-name') || constants_1.ARTIFACT_NAME;
    const branch = (0, core_1.getInput)('branch') || 'value-regression-action';
    return {
        githubToken,
        jsonDirectoryPath,
        targetHash,
        artifactName,
        branch,
    };
};
exports.getConfig = getConfig;
//# sourceMappingURL=config.js.map