import * as core from '@actions/core';
import { buildInput }    from './inputBuilder';
import { loadHistory }   from './historyLoader';
import { callClaude }    from './claudeCaller';
import { buildOutput }   from './outputBuilder';
import { postComments }  from './commentPoster';
import { updateMD }      from './mdUpdater';
import { handleError }   from './errorHandler';

async function run(): Promise<void> {
  try {
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
  } catch (error) {
    await handleError(error);
  }
}

run();
