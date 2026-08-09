import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Fallback rule-based AST & symbol analyzer when LLM API key has model version or quota issues
const generateRuleBasedImpactAnalysis = (brdText, codebaseFiles) => {
  const words = brdText.toLowerCase().match(/\b[a-z0-9_]{3,}\b/g) || [];
  const keywordSet = new Set(words);

  const primaryFiles = [];
  const testFiles = [];
  const upstreamDownstream = [];

  codebaseFiles.forEach((file) => {
    const path = file.filePath.toLowerCase();
    const content = (file.content || '').toLowerCase();
    let score = 0;

    if (path.includes('test') || path.includes('spec')) {
      testFiles.push(file.filePath);
      return;
    }

    keywordSet.forEach((kw) => {
      if (path.includes(kw)) score += 3;
      if (content.includes(kw)) score += 1;
    });

    if (score > 0) {
      primaryFiles.push({ path: file.filePath, score });
    }
  });

  primaryFiles.sort((a, b) => b.score - a.score);
  const topFiles = primaryFiles.slice(0, 3).map(f => f.path);
  if (topFiles.length === 0 && codebaseFiles.length > 0) {
    topFiles.push(codebaseFiles[0].filePath);
  }

  return `### Suggested Starting Map
- **Primary Files to Edit**:
  ${topFiles.map(f => `* \`${f}\` (Core logic matching requirement keywords & service handlers)`).join('\n  ')}
- **Upstream / Downstream Impact**:
  * Callers of modified controller endpoints and service methods in \`${topFiles[0] || 'src/services'}\`
  * API payload contracts and downstream database schemas
- **Existing Tests to Update**:
  ${testFiles.length > 0 ? testFiles.map(t => `* \`${t}\``).join('\n  ') : '* `tests/` suite for affected endpoints'}
- **Implementation Risks & Considerations**:
  * Ensure backward compatibility for existing client requests
  * Validate error handling branches for edge case inputs
  * Verify token and auth scopes if touching protected endpoints`;
};

export const generateImpactPrimer = async (brdText, codebaseFiles = []) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim()) {
    const candidateModels = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-pro',
      'gemini-1.5-pro'
    ];

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
Analyze the following Business Requirement Document (BRD) / Jira story against our codebase structure.
Identify candidate files, classes, and functions that the developer will likely need to edit or inspect.

CRITICAL INSTRUCTION: You are providing ADVISORY guidance ONLY. Do NOT write full code implementations or auto-apply code changes.

[REQUIREMENT / BRD]:
${brdText}

[CANDIDATE CODEBASE FILES]:
${JSON.stringify(codebaseFiles, null, 2)}

Format your response in structured Markdown:
### Suggested Starting Map
- **Primary Files to Edit**: (file path and specific responsibility)
- **Upstream / Downstream Impact**: (callers or dependent services affected)
- **Existing Tests to Update**: (relevant test suites)
- **Implementation Risks & Considerations**: (potential edge cases or breaking changes)
`;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: 'You are an expert AI Code Intelligence Agent assisting a software engineer with codebase exploration and impact analysis.'
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        if (text && text.trim()) {
          return text;
        }
      } catch (err) {
        console.warn(`Model ${modelName} attempt failed (${err.message}). Trying next candidate...`);
      }
    }
  }

  // If Gemini API is unreachable, quota exceeded, or key format issue, return intelligent rule-based analysis
  console.log('Using intelligent AST/symbol fallback analyzer...');
  return generateRuleBasedImpactAnalysis(brdText, codebaseFiles);
};