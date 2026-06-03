# Context Control Template

A master token budget management script for JanitorAI that provides slash commands to select context window size, calculates per-script token allocations, and injects budget information that other lorebooks read to cap their output.

Designed to solve the problem of multiple lorebooks competing for limited context space, especially on smaller models like JLLM where every token matters.

## Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Tier Reference](#tier-reference)
- [Token Budget Math](#token-budget-math)
- [Command Reference](#command-reference)
- [State Schema](#state-schema)
- [Character Card Setup](#character-card-setup)
- [Integration Guide for Other Scripts](#integration-guide-for-other-scripts)
- [For Non-Programmers: AI-Assisted Setup](#for-non-programmers-ai-assisted-setup)
- [Safe Removal](#safe-removal)
- [Troubleshooting](#troubleshooting)

## Overview

This template provides:

- **Slash Command Control**: `/maxtokens` for tier selection, `/budget` to display current settings
- **Five Context Tiers**: From 8k (JLLM) to 128k+ (DeepSeek, Hermes 3, Llama 4)
- **Automatic Budget Division**: Reads `[Lorebook Count: N]` from the scenario and divides the token budget evenly across all active lorebooks
- **Human-Readable Budget Output**: Injects `[CONTEXT BUDGET: ...]` into the scenario text for any script to parse
- **Zero-Width State Persistence**: Stores the tier selection across messages using invisible Unicode characters

This script is one half of a two-script framework. The other half is the **Context Control Awareness Template**, which demonstrates how any lorebook can read the budget and adapt its output.

## Quick Start

### Step 1: Add to Character Card

Install `Context_Control_Template.js` as a lorebook entry in your character card. Set it to always activate (no keyword requirement, or use a keyword like `*`).

### Step 2: Set Lorebook Count

Add this line to your character card's scenario text:

```
[Lorebook Count: 5]
```

Replace `5` with the number of lorebooks/scripts active in your session (including this one).

### Step 3: Select Your Tier

Send `/maxtokens` in chat to see the tier selection menu, then respond with a number 1-5. Or set directly with `/maxtokens 3`.

### Step 4: Verify

Send `/budget` to see the current allocation. The response will show tier, context size, total budget, and per-script tokens.

## How It Works

The script runs on every AI response and follows this flow:

1. **Scan for state**: Reads recent messages for zero-width encoded state (tier + setup flag)
2. **Check for commands**: Parses the last message for `/maxtokens` or `/budget`
3. **Calculate budget**: `context_window * 0.10 / lorebook_count`
4. **Inject output**: Appends `[CONTEXT BUDGET: ...]` to the scenario for other scripts to read
5. **Persist state**: Encodes tier and setup flag as zero-width characters via a `[PERSISTENT MEMORY]` instruction block

### Setup Mode

When `/maxtokens` is typed without arguments (or with an invalid argument), the script enters setup mode:

- The scenario text is replaced with a tier selection menu
- The personality is replaced with instructions for the AI to wait for user input
- The setup flag is set to `1` in the zero-width state
- On the next message, if the user types 1-5, the tier is set and setup mode exits

### Normal Mode

When a tier is set and setup mode is inactive:

- The budget block is appended to the existing scenario (not replacing it)
- Any notification messages (tier changes, budget info) are appended as bracketed notes
- The zero-width state stores the tier and `0` for normal mode

## Tier Reference

| Tier | Context | Total Budget (10%) | Per-Script (5 lorebooks) | Models |
|------|---------|-------------------|-------------------------|--------|
| 1 | 8,000 | 800 | 160 | JLLM, WizardLM 13B, Kunoichi 7B |
| 2 | 16,000 | 1,600 | 320 | Tiefling 12B, Psyfighter 13B |
| 3 | 32,000 | 3,200 | 640 | Mistral Small 24B, Qwen 2.5/3.5 14B/32B |
| 4 | 64,000 | 6,400 | 1,280 | GPT-OSS 20B, SmolLM3-3B |
| 5 | 128,000 | 12,800 | 2,560 | Hermes 3, DeepSeek-R1, Command R+, Llama 4 |

JanitorAI caps at 128k context, so models supporting larger contexts are grouped into Tier 5.

The model names are labels for convenience. The system only cares about which tier number the user selects.

## Token Budget Math

```
Total Budget = Context Window * 0.10
Per-Script Budget = Total Budget / Lorebook Count
```

The 10% ratio reserves 90% of context for chat history and the AI's response. This is conservative but prevents context bloat, especially on smaller models.

At Tier 1 with 5 lorebooks: `8000 * 0.10 / 5 = 160 tokens per lorebook`. This is tight. Scripts operating at this level should use minimal bullet-point entries.

At Tier 5 with 2 lorebooks: `128000 * 0.10 / 2 = 6400 tokens per lorebook`. Scripts at this level can be verbose.

### Budget Block Format

The script injects this into the scenario:

```
[CONTEXT BUDGET: tier=3 context=32000 total=3200 scripts=5 per_script=640]
```

Fields:
- `tier` - Current tier (1-5)
- `context` - Context window size in tokens
- `total` - Total lorebook budget (context * 0.10)
- `scripts` - Number of active lorebooks
- `per_script` - Token allocation per lorebook

## Command Reference

### `/maxtokens`
Shows the tier selection menu. The scenario is replaced with a numbered list of all five tiers, showing per-script budgets for each.

### `/maxtokens [1-5]`
Directly sets the tier without showing the menu.

Examples:
- `/maxtokens 1` - Set to 8k
- `/maxtokens 3` - Set to 32k
- `/maxtokens 5` - Set to 128k+

Invalid arguments (0, 6, words) trigger the menu instead.

### `/budget`
Displays current budget information without changing the tier. Shows:
- Current tier and label
- Context window size
- Total token budget
- Per-script allocation
- Number of active lorebooks

## State Schema

State is stored as 2 digits encoded in zero-width characters:

```
Digit 1: Tier (1-5)
Digit 2: Setup Flag (0 = normal, 1 = menu shown)
```

Examples:
- `30` = Tier 3, normal mode
- `51` = Tier 5, waiting for menu selection
- `10` = Tier 1, normal mode

### Zero-Width Encoding

Uses `\u2060\u2061` header and `\u2061\u2060` footer. This is distinct from:
- Faction Management Template: uses `\u200D\u200D`

Both scripts can run simultaneously without state collision.

The `[PERSISTENT MEMORY]` instruction block instructs the AI to reproduce the encoded state at the start and end of its response, preserving it across messages.

## Character Card Setup

### Required: Lorebook Count Tag

Add this to your character card scenario:

```
[Lorebook Count: 5]
```

The number should reflect all active lorebooks/scripts in the session, including the Context Control script itself.

If this tag is missing, the script defaults to `1` lorebook, giving the entire budget to itself.

### Optional: Budget Info in Scenario

You can include a note in the scenario explaining the budget system:

```
Token budgets are managed by the Context Control system. Use /maxtokens to set your context tier and /budget to check current allocation.
```

## Integration Guide for Other Scripts

Any script that wants to respect the token budget needs to:

1. Parse the `[CONTEXT BUDGET: ...]` block from the scenario
2. Extract the `per_script` value
3. Cap its output accordingly

### Parsing Pattern

```javascript
function parseBudgetBlock(scenarioText) {
    const match = scenarioText.match(
        /\[CONTEXT\s+BUDGET:\s*tier=(\d+)\s+context=(\d+)\s+total=(\d+)\s+scripts=(\d+)\s+per_script=(\d+)\]/i
    );
    if (match) {
        return {
            tier: parseInt(match[1]),
            contextSize: parseInt(match[2]),
            totalBudget: parseInt(match[3]),
            scriptCount: parseInt(match[4]),
            perScript: parseInt(match[5])
        };
    }
    return null;
}
```

### Fallback Pattern

If the budget block is not found (Context Control not installed, or first message before it runs), scripts should fall back to a conservative default:

```javascript
const budgetInfo = parseBudgetBlock(context.character.scenario);
const myBudget = budgetInfo ? budgetInfo.perScript : 160; // 160 = Tier 1 / 5 lorebooks
```

The **Context Control Awareness Template** provides a complete, working example of this integration.

## For Non-Programmers: AI-Assisted Setup

Give this prompt to an AI assistant along with your scenario details:

```
I have a Context Control Template for JanitorAI that manages token budgets
across multiple lorebooks. Help me set it up.

Number of active lorebooks/scripts: [YOUR NUMBER]
Target model: [YOUR MODEL or "I'll select from the menu"]

Please:
1. Tell me what to add to my character card scenario
2. Confirm the [Lorebook Count: N] tag is correct
3. Explain which tier I should select
```

## Safe Removal

To remove the Context Control script:

1. Delete the lorebook entry from your character card
2. Remove any `[Lorebook Count: N]` tags from the scenario
3. Other scripts that read the budget block will fall back to their default budgets

If other scripts depend on the budget block, they will continue to function but will use their hardcoded default token limits instead of dynamic allocation.

## Troubleshooting

**The menu doesn't appear when I type /maxtokens**
- Check that the script is set to always activate (no keyword filter or keyword set to `*`)
- Verify the script is not behind a keyword gate in the lorebook settings

**The tier selection doesn't persist**
- The AI must reproduce the zero-width state characters in its response. The `[PERSISTENT MEMORY]` block handles this
- If the AI consistently fails to reproduce the state, the script falls back to `DEFAULT_TIER` (Tier 1) on each run
- Ensure no other script is stripping the `[PERSISTENT MEMORY]` block

**Budget seems wrong**
- Verify `[Lorebook Count: N]` is in the scenario with the correct number
- Use `/budget` to display the current calculation
- Check that no other script is modifying the scenario before this one runs

**Other scripts aren't reading the budget**
- Confirm the `[CONTEXT BUDGET: ...]` block is being appended (use `/budget` to verify)
- Check that other scripts are using the correct regex pattern from the Integration Guide
- Ensure the Context Control script runs before other scripts that read the budget

**State collision with other zero-width scripts**
- This script uses `\u2060\u2061` header/footer, which does not conflict with the Faction Management template (`\u200D\u200D`)
- If you have custom zero-width scripts, verify they use different header/footer pairs
