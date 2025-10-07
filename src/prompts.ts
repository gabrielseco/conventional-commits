import type { DiffAnalysis } from './analyzer';
import { generateAIMessage } from './ai';

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

  // Prompt for type
  console.log(`Suggested type: ${analysis.suggestedType}`);
  console.log(`Available: ${COMMIT_TYPES.join(', ')}`);
  const typeInput = prompt('Commit type (press Enter for suggestion):');
  const type = typeInput?.trim() || analysis.suggestedType;

  if (!COMMIT_TYPES.includes(type)) {
    console.log(`⚠️  Warning: '${type}' is not a standard conventional commit type`);
  }

  // Prompt for scope
  const scopeInput = prompt(
    `Scope${analysis.suggestedScope ? ` (suggested: ${analysis.suggestedScope})` : ''} (optional):`
  );
  const scope = scopeInput?.trim() || analysis.suggestedScope;

  // Prompt for message
  let suggestedMessage = analysis.suggestedMessage;

  if (useAI) {
    console.log('\n🤖 Generating AI suggestion...');
    try {
      suggestedMessage = await generateAIMessage(analysis);
      console.log(`AI suggested: ${suggestedMessage}\n`);
    } catch (error) {
      console.log(`⚠️  AI generation failed: ${error instanceof Error ? error.message : error}`);
      console.log(`Falling back to local suggestion: ${suggestedMessage}\n`);
    }
  } else {
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
