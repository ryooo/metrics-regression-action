"use strict";
// This file is based on https://github.com/s0/git-publish-subdir-action
// MIT License
//
// Copyright (c) 2018 Sam Lanning
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPushDirName = exports.pushFilesToBranch = void 0;
const fast_glob_1 = require("fast-glob");
const fs_1 = require("fs");
const os_1 = require("os");
const path = __importStar(require("path"));
const io_1 = require("@actions/io");
const git_1 = require("./git");
const logger_1 = require("./logger");
const path_1 = require("./path");
const exponential_backoff_1 = require("exponential-backoff");
const constants_1 = require("./constants");
const path_2 = require("path");
const helper_1 = require("./helper");
const pushFilesToBranch = async (input) => {
    const { env } = input;
    const config = genConfig(input);
    const TMP_PATH = await fs_1.promises.mkdtemp(path.join((0, os_1.tmpdir)(), 'reg-actions-'));
    const REPO_TEMP = path.join(TMP_PATH, 'repo');
    if (!env.GITHUB_EVENT_PATH)
        throw new Error('Expected GITHUB_EVENT_PATH');
    const event = JSON.parse((await fs_1.promises.readFile(env.GITHUB_EVENT_PATH)).toString());
    const name = /* input.commitName ?? */ event.pusher?.name ?? env.GITHUB_ACTOR ?? 'Git Publish Subdirectory';
    const email = 
    // input.commitEmail ??
    event.pusher?.email ?? (env.GITHUB_ACTOR ? `${env.GITHUB_ACTOR}@users.noreply.github.com` : 'nobody@nowhere');
    // Set Git Config
    await (0, git_1.configureName)(name);
    await (0, git_1.configureEmail)(email);
    // Environment to pass to children
    const execEnv = env;
    // Clone the target repo
    await (0, git_1.clone)({ repo: config.repo, dist: REPO_TEMP }, { env: execEnv });
    const execOptions = { env: execEnv, cwd: REPO_TEMP };
    // Fetch branch if it exists
    await (0, git_1.fetchOrigin)({ branch: config.branch }, execOptions).catch(err => {
        const s = err.toString();
        if (s.indexOf("Couldn't find remote ref") === -1) {
            logger_1.log.warn("Failed to fetch target branch, probably doesn't exist");
            logger_1.log.error(err);
        }
    });
    // Check if branch already exists
    logger_1.log.info(`Checking if branch ${config.branch} exists already`);
    const branchExist = await (0, git_1.hasBranch)(config.branch, execOptions);
    if (!branchExist) {
        // Branch does not exist yet, let's check it out as an orphan
        logger_1.log.info(`${config.branch} does not exist, creating as orphan`);
        await (0, git_1.checkout)(config.branch, true, execOptions);
    }
    else {
        await (0, git_1.checkout)(config.branch, false, execOptions);
    }
    // Update contents of branch
    logger_1.log.info(`Updating branch ${config.branch}`);
    /**
     * The list of globs we'll use for clearing
     */
    if (!branchExist) {
        const globs = ['**/*', '!.git'];
        logger_1.log.info(`Removing all files from target branch`);
        const filesToDelete = (0, fast_glob_1.stream)(globs, { absolute: true, dot: true, followSymbolicLinks: false, cwd: REPO_TEMP });
        logger_1.log.info(filesToDelete);
        // Delete all files from the filestream
        for await (const entry of filesToDelete) {
            await fs_1.promises.unlink(entry);
        }
    }
    const destDir = input.targetDir;
    // Make sure the destination sourceDir exists
    await (0, io_1.mkdirP)(path.resolve(REPO_TEMP, destDir));
    await copyFilesWorkspaceToRepository(REPO_TEMP, destDir);
    await (0, git_1.add)(execOptions);
    const message = `Update ${input.branch} to output generated at runId:${input.runId}`;
    await (0, git_1.commit)(message, execOptions);
    logger_1.log.info(`Pushing`);
    (async () => {
        return (0, exponential_backoff_1.backOff)(async () => {
            if (branchExist) {
                await (0, git_1.rebase)(config.branch, execOptions);
            }
            const res = await (0, git_1.push)(config.branch, execOptions);
            logger_1.log.info(res.stdout);
            logger_1.log.info(`Deployment Successful`);
        }, { numOfAttempts: 5 });
    })();
};
exports.pushFilesToBranch = pushFilesToBranch;
const genConfig = (input) => {
    const { branch, env } = input;
    // Determine the type of URL
    if (!input.githubToken)
        throw new Error('GITHUB_TOKEN must be specified when REPO == self');
    if (!env.GITHUB_REPOSITORY)
        throw new Error('GITHUB_REPOSITORY must be specified when REPO == self');
    const url = `https://x-access-token:${input.githubToken}@github.com/${env.GITHUB_REPOSITORY}.git`;
    const config = {
        repo: url,
        branch,
    };
    return config;
};
const copyFilesWorkspaceToRepository = async (temp, dest) => {
    logger_1.log.info(`Copying all files`);
    logger_1.log.info(`Copying expected files`);
    const expectedPattern = (0, path_2.join)((0, path_1.workspace)(), constants_1.EXPECTED_DIR_NAME, '**/*.json');
    await (0, helper_1.copyFiles)(expectedPattern, `${temp}/${dest}/expected/`);
    logger_1.log.info(`Copying new files`);
    const actualPattern = (0, path_2.join)((0, path_1.workspace)(), constants_1.ACTUAL_DIR_NAME, '**/*.json');
    await (0, helper_1.copyFiles)(actualPattern, `${temp}/${dest}/actual/`);
    return;
};
const createPushDirName = ({ runId, artifactName, date, }) => `${date}_${runId}_${artifactName}`;
exports.createPushDirName = createPushDirName;
//# sourceMappingURL=push.js.map