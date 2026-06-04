import * as core   from '@actions/core';
import * as github from '@actions/github';
import { buildInput }    from './inputBuilder';
import { loadHistory }   from './historyLoader';
import { callClaude }    from './claudeCaller';
import { buildOutput }   from './outputBuilder';
import { postComments }  from './commentPoster';
import { updateMD }      from './mdUpdater';
import { handleError }   from './errorHandler';
import { buildArchitectureInput }  from './architectureInput';
import { generateArchitectureMap } from './architectureMapper';
import { commitArchitectureMap }   from './architectureCommitter';
import { postArchitectureComment } from './architectureComment';
import { loadConfig } from './config';

/** Per-PR analysis: review the diff, post inline comments, update pattern memory. */
async function runAnalysis(): Promise<void> {
  core.info('PatternBuddy: Starting analysis...');

  const withInput    = await buildInput();
  core.info('PatternBuddy: Input built.');

  const withHistory  = await loadHistory(withInput);
  core.info('PatternBuddy: History loaded.');

  const withAnalysis = await callClaude(withHistory);
  core.info(`PatternBuddy: Analysis complete. ${withAnalysis.analysis.findings.length} finding(s).`);

  const withOutput   = await buildOutput(withAnalysis);
  core.info('PatternBuddy: Output built.');

  await postComments(withOutput);
  core.info('PatternBuddy: Comments posted.');

  await updateMD(withOutput);
  core.info('PatternBuddy: Pattern memory updated.');

  core.info('PatternBuddy: Done. 🎉');
}

/** Post-merge pass: turn the accumulated pattern memory into a living architecture map. */
async function runArchitecture(): Promise<void> {
  core.info('PatternBuddy: Starting architecture-map pass...');

  // Gate on config before any API work so a disabled repo does nothing.
  if (!loadConfig().architectureMap.enabled) {
    core.info('PatternBuddy: Architecture map disabled in config. Skipping.');
    return;
  }

  const input   = await buildArchitectureInput();
  const withMap = await generateArchitectureMap(input);
  core.info('PatternBuddy: Architecture map generated.');

  await commitArchitectureMap(withMap);
  await postArchitectureComment(withMap);

  core.info('PatternBuddy: Architecture map updated. 🗺️');
}

async function run(): Promise<void> {
  try {
    const ctx     = github.context;
    const payload = ctx.payload as { action?: string; pull_request?: { merged?: boolean } };
    const mode    = core.getInput('mode');

    const isClose = ctx.eventName === 'pull_request' && payload.action === 'closed';
    const isMerge = isClose && payload.pull_request?.merged === true;

    // A PR closed without merging leaves nothing to map or review.
    if (isClose && !isMerge && mode !== 'architecture') {
      core.info('PatternBuddy: PR closed without merging — nothing to do.');
      return;
    }

    if (mode === 'architecture' || isMerge) {
      await runArchitecture();
    } else {
      await runAnalysis();
    }
  } catch (error) {
    await handleError(error);
  }
}

run();
