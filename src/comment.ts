import { CompareOutput } from './compare';
import { Event } from './event';
import { Run } from './run';
import { ComparedMetric, Metric, metricToTd } from './metric';

type CreateCommentWithRunInput = {
  event: Event;
  runId: number;
  sha: string;
  regBranch: string;
  artifactName: string;
  targetRun: Run;
  result: CompareOutput;
  date: string;
};

type CreateCommentWithoutRunInput = {
  event: Event;
  runId: number;
  result: CompareOutput;
  artifactName: string;
};

export const createCommentWithRun = ({
  event,
  artifactName,
  sha: currentHash,
  targetRun,
  result,
}: CreateCommentWithRunInput): string => {
  const [owner, repoName] = event.repository.full_name.split('/');
  const targetHash = targetRun.head_sha;
  const currentHashShort = currentHash.slice(0, 7);
  const targetHashShort = targetHash.slice(0, 7);

  const body = `This report was generated by comparing [${currentHashShort}](https://github.com/${owner}/${repoName}/commit/${currentHash}) with [${targetHashShort}](https://github.com/${owner}/${repoName}/commit/${targetHash}).
If you would like to check difference, please check [here](https://github.com/${owner}/${repoName}/compare/${targetHashShort}..${currentHashShort}).

${badge(result)}
## ArtifactName: \`${artifactName}\

${isSuccess(result) && '✨✨ There is no over threshold metrics! ✨✨'}

${metricsReport('📝 Over threshold metrics', result.overThresholdMetrics)}
${metricsReport('📝 Within threshold metrics', result.withinThresholdMetrics)}

${accordionMetricsReport('📝 New metrics', result.newMetrics)}
${accordionMetricsReport('⚠️ Deleted metrics', result.deletedMetrics)}
`;

  return body;
};

export const createCommentWithoutRun = ({ result, artifactName }: CreateCommentWithoutRunInput): string => {
  const body = `## ArtifactName: \`${artifactName}\`
  
Failed to find a target artifact.
All items will be treated as new items and will be used as expected data for the next time.

![target not found](https://img.shields.io/badge/%E2%9C%94%20reg-new%20items-blue)
${result.newMetrics.length > 0 ? metricsToTable(result.newMetrics) : 'no metrics found.'}`;

  return body;
};

const metricsReport = (title: string, metrics: (Metric | ComparedMetric)[], messageForNothing = ''): string => {
  const report = metricsToTable(metrics, messageForNothing);

  return `
### ${title}

${report}
  `;
};

const accordionMetricsReport = (
  title: string,
  metrics: (Metric | ComparedMetric)[],
  messageForNothing = '',
): string => {
  const report = metricsToTable(metrics, messageForNothing);

  return `
<details>
<summary>${title}</summary>

${report}
</details>
  `;
};

const metricsToTable = (metrics: (Metric | ComparedMetric)[], messageForNothing = ''): string => {
  if (metrics.length === 0) return messageForNothing;

  return `
| file | metrics | value |
|:-----|:--------|:-----:|
${metrics.map(metricToTd).join('\n')}`;
};

const isSuccess = (result: CompareOutput): boolean => {
  return (
    result.overThresholdMetrics.length === 0 && result.newMetrics.length === 0 && result.deletedMetrics.length === 0
  );
};

const badge = (result: CompareOutput): string => {
  if (result.overThresholdMetrics.length) {
    return '![change detected](https://img.shields.io/badge/%E2%9C%94%20reg-change%20detected-orange)';
  }
  if (result.newMetrics.length) {
    return '![new items](https://img.shields.io/badge/%E2%9C%94%20reg-new%20items-green)';
  }
  return '![success](https://img.shields.io/badge/%E2%9C%94%20reg-passed-green)';
};
