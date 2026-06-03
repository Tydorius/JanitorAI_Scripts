# Context Control Awareness Template

A companion script for the Context Control Template that demonstrates how any lorebook can read the injected token budget and adapt its output to stay within the per-script allocation.

This is not a standalone lorebook. It is a template and reference implementation showing the exact patterns needed to make any script context-aware.

## Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Budget Detection](#budget-detection)
- [Detail Level Selection](#detail-level-selection)
- [Integration Patterns](#integration-patterns)
- [Lore Database Structure](#lore-database-structure)
- [Adding to Existing Scripts](#adding-to-existing-scripts)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Overview

This template demonstrates:

- **Budget Detection**: Two-method approach to finding the per-script token allocation
- **Detail Level Adaptation**: Three detail tiers (full, summary, bullet) that scale based on available tokens
- **Priority-Based Degrading**: Higher-importance entries keep full detail longer when budget is tight
- **Conservative Fallbacks**: Default budget of 160 tokens when Context Control is not detected

It serves as both a working example and a copy-paste reference for adding context awareness to any existing script.

## Quick Start

### Step 1: Install Context Control

The Awareness template requires the Context Control Template to be running in the same session. Install it first.

### Step 2: Install This Template

Add `Context_Control_Awareness_Template.js` as a lorebook entry. It activates based on keywords from its lore database.

### Step 3: Set Up Context Control

Use `/maxtokens` in chat to select your context tier. The Context Control script will inject the budget into the scenario.

### Step 4: Test

Type a message containing one of the example keywords (e.g., "capital", "mages guild", "duke ashford"). The awareness script will activate and select the appropriate detail level based on your budget.

## How It Works

The script follows this flow on every execution:

1. **Detect budget**: Parse `[CONTEXT BUDGET: ...]` from scenario, or fall back to zero-width state
2. **Determine detail ceiling**: Based on budget, set the maximum detail level allowed
3. **Activate lore**: Match keywords from the last message against the lore database
4. **Budget allocation**: Starting with the highest-importance entry, grant the best detail level that fits
5. **Apply**: Append personality and scenario text for each activated entry

### Execution Diagram

```
Last Message
    |
    v
Parse Budget Block from Scenario -------> Fallback: Decode ZW State
    |                                           |
    v                                           v
per_script = N tokens                      Estimate from tier
    |                                           |
    +------------------+------------------------+
                       |
                       v
            Determine max detail level
                       |
                       v
            Activate matching lore entries
                       |
                       v
            Sort by importance (desc)
                       |
                       v
            Allocate detail levels within budget
                       |
                       v
            Append to personality + scenario
```

## Budget Detection

The script uses a two-method approach to find the per-script token budget.

### Method 1: Budget Block (Primary)

Reads the `[CONTEXT BUDGET: ...]` block injected by the Context Control Template:

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

This is the preferred method because it provides the exact per-script allocation calculated by Context Control, accounting for the actual lorebook count.

### Method 2: Zero-Width State (Fallback)

If the budget block is not found in the scenario (e.g., Context Control hasn't run yet this message), the script scans recent messages for the Context Control zero-width state and estimates the budget from the tier alone:

```javascript
// Decoded state gives us the tier
const tierContexts = { 1: 8000, 2: 16000, 3: 32000, 4: 64000, 5: 128000 };
perScriptBudget = Math.floor(tierContexts[tier] * 0.10 / 1);
```

This fallback assumes only 1 lorebook (no division), which is conservative. In practice, the budget block should be present on every normal-mode execution.

### Method 3: Default (Last Resort)

If neither method finds a budget, the script uses `DEFAULT_BUDGET = 160` tokens, which corresponds to Tier 1 with 5 lorebooks. This is the most restrictive setting, ensuring the script never produces excessive output.

## Detail Level Selection

The script defines two thresholds:

```javascript
const FULL_THRESHOLD = 300;    // Need 300+ tokens for full detail
const SUMMARY_THRESHOLD = 120; // Need 120+ tokens for summary detail
```

| Budget | Max Detail Level | Typical Scenario |
|--------|-----------------|------------------|
| 300+ | Full | Tier 3+ with few lorebooks |
| 120-299 | Summary | Tier 2 or Tier 3 with many lorebooks |
| <120 | Bullet | Tier 1 with multiple lorebooks |

### Per-Entry Allocation

Within a single execution, the script sorts activated entries by importance and allocates detail levels greedily:

1. Start with the highest-importance entry
2. Try to grant `full` detail (or the global ceiling, whichever is lower)
3. If it doesn't fit, try `summary`, then `bullet`
4. Subtract used tokens from remaining budget
5. Move to the next entry
6. If budget runs out, force remaining entries to `bullet`

This ensures the most important lore gets the most detail, while less important entries degrade gracefully.

## Integration Patterns

### Minimal Integration (Add to Any Script)

To add context awareness to an existing script, copy these sections from this template:

**Section 2**: Zero-width decoding constants and function

**Section 4**: Budget detection logic (both methods)

Then add at your output point:

```javascript
const budgetInfo = parseBudgetBlock(context.character.scenario);
const myBudget = budgetInfo ? budgetInfo.perScript : 160;
let usedTokens = 0;

yourEntries.forEach(entry => {
    const entryTokens = estimateTokens(entry.content);
    if (usedTokens + entryTokens <= myBudget) {
        context.character.scenario += entry.content;
        usedTokens += entryTokens;
    }
});
```

### Full Integration (Three Detail Levels)

Copy the complete Section 5-7 pattern:

1. Define your lore database with `full`, `summary`, and `bullet` versions
2. Activate entries by keyword matching
3. Sort by importance
4. Allocate detail levels within budget

This gives you the most control and produces the best results across all tier levels.

### Selective Integration (Conditional Output)

For scripts that don't need multiple detail levels but should respect the budget:

```javascript
const budgetInfo = parseBudgetBlock(context.character.scenario);
const myBudget = budgetInfo ? budgetInfo.perScript : 160;

if (myBudget < 100) {
    // Minimal output only
} else if (myBudget < 300) {
    // Standard output
} else {
    // Full output with all features
}
```

## Lore Database Structure

Each entry in the lore database follows this structure:

```javascript
{
    id: 'unique_identifier',           // For debugging
    keywords: ['trigger', 'phrases'],  // Case-insensitive matching
    importance: 8.5,                   // Float for priority sorting
    full: {                            // For budgets >= 300 tokens
        personality: ', trait text',
        scenario: ' World context text.'
    },
    summary: {                         // For budgets >= 120 tokens
        personality: ', shorter trait',
        scenario: ' Shorter context.'
    },
    bullet: {                          // For budgets < 120 tokens
        personality: ', minimal trait',
        scenario: ' Key: fact1, fact2, fact3.'
    }
}
```

### Writing Good Detail Levels

**Full** (~50-80 tokens per entry): Complete descriptions with history, relationships, and nuance. Use when the model has plenty of context.

**Summary** (~20-40 tokens per entry): Core facts with one or two key details. Stripped of flavor text but maintains accuracy.

**Bullet** (~10-20 tokens per entry): Essential identifiers only. Name, role, one key attribute. Just enough for the AI to recognize the reference.

## Adding to Existing Scripts

### Step-by-Step for Script Creators

1. Copy the `parseBudgetBlock()` function from Section 4
2. Call it at the start of your script: `const budget = parseBudgetBlock(context.character.scenario);`
3. Use `budget.perScript` (or a fallback value) to cap your output
4. Add the zero-width fallback if you want redundancy
5. Provide multiple detail levels for your content (recommended)
6. Test at each tier to verify output fits

### What Not to Copy

- Do not copy the `CC_HEADER`, `CC_FOOTER`, or encoding functions unless you are also reading zero-width state
- Do not copy the `[PERSISTENT MEMORY]` block generation; that belongs only to the Context Control script
- Do not write your own zero-width state; read only

## Configuration

### Thresholds

Adjust these if your entries are larger or smaller than the examples:

```javascript
const FULL_THRESHOLD = 300;    // Per-entry budget needed for full detail
const SUMMARY_THRESHOLD = 120; // Per-entry budget needed for summary detail
```

### Fallback Budget

```javascript
const DEFAULT_BUDGET = 160;    // Conservative default
```

This should match the worst-case scenario for your typical user. 160 tokens is Tier 1 with 5 lorebooks.

### Search Depth

```javascript
const SEARCH_DEPTH = 20;       // Messages to scan for zero-width state
```

Increase this if the Context Control state is older than 20 messages and getting lost.

## Troubleshooting

**Script always uses bullet points**
- Check that Context Control is installed and has a tier set
- Use `/budget` to verify the per-script allocation
- If `per_script` is below 120, the script correctly uses bullets
- Increase your tier or reduce your lorebook count

**Script produces no output**
- The lore database entries are examples; replace them with your own content
- Check that keywords in the database match what appears in the chat
- Verify the script is activating (check lorebook keyword settings)

**Budget detection returns null**
- Ensure Context Control ran before this script in the execution order
- Verify the `[CONTEXT BUDGET: ...]` block appears in the scenario
- The fallback should still provide a working budget from zero-width state

**Zero-width fallback doesn't work**
- Check that the AI is reproducing the `[PERSISTENT MEMORY]` block in responses
- Increase `SEARCH_DEPTH` if the state is more than 20 messages old
- Verify no other script is interfering with the state characters
