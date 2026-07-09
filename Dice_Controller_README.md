# Dice Controller

A JanitorAI Script that intercepts `/roll` commands from the player and roll requests from the LLM, executes exact dice math, and injects formatted results into the scenario for the LLM to narrate. Supports standard polyhedral dice, exploding dice (Savage Worlds Aces), modifiers, and Wild Die mechanics. Includes a toggleable visible mode for models that struggle with zero-width encoding.

## Overview

This template includes:

- **Player `/roll` Commands**: Players type `/roll 2d6`, `/roll 1d8!+2 -w`, etc. and get mathematically accurate results
- **LLM Roll Requests**: The LLM can request dice rolls in its responses using either zero-width encoded strings or visible `[ROLL:...]` tags (depending on mode); the system detects and executes them on the next turn
- **Visible Mode**: Toggle between invisible zero-width encoding and visible `[ROLL:...]` format via `/roll set_visible` and `/roll set_hidden` — for models that cannot reliably reproduce zero-width characters
- **Savage Worlds Support**: Exploding dice (Aces), Wild Die (d6, take highest with Trait Die), Raises, and Critical Failure detection
- **Standard Dice Support**: Any combination of d2, d4, d6, d8, d10, d12, d20, d100 with positive/negative modifiers
- **Always-On LLM Instructions**: A `[DICE SYSTEM]` instruction block is injected every turn so the LLM always knows how to handle dice, even when no rolls occurred
- **State Persistence**: Visibility mode preference is persisted across turns via zero-width characters

## Quick Start

### Step 1: Add the Script

Copy `Dice_Controller.js` into a lorebook entry on your character card. No customization is required for basic usage.

### Step 2: Player Uses `/roll`

Players can roll dice at any time during roleplay:

```
/roll 1d20
/roll 2d6+3
/roll 1d8! -w
```

The script detects the command, executes the roll with actual random number generation, and injects the results into the scenario. The LLM then narrates the outcome.

### Step 3 (Optional): Character Card Instructions

For best results, add to your character card scenario or personality:

```
{{char}} uses the dice system for action resolution. When [SYSTEM: DICE RESOLUTION] appears, the numbers are authoritative — do not substitute your own random values. Narrate outcomes based on the provided results.
```

## How It Works

### User Command Processing

The script scans `context.chat.last_message` for `/roll` commands using a regex that matches:

```
/roll <count>d<faces>[!][+/-<mod>] [-w]
```

| Component | Syntax | Example |
|-----------|--------|---------|
| Count | Number of dice | `2` in `2d6` |
| Faces | Die type | `6` in `2d6` |
| Explode | `!` after faces | `1d8!` |
| Modifier | `+N` or `-N` | `+2` or `-3` |
| Wild Die | `-w` flag | `-w` |

Multiple `/roll` commands in a single message are all processed.

### Visibility Mode

The script supports two modes for LLM roll requests:

| Mode | LLM Format | Toggle Command |
|------|-----------|----------------|
| Hidden (default) | Zero-width encoded characters | `/roll set_hidden` |
| Visible | `[ROLL: 20-digit-string]` | `/roll set_visible` |

The visibility mode is persisted via zero-width state (header `\u2060\u2061\u2062`), so the setting survives across turns.

**When to use visible mode**: Some LLMs cannot reliably reproduce zero-width Unicode characters. If the LLM's roll requests are never being detected, switch to visible mode. The `[ROLL:...]` tags are visible in the chat but are stripped from the final output by the script.

### LLM Roll Request Protocol

The LLM can request dice rolls by embedding a 20-digit encoded string in its response. The encoding is the same regardless of visibility mode — only the wrapping format changes.

The 20-digit string maps to:

| Slot | Positions | Field | Values |
|------|-----------|-------|--------|
| 01 | 0-1 | d2 count | 00-99 |
| 02 | 2-3 | d4 count | 00-99 |
| 03 | 4-5 | d6 count | 00-99 |
| 04 | 6-7 | d8 count | 00-99 |
| 05 | 8-9 | d10 count | 00-99 |
| 06 | 10-11 | d12 count | 00-99 |
| 07 | 12-13 | d20 count | 00-99 |
| 08 | 14-15 | d100 count | 00-99 |
| 09 | 16-17 | Modifier | Encoded as value + 50 (50 = +0, 52 = +2, 48 = -2) |
| 10 | 18 | Explode flag | 0 = no, 1 = yes |
| 10 | 19 | Wild Die flag | 0 = no, 1 = yes |

**Example**: To roll 2d6 with no modifier, Aces on, and Wild Die on: `00000200000000005011`

In hidden mode, the LLM encodes this with zero-width characters wrapped in `\u200B\u200C\u200D` ... `\u200D\u200C\u200B`. In visible mode, the LLM wraps it as `[ROLL: 00000200000000005011]`.

The script scans the LLM's previous message (second-to-last in the message array) for both formats and processes them through a shared `processPayload()` function.

### Result Injection

When rolls occur, the script appends a `[SYSTEM: DICE RESOLUTION]` block to the scenario containing:

- Individual die results with Ace chains shown as `[8, Aced! -> 3]`
- Wild Die results (when applicable)
- Final totals with modifiers
- Mapping instructions telling the LLM how to narrate the results

### Always-On Instruction Block

Every turn, the script injects a `[DICE SYSTEM]` block that teaches the LLM:

