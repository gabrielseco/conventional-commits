import Anthropic from "@anthropic-ai/sdk";
import type { DiffAnalysis } from "./analyzer";

export async function generateAIMessage(
  analysis: DiffAnalysis
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not found. Set it with: export ANTHROPIC_API_KEY=your_key_here"
    );
  }

  const client = new Anthropic({ apiKey });

  console.log('🔌 Calling Anthropic API...');

  // Get the full diff
  const diffProc = Bun.spawn(["git", "diff", "--cached"], {
    stdout: "pipe",
  });
  const diff = await new Response(diffProc.stdout).text();
  const prompt = `You are a commit message generator. Analyze this git diff and generate a concise commit message that describes what changed and why.

Rules:
- Return ONLY the commit message text (no type or scope prefix)
- Keep it under 60 characters if possible
- Focus on WHAT changed and WHY (not HOW)
- Use imperative mood (e.g., "add feature" not "added feature")
- Be specific but concise

Example good messages:
- "add user authentication"
- "fix memory leak in parser"
- "update API to v2 spec"

Git diff:
${diff.slice(0, 8000)}${diff.length > 8000 ? "\n... (truncated)" : ""}`;

  const message = await client.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 100,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  return text.trim().replace(/^["']|["']$/g, ""); // Remove quotes if present
}
