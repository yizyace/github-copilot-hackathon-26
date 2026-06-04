import { describe, it, expect } from 'vitest';
import { buildPrompt } from './prompt.template';
import { AnalysisContext } from './types';
import { Skill } from './skillLoader';

function ctx(skills: Skill[]): AnalysisContext {
  return {
    input: {
      prMetadata: {
        prNumber: 1, prTitle: 't', author: 'a', branch: 'b',
        repoName: 'r', repoOwner: 'o', filesChanged: []
      },
      diffContent: 'diff --git a/x b/x',
      config: { tone: 'mentor', strictness: 'balanced' },
      history: '',
      skills
    },
    analysis: { findings: [] },
    output:   { comments: [], mdUpdates: [], summary: '' }
  };
}

const skill = (over: Partial<Skill> = {}): Skill => ({
  slug: 'coupling', name: 'Tight Coupling', category: 'coupling',
  severityCeiling: 'major', enabled: true, body: 'Look for cross-module reach.', ...over
});

describe('buildPrompt skills injection', () => {
  it('injects enabled playbook names and bodies', () => {
    const prompt = buildPrompt(ctx([skill(), skill({ slug: 'dry', name: 'DRY', body: 'Avoid duplication.' })]));
    expect(prompt).toContain('PATTERN PLAYBOOKS');
    expect(prompt).toContain('### Tight Coupling');
    expect(prompt).toContain('Look for cross-module reach.');
    expect(prompt).toContain('### DRY');
    expect(prompt).toContain('Avoid duplication.');
  });

  it('falls back gracefully when no playbooks are configured', () => {
    const prompt = buildPrompt(ctx([]));
    expect(prompt).toContain('No custom playbooks configured');
  });
});
