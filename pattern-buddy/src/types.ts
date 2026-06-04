export type PatternCategory =
  | 'factory-patterns'
  | 'singleton-patterns'
  | 'coupling-issues'
  | 'solid-violations'
  | 'dry-violations'
  | 'observer-patterns'
  | 'best-practices'
  | 'other';

export interface PRMetadata {
  readonly prNumber:     number;
  readonly prTitle:      string;
  readonly author:       string;
  readonly branch:       string;
  readonly repoName:     string;
  readonly repoOwner:    string;
  readonly filesChanged: string[];
}

export interface ArchitectureMapConfig {
  readonly enabled:  boolean;
  readonly output:   string;          // e.g. "docs/architecture.md"
  readonly updateOn: 'merge' | 'open';
}

export interface BuddyConfig {
  readonly tone:            'mentor' | 'roast' | 'zen';
  readonly strictness:      'strict' | 'balanced' | 'relaxed';
  readonly architectureMap: ArchitectureMapConfig;
}

export interface Finding {
  readonly patternName:    string;
  readonly category:       PatternCategory;
  readonly severity:       'high' | 'medium' | 'low';
  readonly filePath:       string;
  readonly lineStart:      number;
  readonly lineEnd:        number;
  readonly observation:    string;
  readonly suggestion:     string;
  readonly mdSection:      string;
  readonly isRecurring:    boolean;
  readonly priorReference?: string;
}

export interface InputPayload {
  readonly prMetadata:  PRMetadata;
  readonly diffContent: string;
  readonly config:      BuddyConfig;
  readonly history:     string;
}

export interface AnalysisPayload {
  readonly findings: Finding[];
}

export interface CommentDraft {
  readonly filePath:  string;
  readonly lineStart: number;
  readonly lineEnd:   number;
  readonly body:      string;
}

export interface MDUpdate {
  readonly category: PatternCategory;
  readonly entry:    string;
}

export interface OutputPayload {
  readonly comments:   CommentDraft[];
  readonly mdUpdates:  MDUpdate[];
}

export interface AnalysisContext {
  readonly input:    InputPayload;
  readonly analysis: AnalysisPayload;
  readonly output:   OutputPayload;
}

export interface ArchitecturePayload {
  readonly mermaid:  string;   // the Mermaid graph body
  readonly summary:  string;   // Claude's plain-language notes on the topology
  readonly markdown: string;   // the full rendered docs/architecture.md content
}

/**
 * Context for the post-merge architecture-map pass. Lighter than AnalysisContext:
 * it works from the accumulated pattern memory rather than a single PR diff.
 */
export interface ArchitectureContext {
  readonly prNumber:     number;
  readonly prTitle:      string;
  readonly author:       string;
  readonly baseBranch:   string;   // where the doc is committed (PR was merged here)
  readonly repoOwner:    string;
  readonly repoName:     string;
  readonly config:       BuddyConfig;
  readonly memory:       string;   // full .pattern-pointers.md content
  readonly architecture: ArchitecturePayload;
}
