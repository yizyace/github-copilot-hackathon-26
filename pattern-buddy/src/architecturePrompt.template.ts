import { ArchitectureContext } from './types';

/**
 * Builds the prompt that turns the accumulated pattern memory into a
 * health-colored Mermaid topology diagram. Asks for a strict JSON object so the
 * response is machine-parseable: { "mermaid": "...", "summary": "..." }.
 */
export function buildArchitecturePrompt(context: ArchitectureContext): string {
  return `You are PatternBuddy — a senior software architect maintaining a *living architecture map* of a codebase.

You are given the full pattern memory: every architectural observation PatternBuddy has recorded across all pull requests, in Markdown. Each entry names a file/module, a pattern or anti-pattern, and a short observation.

Your job: synthesize ALL of these observations into a single Mermaid \`graph TD\` that shows the codebase's architectural topology — which modules relate to which, and how healthy each relationship is.

PATTERN MEMORY (from .pattern-pointers.md):
${context.memory || 'No pattern memory recorded yet.'}

RULES FOR THE DIAGRAM:
1. Each node is a module/component named in the memory (use short, readable names — derive a module name from the file path, e.g. \`mdUpdater\` from \`pattern-buddy/src/mdUpdater.ts\`).
2. Each edge is a relationship the memory implies (depends-on, creates, calls, couples-to). Label edges with the relationship and a health emoji:
   - clean relationships: ✅   (e.g. \`A -->|Factory ✅| B\`)
   - watch-zone relationships: ⚠️   (e.g. \`A -->|tight coupling ⚠️| B\`)
   - danger relationships: 🔴   (e.g. \`A -->|God class 🔴| B\`)
3. Color every node by its overall health using these EXACT classDefs at the top of the graph, then assign each node a class:
   classDef clean fill:#d4edda,stroke:#28a745,color:#155724;
   classDef watch fill:#fff3cd,stroke:#ffc107,color:#856404;
   classDef danger fill:#f8d7da,stroke:#dc3545,color:#721c24;
   - clean: sound patterns (Factory, Repository, SOLID-compliant, loose coupling)
   - watch: tight coupling, emerging anti-patterns, DRY/SOLID smells
   - danger: God classes, circular dependencies, high coupling centrality
4. Use \`class NodeName clean;\` (or watch/danger) lines to assign colors. A node with no recorded issues defaults to clean.
5. Produce VALID Mermaid only — no syntax that Mermaid can't render. Do not wrap node names in quotes unless they contain spaces.
6. If the memory is empty or has no usable relationships, return a minimal graph with a single node \`Codebase\` classed clean.

OUTPUT FORMAT — return ONLY a JSON object, no prose, no markdown fences:
{
  "mermaid": "graph TD\\n  classDef clean ...;\\n  A -->|...| B\\n  class A clean;",
  "summary": "2-4 sentences: the overall shape of the architecture and where the danger zones are. Written as an architect briefing a team."
}

The "mermaid" value must be the graph body only (starting with "graph TD"), with newlines escaped as \\n. Return ONLY the JSON object.`;
}
