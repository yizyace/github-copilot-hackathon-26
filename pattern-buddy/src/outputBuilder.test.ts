import { describe, it, expect } from 'vitest';
import { buildOutput } from './outputBuilder';
import { AnalysisContext, BuddyConfig, Finding } from './types';

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    patternName: 'Tight Coupling',
    category:    'coupling-issues',
    severity:    'high',
    filePath:    'src/foo.ts',
    lineStart:   10,
    lineEnd:     12,
    observation: 'Module reaches across boundaries.',
    suggestion:  'Introduce an interface.',
    mdSection:   'coupling-issues',
    isRecurring: false,
    ...overrides
  };
}

function context(findings: Finding[], config: BuddyConfig): AnalysisContext {
  return {
    input: {
      prMetadata: {
        prNumber: 7, prTitle: 'x', author: 'a', branch: 'b',
        repoName: 'repo', repoOwner: 'owner', filesChanged: ['src/foo.ts']
      },
      diffContent: '',
      config,
      history: '',
      skills: []
    },
    analysis: { findings },
    output:   { comments: [], mdUpdates: [], summary: '' }
  };
}

const mentor: BuddyConfig = { tone: 'mentor', strictness: 'balanced' };

describe('buildOutput summary', () => {
  it('reports counts by severity and category, and links to memory', async () => {
    const { output } = await buildOutput(context([
      finding({ severity: 'high', category: 'coupling-issues' }),
      finding({ severity: 'low', category: 'dry-violations', patternName: 'Dup' })
    ], mentor));

    expect(output.summary).toContain('**2**');
    expect(output.summary).toContain('🔴 high 1');
    expect(output.summary).toContain('🟢 low 1');
    expect(output.summary).toContain('`coupling-issues` 1');
    expect(output.summary).toContain('`dry-violations` 1');
    expect(output.summary).toContain('blob/HEAD/.pattern-pointers.md');
  });

  it('emits an encouraging clean verdict with no severity line when there are no findings', async () => {
    const { output } = await buildOutput(context([], mentor));
    expect(output.summary).toContain('cleanly');
    expect(output.summary).not.toContain('**Severity:**');
  });

  it('calls out recurring findings', async () => {
    const { output } = await buildOutput(context([
      finding({ isRecurring: true, priorReference: 'PR #3' })
    ], mentor));
    expect(output.summary).toContain('♻️ Recurring (1)');
    expect(output.summary).toContain('previously PR #3');
  });

  it('varies the verdict by tone', async () => {
    const { output } = await buildOutput(context([finding()], { tone: 'roast', strictness: 'strict' }));
    expect(output.summary).toContain('Pull up a chair');
  });
});

describe('buildOutput memory entries', () => {
  it('carries the dedupe identity (patternName, filePath, lineStart) on each MDUpdate', async () => {
    const { output } = await buildOutput(context([
      finding({ patternName: 'Singleton', filePath: 'src/a.ts', lineStart: 5 })
    ], mentor));
    expect(output.mdUpdates).toHaveLength(1);
    expect(output.mdUpdates[0]).toMatchObject({
      patternName: 'Singleton', filePath: 'src/a.ts', lineStart: 5
    });
  });
});
