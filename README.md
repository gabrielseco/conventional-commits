# Conventional Commits CLI

A smart CLI tool for creating conventional commits with local AI-powered or rule-based suggestions.

## Features

- 🎯 **Smart local suggestions** - Analyzes git diff to suggest commit type, scope, and message
- 🤖 **Optional AI mode** - Use Claude AI for better commit message suggestions (requires API key)
- 🔒 **Privacy-first** - Local mode sends no data to external services
- ⚡ **Fast** - Built with Bun for instant startup
- 📝 **Interactive** - Guided prompts for all commit components

## Installation

1. Install dependencies:
```bash
bun install
```

2. Build the CLI:
```bash
bun run build
```

3. Add to your PATH (choose one method):

### Option A: Global install (recommended)
```bash
bun link
```

### Option B: Add alias to `.zshrc` or `.bashrc`
```bash
echo 'alias commit="bun /Users/gabriel/rogal/conventional-commits/dist/index.js"' >> ~/.zshrc
echo 'alias cai="bun /Users/gabriel/rogal/conventional-commits/dist/index.js --ai"' >> ~/.zshrc
source ~/.zshrc
```

## Usage

### Local mode (default)
```bash
commit
```
Analyzes your staged changes and suggests commit details locally. **No data sent anywhere.**

### AI mode
```bash
commit --ai
# or if using alias:
cai
```
Uses Claude AI for smarter commit message suggestions.

**Requirements for AI mode:**
- Set `ANTHROPIC_API_KEY` environment variable
- Add to your shell config:
  ```bash
  export ANTHROPIC_API_KEY='your_api_key_here'
  ```

**What gets sent to Anthropic:**
- Your git diff (staged changes only)
- File paths that changed
- **Not sent:** Your entire codebase, git history, or unstaged files

**Privacy notes:**
- Anthropic does NOT use API data for training models
- Costs ~$0.01-0.03 per commit
- See [Anthropic's Commercial Terms](https://www.anthropic.com/commercial)

## Example Workflow

```bash
# 1. Make your changes
vim src/cost-calculator.ts

# 2. Stage them
git add src/cost-calculator.ts

# 3. Use the CLI
commit

# Output:
# 📝 Creating conventional commit...
#
# 📁 Files changed (1):
#    src/cost-calculator.ts
#    +45 -12
#
# Suggested type: feat
# Available: feat, fix, docs, style, refactor, perf, test, build, ci, chore
# Commit type (press Enter for suggestion):
# Scope (suggested: cost-calculator) (optional):
# Suggested message: add management fee calculation
# Commit message (press Enter for suggestion):
#
# 📋 Preview: feat(cost-calculator): add management fee calculation
# Proceed? (Y/n): y
# ✅ Commit created successfully!
```

## How It Works

### Local Mode (Default)
1. Analyzes `git diff --cached` to understand your changes
2. Suggests commit type based on:
   - File patterns (tests → `test`, docs → `docs`, configs → `chore`)
   - Diff content (new files → `feat`, fixes → `fix`)
3. Suggests scope from file names
4. Generates message from added/removed code patterns
5. You can accept suggestions or customize them

### AI Mode (`--ai`)
1. Sends your git diff to Anthropic's API
2. Claude analyzes the changes and generates a descriptive message
3. All other steps same as local mode

## Conventional Commit Format

```
type(scope): message
```

**Standard types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style/formatting (no logic change)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `build` - Build system changes
- `ci` - CI/CD changes
- `chore` - Maintenance tasks

## Development

```bash
# Run in dev mode
bun run dev

# Build for production
bun run build
```

## License

MIT
