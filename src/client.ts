import { DefaultArtifactClient } from '@actions/artifact';
import { summary } from '@actions/core';
import { backOff } from 'exponential-backoff';

import { workspace } from './path';
import { Repository } from './repository';

import * as github from '@actions/github';
import { GetResponseTypeFromEndpointMethod } from '@octokit/types';
import { Octokit } from '@octokit/rest';
import { log } from './logger';

export type OctokitAsClient = ReturnType<typeof github.getOctokit>;

const octokitTypeResolver = new Octokit();
type FetchCommentsResponseType = GetResponseTypeFromEndpointMethod<typeof octokitTypeResolver.issues.listComments>;
type FetchArtifactsResponseType = GetResponseTypeFromEndpointMethod<
  typeof octokitTypeResolver.rest.actions.listWorkflowRunArtifacts
>;
type DownloadArtifactResponseType = GetResponseTypeFromEndpointMethod<
  typeof octokitTypeResolver.rest.actions.downloadArtifact
>;
type FetchRunsResponseType = GetResponseTypeFromEndpointMethod<
  typeof octokitTypeResolver.rest.actions.listWorkflowRunsForRepo
>;

export type DownloadClient = {
  downloadArtifact: (id: number) => Promise<DownloadArtifactResponseType>;
};

export type CommentClient = {
  fetchComments: (issueNumber: number) => Promise<FetchCommentsResponseType>;
  postComment: (issueNumber: number, comment: string) => Promise<void>;
  updateComment: (issueNumber: number, commentId: number, comment: string) => Promise<void>;
};

export type UploadClient = {
  uploadArtifact: (files: string[], artifactName: string) => Promise<void>;
};

export type RunClient = {
  fetchRuns: (page: number) => Promise<FetchRunsResponseType>;
  fetchArtifacts: (runId: number) => Promise<FetchArtifactsResponseType>;
};

export type SummaryClient = {
  summary: (raw: string) => Promise<void>;
};

export type Client = CommentClient & DownloadClient & UploadClient & RunClient & SummaryClient;

export const createClient = (repository: Repository, octokit: OctokitAsClient): Client => {
  const artifactClient = new DefaultArtifactClient();

  return {
    fetchRuns: async (page: number): Promise<FetchRunsResponseType> => {
      return backOff(
        async () =>
          octokit.rest.actions.listWorkflowRunsForRepo({
            ...repository,
            per_page: 50,
            page,
          }),
        { numOfAttempts: 5 },
      );
    },
    fetchArtifacts: async (runId: number): Promise<FetchArtifactsResponseType> => {
      const input = { ...repository, run_id: runId, per_page: 50 };
      return backOff(async () => octokit.rest.actions.listWorkflowRunArtifacts(input), { numOfAttempts: 5 });
    },
    uploadArtifact: async (files: string[], artifactName: string) => {
      await backOff(async () => artifactClient.uploadArtifact(artifactName, files, workspace()), {
        numOfAttempts: 5,
      });
      return;
    },
    downloadArtifact: async (artifactId: number): Promise<DownloadArtifactResponseType> => {
      return backOff(
        async () =>
          octokit.rest.actions.downloadArtifact({
            ...repository,
            artifact_id: artifactId,
            archive_format: 'zip',
          }),
        { numOfAttempts: 5 },
      );
    },
    fetchComments: async (issueNumber: number): Promise<FetchCommentsResponseType> => {
      const input = { ...repository, issue_number: issueNumber, per_page: 50 };
      return backOff(async () => octokit.rest.issues.listComments(input), { numOfAttempts: 5 });
    },
    postComment: async (issueNumber: number, comment: string) => {
      await backOff(
        async () =>
          octokit.rest.issues.createComment({
            ...repository,
            issue_number: issueNumber,
            body: comment,
          }),
        { numOfAttempts: 5 },
      );
      return;
    },
    updateComment: async (issueNumber: number, commentId: number, comment: string) => {
      await backOff(
        async () =>
          octokit.rest.issues.updateComment({
            ...repository,
            issue_number: issueNumber,
            comment_id: commentId,
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

export const createOrUpdateComment = async (
  client: Client,
  issueNumber: number,
  artifactName: string,
  body: string,
): Promise<void> => {
  const comments = await client.fetchComments(issueNumber);
  const commentKey = `<!-- This is an auto-generated comment by metrics-regression-action ${artifactName} -->\n`;
  for (const comment of comments.data) {
    if (comment.body?.includes(commentKey)) {
      log.info(`Start updateComment. ${issueNumber}, ${comment.id}`);
      await client.updateComment(issueNumber, comment.id, `${commentKey}${body}`);
      return;
    }
  }
  log.info(`Start postComment. ${issueNumber}`);
  await client.postComment(issueNumber, `${commentKey}${body}`);
};
