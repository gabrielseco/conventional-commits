import Anthropic from "@anthropic-ai/sdk";
import type { DiffAnalysis } from "./analyzer";

export interface AICommitSuggestion {
  type: string;
  scope: string;
  message: string;
}

export async function generateAICommit(
  analysis: DiffAnalysis
): Promise<AICommitSuggestion> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not found. Set it with: export ANTHROPIC_API_KEY=your_key_here"
    );
  }

  const client = new Anthropic({ apiKey });

  // Get the full diff
  const diffProc = Bun.spawn(["git", "diff", "--cached"], {
    stdout: "pipe",
  });
  const diff = await new Response(diffProc.stdout).text();

  // Get file list for context
  const fileList = analysis.files.join("\n");

  const prompt = `You are an expert at analyzing code changes and generating conventional commit messages. Analyze this git diff and generate a proper conventional commit.

**Changed files:**
${fileList}

**Statistics:**
+${analysis.stats.additions} -${analysis.stats.deletions}

**Git diff:**
${diff.slice(0, 8000)}${diff.length > 8000 ? "\n... (truncated)" : ""}

Generate a conventional commit with these components:

1. **Type** - Choose ONE from: feat, fix, docs, style, refactor, perf, test, build, ci, chore
   - feat: New feature
   - fix: Bug fix
   - docs: Documentation only
   - style: Formatting, no code change
   - refactor: Code change that neither fixes bug nor adds feature
   - perf: Performance improvement
   - test: Adding or updating tests
   - build: Build system or dependencies
   - ci: CI configuration
   - chore: Other changes (configs, tooling)

2. **Scope** - A short noun describing the affected module/component (optional but recommended)
   - Examples: api, auth, parser, ui, database, config
   - Use kebab-case (lowercase with hyphens)
   - Leave empty if change affects multiple unrelated areas

3. **Message** - A concise description
   - Use imperative mood: "add" not "added"
   - No period at end
   - Under 60 characters preferred
   - Focus on WHAT and WHY, not HOW

**Return format (JSON):**
{
  "type": "feat",
  "scope": "auth",
  "message": "add OAuth2 authentication"
}

Return ONLY valid JSON, nothing else.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse the JSON response - handle markdown code fences and extra text
  let cleanedText = text.trim();

  // Remove markdown code fences if present
  const jsonMatch = cleanedText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    cleanedText = jsonMatch[1].trim();
  }

  // Try to extract just the JSON object if there's surrounding text
  const objectMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    cleanedText = objectMatch[0];
  }

  try {
    const parsed = JSON.parse(cleanedText);
    return {
      type: parsed.type || "feat",
      scope: parsed.scope || "",
      message: parsed.message || "update code",
    };
  } catch (error) {
    console.log("⚠️  Failed to parse AI response, attempting to extract...");

    // Fallback: try to extract from text using regex
    const typeMatch = text.match(/"type"\s*:\s*"([^"]+)"/);
    const scopeMatch = text.match(/"scope"\s*:\s*"([^"]*)"/);
    const messageMatch = text.match(/"message"\s*:\s*"([^"]+)"/);

    return {
      type: typeMatch ? typeMatch[1] : analysis.suggestedType,
      scope: scopeMatch ? scopeMatch[1] : analysis.suggestedScope,
      message: messageMatch ? messageMatch[1] : analysis.suggestedMessage,
    };
  }
}

// Legacy function for backwards compatibility (now just calls the new one)
export async function generateAIMessage(
  analysis: DiffAnalysis
): Promise<string> {
  const result = await generateAICommit(analysis);
  return result.message;
}
