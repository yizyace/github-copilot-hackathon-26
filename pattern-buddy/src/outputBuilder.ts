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

const SEVERITY_ORDER: Finding['severity'][] = ['high', 'medium', 'low'];

const SUMMARY_VERDICT: Record<string, { clean: string; found: (n: number) => string }> = {
  mentor: {
    clean: `Nothing stood out this time — the design reads cleanly. Nice work. 💚`,
    found: n => `I spotted **${n}** thing${n === 1 ? '' : 's'} worth a look. Nothing alarming — let's make it even sharper together.`
  },
  roast: {
    clean: `No patterns to roast. Clean diff. Don't let it go to your head. 🔥`,
    found: n => `**${n}** finding${n === 1 ? '' : 's'}. Pull up a chair — we need to talk about a few of these. 🔥`
  },
  zen: {
    clean: `The diff is still water. Nothing to surface today. 🌿`,
    found: n => `**${n}** observation${n === 1 ? '' : 's'} arose. Sit with each; they are invitations, not verdicts. 🌿`
  }
};

// Deterministic, tone-aware review summary built client-side from the findings,
// so every PR gets one overall verdict even when Claude returns no prose.
function buildSummary(findings: Finding[], tone: string, repoOwner: string, repoName: string): string {
  const memoryLink = `https://github.com/${repoOwner}/${repoName}/blob/HEAD/.pattern-pointers.md`;
  const verdict    = SUMMARY_VERDICT[tone] ?? SUMMARY_VERDICT['mentor'];
  const lines: string[] = ['## 🧭 PatternBuddy review', ''];

  if (findings.length === 0) {
    lines.push(verdict.clean, '', `📓 Pattern memory: [.pattern-pointers.md](${memoryLink})`);
    return lines.join('\n');
  }

  lines.push(verdict.found(findings.length), '');

  const sevBadge: Record<string, string> = { high: '🔴 high', medium: '🟡 medium', low: '🟢 low' };
  const bySeverity = SEVERITY_ORDER
    .map(s => ({ s, n: findings.filter(f => f.severity === s).length }))
    .filter(x => x.n > 0);
  lines.push('**Severity:** ' + bySeverity.map(x => `${sevBadge[x.s]} ${x.n}`).join(' · '));

  const catCounts = new Map<string, number>();
  for (const f of findings) catCounts.set(f.category, (catCounts.get(f.category) ?? 0) + 1);
  const cats = Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1]);
  lines.push('**Categories:** ' + cats.map(([c, n]) => `\`${c}\` ${n}`).join(' · '));

  const recurring = findings.filter(f => f.isRecurring);
  if (recurring.length > 0) {
    lines.push('', `**♻️ Recurring (${recurring.length}):**`);
    for (const f of recurring) {
      const ref = f.priorReference ? ` — previously ${f.priorReference}` : '';
      lines.push(`- **${f.patternName}** in \`${f.filePath}\`${ref}`);
    }
  }

  lines.push('', `📓 Full pattern memory: [.pattern-pointers.md](${memoryLink})`);
  return lines.join('\n');
}

export async function buildOutput(context: AnalysisContext): Promise<AnalysisContext> {
  const { findings } = context.analysis;
  const { tone }     = context.input.config;
  const { prNumber, repoOwner, repoName } = context.input.prMetadata;

  const comments: CommentDraft[] = findings.map(finding => ({
    filePath:  finding.filePath,
    lineStart: finding.lineStart,
    lineEnd:   finding.lineEnd,
    body:      buildCommentBody(finding, tone, prNumber)
  }));

  const mdUpdates: MDUpdate[] = findings.map(finding => ({
    category:    finding.category,
    entry:       buildMDEntry(finding, prNumber),
    patternName: finding.patternName,
    filePath:    finding.filePath,
    lineStart:   finding.lineStart
  }));

  const summary = buildSummary(findings, tone, repoOwner, repoName);

  const output: OutputPayload = { comments, mdUpdates, summary };

  return { ...context, output };
}
