export interface DiffAnalysis {
  files: string[];
  suggestedType: string;
  suggestedScope: string;
  suggestedMessage: string;
  stats: {
    additions: number;
    deletions: number;
  };
}

export async function analyzeGitDiff(): Promise<DiffAnalysis> {
  // Get the diff
  const diffProc = Bun.spawn(['git', 'diff', '--cached'], {
    stdout: 'pipe',
  });
  const diff = await new Response(diffProc.stdout).text();

  // Get file list
  const filesProc = Bun.spawn(['git', 'diff', '--cached', '--name-only'], {
    stdout: 'pipe',
  });
  const filesText = await new Response(filesProc.stdout).text();
  const files = filesText.trim().split('\n').filter(Boolean);

  // Get stats
  const statsProc = Bun.spawn(['git', 'diff', '--cached', '--numstat'], {
    stdout: 'pipe',
  });
  const statsText = await new Response(statsProc.stdout).text();
  const stats = statsText
    .trim()
    .split('\n')
    .reduce(
      (acc, line) => {
        const [add, del] = line.split('\t');
        return {
          additions: acc.additions + (parseInt(add) || 0),
          deletions: acc.deletions + (parseInt(del) || 0),
        };
      },
      { additions: 0, deletions: 0 }
    );

  // Analyze files for type and scope
  const suggestedType = inferType(files, diff);
  const suggestedScope = inferScope(files);
  const suggestedMessage = inferMessage(files, diff, stats);

  return {
    files,
    suggestedType,
    suggestedScope,
    suggestedMessage,
    stats,
  };
}

function inferType(files: string[], diff: string): string {
  // Check file patterns
  const hasTests = files.some(f => f.includes('test') || f.includes('spec'));
  const hasDocs = files.some(f => f.includes('README') || f.includes('.md') || f.includes('doc'));
  const hasConfig = files.some(f =>
    f.includes('config') ||
    f.includes('.json') ||
    f.includes('.yml') ||
    f.includes('.yaml') ||
    f.includes('package.json')
  );

  // Check diff content
  const hasNewFiles = diff.includes('new file mode');
  const hasDeletedFiles = diff.includes('deleted file mode');
  const diffLower = diff.toLowerCase();
  const hasFix = diffLower.includes('fix') || diffLower.includes('bug');
  const hasRefactor = diffLower.includes('refactor') || diffLower.includes('rename');

  // Prioritize type detection
  if (hasTests) return 'test';
  if (hasDocs) return 'docs';
  if (hasConfig) return 'chore';
  if (hasFix) return 'fix';
  if (hasRefactor) return 'refactor';
  if (hasNewFiles) return 'feat';
  if (hasDeletedFiles) return 'refactor';

  return 'feat'; // Default
}

function inferScope(files: string[]): string {
  if (files.length === 0) return '';

  // Try to extract common directory or module name
  const firstFile = files[0];
  const parts = firstFile.split('/');

  // If in src/components/Button.tsx → scope: "button"
  if (parts.length > 1) {
    const filename = parts[parts.length - 1].replace(/\.(ts|tsx|js|jsx|vue|py|go|rs|java)$/, '');
    // Convert PascalCase or camelCase to kebab-case
    const scope = filename
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    return scope;
  }

  return '';
}

function inferMessage(files: string[], diff: string, stats: DiffAnalysis['stats']): string {
  const fileNames = files.map(f => {
    const parts = f.split('/');
    return parts[parts.length - 1].replace(/\.(ts|tsx|js|jsx|vue|py|go|rs|java)$/, '');
  });

  // Check for common patterns
  const diffLower = diff.toLowerCase();
  const hasAdd = diff.includes('+++') && stats.additions > stats.deletions;
  const hasRemove = diff.includes('---') && stats.deletions > stats.additions;
  const hasUpdate = stats.additions > 0 && stats.deletions > 0;

  // Try to extract function/class names from diff
  const functionMatches = diff.match(/^\+.*(?:function|const|let|class|def|func)\s+(\w+)/gm);
  const newFunctions = functionMatches?.map(m => {
    const match = m.match(/(?:function|const|let|class|def|func)\s+(\w+)/);
    return match ? match[1] : null;
  }).filter(Boolean);

  if (newFunctions && newFunctions.length > 0) {
    const funcName = newFunctions[0];
    return `add ${funcName} ${fileNames[0] ? 'to ' + fileNames[0] : ''}`.trim();
  }

  if (hasAdd && files.length === 1) {
    return `add ${fileNames[0]}`;
  }

  if (hasRemove && files.length === 1) {
    return `remove ${fileNames[0]}`;
  }

  if (hasUpdate && files.length === 1) {
    return `update ${fileNames[0]}`;
  }

  if (files.length === 1) {
    return `update ${fileNames[0]}`;
  }

  return `update ${files.length} files`;
}
