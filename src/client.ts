import * as github from '@actions/github';
import { DefaultArtifactClient } from '@actions/artifact';
import { backOff } from 'exponential-backoff';
import { summary } from '@actions/core';

import { Repository } from './repository';
import { workspace } from './path';
import { Artifact, Run } from './run';

export type Octokit = ReturnType<typeof github.getOctokit>;

export type DownloadClient = {
  downloadArtifact: (id: number) => Promise<{ data: unknown }>;
};

export type CommentClient = {
  postComment: (issueNumber: number, comment: string) => Promise<void>;
};

export type UploadClient = {
  uploadArtifact: (files: string[], artifactName: string) => Promise<void>;
};

export type RunClient = {
  fetchRuns: (page: number) => Promise<{ data: { workflow_runs: Run[] } }>;
  fetchArtifacts: (runId: number) => Promise<{ data: { artifacts: Artifact[] } }>;
};

export type SummaryClient = {
  summary: (raw: string) => Promise<void>;
};

export type Client = CommentClient & DownloadClient & UploadClient & RunClient & SummaryClient;

export const createClient = (repository: Repository, octokit: Octokit) => {
  const artifactClient = new DefaultArtifactClient();

  return {
    fetchRuns: async (page: number) => {
      return backOff(
        () =>
          octokit.rest.actions.listWorkflowRunsForRepo({
            ...repository,
            per_page: 50,
            page,
          }),
        { numOfAttempts: 5 },
      );
    },
    fetchArtifacts: async (runId: number) => {
      const input = { ...repository, run_id: runId, per_page: 50 };
      return backOff(() => octokit.rest.actions.listWorkflowRunArtifacts(input), { numOfAttempts: 5 });
    },
    uploadArtifact: async (files: string[], artifactName: string) => {
      const _ = await backOff(() => artifactClient.uploadArtifact(artifactName, files, workspace()), {
        numOfAttempts: 5,
      });
      return;
    },
    downloadArtifact: async (artifactId: number) => {
      return backOff(
        () =>
          octokit.rest.actions.downloadArtifact({
            ...repository,
            artifact_id: artifactId,
            archive_format: 'zip',
          }),
        { numOfAttempts: 5 },
      );
    },
    postComment: async (issueNumber: number, comment: string) => {
      const _ = await backOff(
        () =>
          octokit.rest.issues.createComment({
            ...repository,
            issue_number: issueNumber,
            body: comment,
          }),
        { numOfAttempts: 5 },
      );
      return;
    },
    summary: async (raw: string): Promise<void> => {
      await summary.addRaw(raw).write();
    },
  };
};
