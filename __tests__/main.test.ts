/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core';

import * as main from '../src/main';
import * as githubClient from '../src/client';
import { Run } from '../src/run';
import { Artifact } from '@actions/artifact';

// Mock the action's main function
const mainMock = jest.spyOn(main, 'run');

// Other utilities
const timeRegex = /^\d{2}:\d{2}:\d{2}/;

// Mock the GitHub Actions core library
let debugMock: jest.SpyInstance;
let errorMock: jest.SpyInstance;
let getInputMock: jest.SpyInstance;
let setFailedMock: jest.SpyInstance;
let setOutputMock: jest.SpyInstance;
let githubClientMock: jest.SpyInstance;

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    debugMock = jest.spyOn(core, 'debug').mockImplementation();
    errorMock = jest.spyOn(core, 'error').mockImplementation();
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation();
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation();
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation();

    githubClientMock = jest.spyOn(githubClient, 'createClient').mockImplementation();
  });

  it('sets the time output', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'github-token':
          return 'dummy-token';
        case 'json-directory-path':
          return '__metrics__';
        case 'target-hash':
          return 'dummy-hash';
        case 'artifact-name':
          return 'dummy-artifact';
        case 'branch':
          return 'dummy-branch';
        default:
          return '';
      }
    });

    let postedComment = '';
    githubClientMock.mockImplementation(async (_issueNumber: number, _comment: string): Promise<any> => {
      return {
        downloadArtifact: async (_id: number): Promise<{ data: unknown }> => {
          return { data: null };
        },
        postComment: async (_issueNumber: number, comment: string): Promise<void> => {
          postedComment = comment;
        },
        uploadArtifact: async (_files: string[], _artifactName: string): Promise<void> => {},
        fetchRuns: async (_page: number): Promise<{ data: { workflow_runs: Run[] } }> => {
          return { data: { workflow_runs: [] } };
        },
        fetchArtifacts: async (_runId: number): Promise<{ data: { artifacts: Artifact[] } }> => {
          return { data: { artifacts: [] } };
        },
        summary: async (_raw: string): Promise<void> => {},
      };
    });

    await main.run();
    expect(mainMock).toHaveReturned();

    expect(postedComment).toBe('hoge');
    expect(errorMock).not.toHaveBeenCalled();
  });
});
