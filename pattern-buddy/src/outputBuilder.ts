import { AnalysisContext, Finding, CommentDraft, MDUpdate, OutputPayload } from './types';

function buildCommentBody(finding: Finding, tone: string, prNumber: number): string {
  const link      = `[See ${finding.patternName}](#${finding.mdSection})`;
  const recurring = finding.isRecurring && finding.priorReference
    ? `\n\n> 🔁 Recurring pattern — also seen in ${finding.priorReference}`
    : '';

  const severityBadge: Record<string, string> = {
    high:   '🔴 High',
    medium: '🟡 Medium',
    low:    '🟢 Low'
  };

  const badge = severityBadge[finding.severity] ?? finding.severity;

  const tonePrefix: Record<string, string> = {
    mentor: `**${finding.patternName}** · ${badge}\n\n${finding.observation}\n\n💡 ${finding.suggestion}`,
    roast:  `**${finding.patternName}** · ${badge}\n\n${finding.observation}\n\n🔧 ${finding.suggestion}`,
    zen:    `**${finding.patternName}** · ${badge}\n\n${finding.observation}\n\n🌿 ${finding.suggestion}`
  };

  const body = tonePrefix[tone] ?? tonePrefix['mentor'];

  return `${body}${recurring}\n\n${link}`;
}

function buildMDEntry(finding: Finding, prNumber: number): string {
  const recurring = finding.isRecurring && finding.priorReference
    ? ` Recurring pattern — also observed in ${finding.priorReference}.`
    : '';
  return `- **${finding.patternName}** in \`${finding.filePath}\` (lines ${finding.lineStart}–${finding.lineEnd}, PR #${prNumber}): ${finding.observation}${recurring}`;
}

export async function buildOutput(context: AnalysisContext): Promise<AnalysisContext> {
  const { findings } = context.analysis;
  const { tone }     = context.input.config;
  const { prNumber } = context.input.prMetadata;

  const comments: CommentDraft[] = findings.map(finding => ({
    filePath:  finding.filePath,
    lineStart: finding.lineStart,
    lineEnd:   finding.lineEnd,
    body:      buildCommentBody(finding, tone, prNumber)
  }));

  const mdUpdates: MDUpdate[] = findings.map(finding => ({
    category: finding.category,
    entry:    buildMDEntry(finding, prNumber)
  }));

  const output: OutputPayload = { comments, mdUpdates };

  return { ...context, output };
}
