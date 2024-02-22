"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = void 0;
const artifact_1 = require("@actions/artifact");
const core_1 = require("@actions/core");
const exponential_backoff_1 = require("exponential-backoff");
const path_1 = require("./path");
const createClient = (repository, octokit) => {
    const artifactClient = new artifact_1.DefaultArtifactClient();
    return {
        fetchRuns: async (page) => {
            return (0, exponential_backoff_1.backOff)(async () => octokit.rest.actions.listWorkflowRunsForRepo({
                ...repository,
                per_page: 50,
                page,
            }), { numOfAttempts: 5 });
        },
        fetchArtifacts: async (runId) => {
            const input = { ...repository, run_id: runId, per_page: 50 };
            return (0, exponential_backoff_1.backOff)(async () => octokit.rest.actions.listWorkflowRunArtifacts(input), { numOfAttempts: 5 });
        },
        uploadArtifact: async (files, artifactName) => {
            await (0, exponential_backoff_1.backOff)(async () => artifactClient.uploadArtifact(artifactName, files, (0, path_1.workspace)()), {
                numOfAttempts: 5,
            });
            return;
        },
        downloadArtifact: async (artifactId) => {
            return (0, exponential_backoff_1.backOff)(async () => octokit.rest.actions.downloadArtifact({
                ...repository,
                artifact_id: artifactId,
                archive_format: 'zip',
            }), { numOfAttempts: 5 });
        },
        postComment: async (issueNumber, comment) => {
            await (0, exponential_backoff_1.backOff)(async () => octokit.rest.issues.createComment({
                ...repository,
                issue_number: issueNumber,
                body: comment,
            }), { numOfAttempts: 5 });
            return;
        },
        summary: async (raw) => {
            await core_1.summary.addRaw(raw).write();
        },
    };
};
exports.createClient = createClient;
//# sourceMappingURL=client.js.map