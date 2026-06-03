Context Control Framework
=========================

A two-script token budget management system for JanitorAI. The **Context Control Template** lets users select their context window size via slash commands, then calculates and broadcasts per-script token allocations. The **Awareness Template** is an example script that reads those allocations and adapts its output detail level accordingly.

Solves the problem of multiple lorebooks competing for limited context space, especially on smaller models like JLLM where every token matters.

* * *

Table of Contents
-----------------

*   [What You Get](#what-you-get)
*   [Quick Start](#quick-start)
*   [Tier Reference](#tier-reference)
*   [How Context Control Works](#how-context-control-works)
*   [Command Reference](#command-reference)
*   [How Awareness Works](#how-awareness-works)
*   [Detail Levels](#detail-levels)
*   [Character Card Setup](#character-card-setup)
*   [Integration for Script Creators](#integration-for-script-creators)
*   [State and Encoding](#state-and-encoding)
*   [Troubleshooting](#troubleshooting)

* * *

What You Get
------------

**Context Control Template** (master script):

*   `/maxtokens` command with a 5-tier context window selection menu
*   `/budget` command to display current settings
*   Automatic budget division across all active lorebooks
*   Human-readable `[CONTEXT BUDGET: ...]` block injected into the scenario
*   Zero-width state persistence across messages

**Context Control Awareness Template** (example consumer):

*   Reads the budget block and adapts output detail level
*   Three detail tiers: full, summary, bullet
*   Priority-based degrading — important lore keeps detail longer
*   Serves as a copy-paste reference for making any script context-aware

* * *

Quick Start
-----------

### 1\. Install Context Control

Add `Context_Control_Template.js` as a lorebook entry. Set it to always activate (keyword `*` or no filter).

### 2\. Set Lorebook Count

Add this tag to your character card scenario:

\[Lorebook Count: 5\]

Replace `5` with the total number of active lorebooks/scripts in your session.

### 3\. Select Your Tier

Type `/maxtokens` in chat to see the menu, then respond with 1–5. Or set directly: `/maxtokens 3`.

### 4\. Install Awareness (Optional)

Add `Context_Control_Awareness_Template.js` as a second lorebook entry. It activates on its example keywords (capital, mages guild, etc.) and adapts output to your budget.

### 5\. Verify

Type `/budget` to see current allocation.

* * *

Tier Reference
--------------

Tier

Context

Total Budget (10%)

Per-Script (5 lorebooks)

Models

1

8,000

800

160

JLLM, WizardLM 13B, Kunoichi 7B

2

16,000

1,600

320

Tiefling 12B, Psyfighter 13B

3

32,000

3,200

640

Mistral Small 24B, Qwen 2.5/3.5 14B/32B

4

64,000

6,400

1,280

GPT-OSS 20B, SmolLM3-3B

5

128,000

12,800

2,560

Hermes 3, DeepSeek-R1, Command R+, Llama 4

JanitorAI caps at 128k context, so models supporting larger windows are grouped into Tier 5. The model names are labels for convenience — the system only cares about the tier number you select.

**Budget math:** `context_window * 0.10 / lorebook_count`

At Tier 1 with 5 lorebooks: 160 tokens each. At Tier 5 with 2 lorebooks: 6,400 tokens each.

* * *

How Context Control Works
-------------------------

On every AI response, the master script:

1.  Scans recent messages for zero-width encoded state (tier + setup flag)
2.  Parses the last message for `/maxtokens` or `/budget` commands
3.  Calculates: `context_window * 0.10 / lorebook_count`
4.  Injects `[CONTEXT BUDGET: tier=3 context=32000 total=3200 scripts=5 per_script=640]` into the scenario
5.  Persists tier selection via zero-width characters in a `[PERSISTENT MEMORY]` block

### Setup Mode

When you type `/maxtokens` without arguments, the scenario is temporarily replaced with a tier selection menu. The AI waits for you to respond with 1–5. Once you choose, normal mode resumes.

### Normal Mode

The budget block is appended to the existing scenario (not replacing it). Notification messages appear as bracketed notes. The zero-width state stores your tier across messages.

* * *

Command Reference
-----------------

Command

Effect

`/maxtokens`

Show tier selection menu

`/maxtokens 1`

Set to 8k

`/maxtokens 3`

Set to 32k

`/maxtokens 5`

Set to 128k+

`/budget`

Display current tier, context, budget, and per-script allocation

Invalid arguments (0, 6, words) trigger the menu instead.

* * *

How Awareness Works
-------------------

The Awareness Template is a reference script that other creators adapt for their own lorebooks. On each execution it:

1.  **Detect budget** — parse the `[CONTEXT BUDGET: ...]` block from scenario, or fall back to decoding zero-width state, or use 160 tokens as a last resort
2.  **Determine detail ceiling** — based on per-script budget, set the maximum detail level allowed
3.  **Activate lore** — match keywords from the last message against the lore database
4.  **Allocate detail** — sort by importance, grant the best detail level that fits within budget
5.  **Apply** — append personality and scenario text for each activated entry

### Budget Detection (Three Methods)

1.  **Budget block** (primary) — reads `[CONTEXT BUDGET: ...]` from scenario, exact per-script allocation
2.  **Zero-width state** (fallback) — scans messages for Context Control state, estimates from tier
3.  **Default** (last resort) — 160 tokens (Tier 1 / 5 lorebooks), most restrictive

* * *

Detail Levels
-------------

Budget

Max Detail

Typical Scenario

Entry Size

300+

Full

Tier 3+ with few lorebooks

~50-80 tokens

120–299

Summary

Tier 2 or 3 with many lorebooks

~20-40 tokens

<120

Bullet

Tier 1 with multiple lorebooks

~10-20 tokens

Each lore entry has all three versions pre-written. The system picks the best version that fits the budget, degrading lower-importance entries first.

### Per-Entry Allocation

1.  Start with the highest-importance entry
2.  Try full detail (or the global ceiling, whichever is lower)
3.  If it doesn't fit, try summary, then bullet
4.  Subtract used tokens from remaining budget
5.  Move to the next entry
6.  If budget runs out, remaining entries get bullet

* * *

Character Card Setup
--------------------

### Required: Lorebook Count Tag

Add to your scenario text:

\[Lorebook Count: 5\]

Replace `5` with the total active lorebooks/scripts in the session. If missing, defaults to `1` (entire budget goes to Context Control itself).

### Lore Database Entries

The Awareness Template's lore database uses this structure for each entry:

{
    id: 'unique\_id',
    keywords: \['trigger', 'phrases'\],
    importance: 8.5,
    full: {
        personality: ', trait text',
        scenario: ' Full context text.'
    },
    summary: {
        personality: ', shorter trait',
        scenario: ' Shorter context.'
    },
    bullet: {
        personality: ', minimal trait',
        scenario: ' Key: fact1, fact2.'
    }
}

Replace the example entries with your own content. The `importance` value (float) controls which entries keep full detail when budget is tight.

* * *

Integration for Script Creators
-------------------------------

To make your own scripts context-aware, add this parsing function:

function parseBudgetBlock(scenarioText) {
    const match = scenarioText.match(
        /\\\[CONTEXT\\s+BUDGET:\\s\*tier=(\\d+)\\s+context=(\\d+)\\s+total=(\\d+)\\s+scripts=(\\d+)\\s+per\_script=(\\d+)\\\]/i
    );
    if (match) {
        return {
            tier: parseInt(match\[1\]),
            contextSize: parseInt(match\[2\]),
            totalBudget: parseInt(match\[3\]),
            scriptCount: parseInt(match\[4\]),
            perScript: parseInt(match\[5\])
        };
    }
    return null;
}

Then cap your output:

const budgetInfo = parseBudgetBlock(context.character.scenario);
const myBudget = budgetInfo ? budgetInfo.perScript : 160;

### Three Integration Approaches

**Minimal** — just cap total output to `myBudget` tokens. Skip entries that don't fit.

**Full** — provide full/summary/bullet versions of each entry. Let the budget engine pick detail levels. This is what the Awareness Template demonstrates.

**Conditional** — branch on budget thresholds:

if (myBudget < 100) { /\* minimal \*/ }
else if (myBudget < 300) { /\* standard \*/ }
else { /\* full features \*/ }

**Do not** copy the `[PERSISTENT MEMORY]` block or write zero-width state. Read only.

* * *

State and Encoding
------------------

Context Control stores 2 digits as zero-width characters:

Digit 1: Tier (1-5)
Digit 2: Setup Flag (0 = normal, 1 = menu shown)

Header: `\u2060\u2061`  |  Footer: `\u2061\u2060`

This is distinct from the Faction Management Template (which uses `\u200D\u200D`). Both can run simultaneously without collision.

The `[PERSISTENT MEMORY]` instruction block tells the AI to reproduce the encoded state in its response, preserving the tier across messages.

* * *

Troubleshooting
---------------

**Menu doesn't appear on /maxtokens**  
Set the script to always activate (keyword `*` or no filter). Check that it's not gated behind keywords in the lorebook settings.

**Tier selection doesn't persist**  
The AI must reproduce the zero-width state. The `[PERSISTENT MEMORY]` block handles this. If the AI consistently fails, the script falls back to Tier 1 each run.

**Budget seems wrong**  
Verify `[Lorebook Count: N]` is in the scenario with the correct number. Use `/budget` to check the calculation.

**Awareness always uses bullet points**  
Check that Context Control is installed and has a tier set. Use `/budget` to verify per\_script is above 120. If not, increase your tier or reduce lorebook count.

**Awareness produces no output**  
The example lore database is placeholder content. Replace the entries with your own keywords and text.

**State collision with other scripts**  
This framework uses `\u2060\u2061` header/footer. It does not conflict with the Faction Management Template (`\u200D\u200D`).

* * *

Part of the JanitorScripts template collection. Files: Context\_Control\_Template.js, Context\_Control\_Awareness\_Template.js, and individual READMEs for each.