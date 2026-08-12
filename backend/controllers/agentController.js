import parseDiff from 'parse-diff';
import { generateImpactPrimer, generatePreReview } from '../services/geminiServices.js';
import { getIndexedFilesForRepo, getAllIndexedFilesWithDetails } from '../services/codeIndexer.js';
import { addHistoryEntry } from './repoController.js';

export const handleImpactAnalysis = async (req, res) => {
  try {
    const { brdText, repoId, requirementId } = req.body;

    if (!brdText) {
      return res.status(400).json({ error: 'BRD / Requirement text is required.' });
    }

    // Get live indexed files (with rootPath, functions, module tags)
    const detailedFiles = getAllIndexedFilesWithDetails(repoId || 'repo-1');
    const candidateFiles = detailedFiles.map(f => ({
      filePath: f.filePath || f.rootPath,
      module: f.module,
      functions: f.functions,
      lineCount: f.lineCount,
      isTestFile: f.isTestFile,
    }));

    const result = await generateImpactPrimer(brdText, candidateFiles);

    // Record into history
    addHistoryEntry({
      id: `HIST-${Date.now()}`,
      requirementId: requirementId || 'JIRA-REQ',
      title: brdText.split('\n')[0].replace(/^Requirement:\s*/, '') || 'Code Impact Analysis',
      status: 'Completed',
      confidence: result.stats?.confidence || '97%',
      impactedFiles: result.impactedFiles?.length || 4,
      timestamp: 'Just now',
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Impact Controller Error:', error);
    return res.status(500).json({ error: 'Failed to process impact analysis.' });
  }
};

export const handlePreReview = async (req, res) => {
  try {
    const { rawGitDiff, requirementId } = req.body;

    if (!rawGitDiff) {
      return res.status(400).json({ error: 'Git diff output is required.' });
    }

    const parsedDiff = parseDiff(rawGitDiff);
    const filesTouched = parsedDiff.map((file) => file.to || file.from);

    const result = await generatePreReview(rawGitDiff, requirementId, filesTouched);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Pre-Review Controller Error:', error);
    return res.status(500).json({ error: 'Failed to process pre-review pass.' });
  }
};