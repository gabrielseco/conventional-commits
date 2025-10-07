export async function executeCommit(
  type: string,
  scope: string,
  message: string
): Promise<void> {
  const commitMessage = scope ? `${type}(${scope}): ${message}` : `${type}: ${message}`;

  const proc = Bun.spawn(['git', 'commit', '-m', commitMessage], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const error = await new Response(proc.stderr).text();
    throw new Error(`Git commit failed: ${error}`);
  }
}
