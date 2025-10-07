#!/usr/bin/env bun

import { analyzeGitDiff } from "./analyzer";
import { promptUser } from "./prompts";
import { executeCommit } from "./git";

async function main() {
  const args = process.argv.slice(2);
  const useAI = args.includes("--ai");

  try {
    // Check if we're in a git repo
    const isGitRepo = await Bun.spawn(["git", "rev-parse", "--git-dir"], {
      stdout: "pipe",
      stderr: "pipe",
    }).exited;

    if (isGitRepo !== 0) {
      console.error("❌ Not a git repository");
      process.exit(1);
    }

    // Check for staged changes
    const stagedCheck = Bun.spawn(["git", "diff", "--cached", "--name-only"], {
      stdout: "pipe",
    });
    const stagedFiles = await new Response(stagedCheck.stdout).text();

    if (!stagedFiles.trim()) {
      console.error("❌ No staged changes. Use `git add` first.");
      process.exit(1);
    }

    // Analyze the diff
    const analysis = await analyzeGitDiff();

    // Get user input
    const { type, scope, message } = await promptUser(analysis, useAI);

    // Execute commit
    await executeCommit(type, scope, message);

    console.log("✅ Commit created successfully!");
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