- The `/roll` command syntax so it can explain it to players
- The full 20-digit encoding table with slot-by-slot breakdown
- How to encode roll requests (zero-width or visible, depending on mode)
- The zero-width character mapping table (in hidden mode)
- Savage Worlds rules (Wild Die, Aces, Raises, Critical Failures)
- That `[SYSTEM: DICE RESOLUTION]` results are authoritative and must not be overridden

The encoding instructions adapt based on visibility mode: hidden mode includes the full ZW character mapping, while visible mode shows the `[ROLL:...]` tag format.

## Savage Worlds Mode

When a Wild Die (`-w`) or exploding dice (`!`) are used, the script operates in Savage Worlds mode:

**Trait Die + Wild Die**: Roll both the requested die and a d6 Wild Die. The higher of the two is used as the base result.

**Exploding (Acing)**: When a die rolls its maximum face value, roll it again and add the result. Continue until a non-maximum value is rolled.

**Target Number**: Standard TN is 4. Every 4 points above the TN is a Raise (e.g., a result of 12 vs TN 4 gives 2 Raises).

**Critical Failure**: If both the Trait Die and Wild Die roll a natural 1, it is a Critical Failure. The script does not detect this automatically (it reports the raw 1), but the LLM instruction block tells the LLM to check for this condition.

## Output Format Example

When a user types `/roll 1d8!+2 -w`:

```
[SYSTEM: DICE RESOLUTION]
USER ROLLS (Chronological):
- User Roll 1 (/roll 1d8!+2 -w):
  > Trait Die (d8!): [8, Aced! -> 5] = 13
  > Wild Die (d6!): [3] = 3
  > Result: 13 (Highest) +2 (Mod) = 15.

[SYSTEM: Map LLM Rolls to your previous actions in order. Map User Rolls to the user's intended actions. Evaluate successes and raises based on the active ruleset. Narrate the outcome.]
```

## Character Card Integration

### Minimal Setup

No character card changes are strictly required. The script's always-on instruction block teaches the LLM everything it needs.

### Recommended Additions

For scenarios where dice are central to gameplay, add to the character card:

```
{{char}} resolves actions using the dice system. When the player describes an action with uncertain outcome, {{char}} should:
1. Determine the appropriate die type based on the character's skill level
2. Consider modifiers based on circumstances
3. Wait for the player to /roll, or request a roll via the encoding protocol
4. Narrate the outcome based on the authoritative dice results

Die types by skill level:
- Untrained: d4
- Novice: d6
- Competent: d8
- Expert: d10
- Master: d12
```

### Using With Other Scripts

The Dice Controller uses zero-width state persistence for visibility mode only (header `\u2060\u2061\u2062`). This header is distinct from other templates in this repository and will not conflict.

To manage token budget when combining with other scripts, use the Context Control Template and include the Dice Controller in the lorebook count:

```
[Lorebook Count: 4]
```

## Command Reference

| Command | Description |
|---------|-------------|
| `/roll NdX` | Roll N dice with X faces |
| `/roll NdX!` | Exploding dice (reroll on max) |
| `/roll NdX+N` | Roll with positive modifier |
| `/roll NdX-N` | Roll with negative modifier |
| `/roll NdX -w` | Include Savage Worlds Wild Die |
| `/roll set_visible` | Switch LLM requests to visible `[ROLL:...]` format |
| `/roll set_hidden` | Switch LLM requests to zero-width format (default) |

## Limitations

- **Modifier range**: LLM-encoded requests support modifiers from -50 to +49 (user commands have no practical limit)
- **No dice pool limits**: User commands accept any count value; extremely large counts (e.g., `100d6`) will produce verbose output
- **LLM message detection**: The script assumes the second-to-last message in the array is the LLM's response. This follows JanitorAI's standard message ordering but may behave unexpectedly with custom API configurations

## Customization

### Removing Savage Worlds Features

If your scenario uses standard dice without Savage Worlds rules, you can simplify the LLM instruction block by editing the `DICE_INSTRUCTIONS` constant. Remove the Savage Worlds Mechanics section and the `-w` references.

### Changing the Target Number

The default Target Number of 4 is referenced in the output instructions. To change it, edit the TN references in the `DICE_INSTRUCTIONS` constant and the final `[SYSTEM: Map LLM Rolls...]` line.

### Adding Dice Types

The zero-width encoding reserves 16 digits for 8 die types (2 digits each). To add custom dice:

1. Add an entry to the `diceCounts` array in the `processPayload()` function
2. Adjust the encoding positions if needed
3. Update the `DICE_INSTRUCTIONS` to document the new die type

## Troubleshooting

**Rolls not appearing**: Verify the `/roll` command is in the player's message (not the LLM's). The script only scans `context.chat.last_message` for user commands.

**LLM ignores dice results**: The always-on instruction block should prevent this. If the LLM still invents its own numbers, add stronger language to the character card personality: "NEVER generate your own dice results. Only use numbers from [SYSTEM: DICE RESOLUTION]."

**LLM roll requests not detected (hidden mode)**: If the LLM cannot reliably reproduce zero-width characters, the encoded requests will not be found. Switch to visible mode with `/roll set_visible` — the LLM will use `[ROLL: 20-digit-string]` tags instead, which are easier for weaker models.

**Token cost too high**: The `DICE_INSTRUCTIONS` block adds to the scenario every turn. If this is too expensive for your context window, trim the instructions to the essentials. The encoding table and Savage Worlds mechanics are the largest sections and can be shortened if not needed.
