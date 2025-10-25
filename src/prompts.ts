import type { DiffAnalysis } from './analyzer';
import { generateAICommit } from './ai';

const COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
];

export async function promptUser(
  analysis: DiffAnalysis,
  useAI: boolean
): Promise<{ type: string; scope: string; message: string }> {
  console.log('\n📝 Creating conventional commit...\n');

  // Show file changes
  console.log(`📁 Files changed (${analysis.files.length}):`);
  analysis.files.slice(0, 5).forEach(f => console.log(`   ${f}`));
  if (analysis.files.length > 5) {
    console.log(`   ... and ${analysis.files.length - 5} more`);
  }
  console.log(`   +${analysis.stats.additions} -${analysis.stats.deletions}\n`);

  let suggestedType = analysis.suggestedType;
  let suggestedScope = analysis.suggestedScope;
  let suggestedMessage = analysis.suggestedMessage;

  // If AI is enabled, get AI suggestions for everything
  if (useAI) {
    console.log('🤖 Analyzing changes with AI...');
    try {
      const aiSuggestion = await generateAICommit(analysis);
      suggestedType = aiSuggestion.type;
      suggestedScope = aiSuggestion.scope;
      suggestedMessage = aiSuggestion.message;

      // Show complete formatted commit
      const fullCommit = suggestedScope
        ? `${suggestedType}(${suggestedScope}): ${suggestedMessage}`
        : `${suggestedType}: ${suggestedMessage}`;
      console.log(`✨ Suggested: ${fullCommit}\n`);

      const acceptAI = prompt('Accept this commit? (Y/n):');
      if (!acceptAI || acceptAI.toLowerCase() !== 'n') {
        return { type: suggestedType, scope: suggestedScope, message: suggestedMessage };
      }

      console.log('\n✏️  Let\'s customize the commit...\n');
    } catch (error) {
      console.log(`⚠️  AI generation failed: ${error instanceof Error ? error.message : error}`);
      console.log(`Falling back to local suggestions\n`);
    }
  }

  // Prompt for type
  console.log(`Suggested type: ${suggestedType}`);
  console.log(`Available: ${COMMIT_TYPES.join(', ')}`);
  const typeInput = prompt('Commit type (press Enter for suggestion):');
  const type = typeInput?.trim() || suggestedType;

  if (!COMMIT_TYPES.includes(type)) {
    console.log(`⚠️  Warning: '${type}' is not a standard conventional commit type`);
  }

  // Prompt for scope
  const scopeInput = prompt(
    `Scope${suggestedScope ? ` (suggested: ${suggestedScope})` : ''} (optional):`
  );
  const scope = scopeInput?.trim() || suggestedScope;

  // Prompt for message
  if (!useAI) {
    console.log(`Suggested message: ${suggestedMessage}`);
  }
  const messageInput = prompt('Commit message (press Enter for suggestion):');
  const message = messageInput?.trim() || suggestedMessage;

  // Show preview
  const fullCommit = scope ? `${type}(${scope}): ${message}` : `${type}: ${message}`;
  console.log(`\n📋 Preview: ${fullCommit}`);

  const confirm = prompt('Proceed? (Y/n):');
  if (confirm && confirm.toLowerCase() === 'n') {
    console.log('❌ Commit cancelled');
    process.exit(0);
  }

  return { type, scope, message };
}
