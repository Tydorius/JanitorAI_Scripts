# Anti-Omniscience Investigation Template

A JanitorAI Scripts template that prevents LLM omniscience in investigation and mystery scenarios through flag-gated content unlocking, explicit anti-omniscience instructions, and strict information isolation.

## Table of Contents

- [Overview](#overview)
- [The Omniscience Problem](#the-omniscience-problem)
- [How This Template Solves It](#how-this-template-solves-it)
- [Core Architecture](#core-architecture)
- [Feature Configuration](#feature-configuration)
- [Flag Definitions](#flag-definitions)
- [Content Nodes](#content-nodes)
- [Requirement Types](#requirement-types)
- [Anti-Omniscience Instruction Layer](#anti-omniscience-instruction-layer)
- [Token Management](#token-management)
- [Character Card Requirements](#character-card-requirements)
- [Example Scenario](#example-scenario)
- [Migration from TimeDelay Template](#migration-from-timedelay-template)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Comparison to Other Templates](#comparison-to-other-templates)

## Overview

This template creates a gated investigation system where information is only available to the LLM when specific discovery conditions have been met. Unlike traditional progressive disclosure systems that rely on time or message thresholds, this template requires the AI to demonstrate that a discovery has occurred by outputting a valid flag value before the next tier of content becomes available.

### Key Features

- **Flag-gated content**: Each piece of information is locked behind hex flag positions that must match before content is injected
- **Anti-omniscience instructions**: Explicit personality rules that forbid speculation beyond known facts
- **Clean content structure**: No meta-labels, no foreshadowing, no narrative hints in content
- **Key verification**: AI must output valid flag values before content unlocks (one-message verification delay)
- **Context isolation**: Only currently-active content is ever in the LLM's context
- **Token management**: Budget control prevents context overflow in long investigations
- **Anti-cheat validation**: Detects and responds to invalid flag values
- **Dynamic instructions**: Generates flag management guidance for the AI based on current state only

### When to Use This Template

- Mystery and investigation scenarios where spoilers ruin the experience
- Stories with plot twists, red herrings, or misdirection
- Scenarios where characters should not know things they haven't discovered
- Any narrative where the LLM knowing future plot points would harm the story

## The Omniscience Problem

The existing TimeDelay Script Template uses progressive disclosure but suffers from several omniscience issues:

### Meta-Labels Reveal Narrative Structure

The TimeDelay template injects content with labels like:

```
[HIDDEN CLUE: Photographer was checking security systems, not just taking pictures]
[MISDIRECTION: Her nervousness appears suspicious but is unrelated to robbery planning]
[THIS IS THE TARGET]
[RED HERRING NOW MAKES SENSE]
```

These labels tell the LLM the narrative role of each piece of information. The AI knows something is a red herring and adjusts its behavior accordingly, undermining the mystery.

### Foreshadowing in Personality Blocks

Witness personality blocks contain statements that hint at future revelations:

```
Maria has noticed unusual activity recently and is concerned.
Thomas would cooperate if questioned directly.
Sarah's behavior raises questions about her involvement in something unusual.
```

These tell the LLM that there IS something to discover, even if the details aren't revealed yet.

### Soft Thresholds Instead of Hard Gates

The TimeDelay template uses message count, hour progression, and canon count as thresholds. These are soft gates -- the LLM can see the entire script structure and knows what information exists, even if it hasn't been unlocked yet.

### Accumulating Context

The TimeDelay template injects timeline events cumulatively -- at hour 12, you receive all events from hours 0 through 12. This creates a growing body of information that the LLM can cross-reference to draw premature conclusions.

## How This Template Solves It

### 1. Flag-Gated Content Nodes

Content is organized into discrete nodes, each with explicit flag requirements:

```javascript
{
    id: 'thomas_account',
    requires: { 4: '01' },    // Thomas flag must be exactly 01
    requiresMin: {},           // No minimum requirements
    personality: '',
    scenario: ' Thomas Anderson states: "Three days ago..."'
}
```

This content is NEVER injected unless flag position 4 equals '01'. The LLM cannot access it through any other mechanism.

### 2. No Meta-Labels

Content describes observations without labeling their narrative role:

**Bad** (TimeDelay):
```
[HIDDEN CLUE: Photographer focused on security cameras and entrance]
[MISDIRECTION: Her nervousness is unrelated to robbery planning]
```

**Good** (this template):
```
Thomas Anderson states: "A man was photographing the building exterior.
He focused on the security cameras and the entrance."
```

The player must determine significance. The LLM does not tell them.

### 3. No Foreshadowing

Witness descriptions only include what they currently know and display:

**Bad** (TimeDelay):
```
Maria has noticed unusual activity recently and is concerned.
Maria would be eager to help if someone took her concerns seriously.
```

**Good** (this template):
```
Maria Rodriguez describes only what she has personally witnessed.
She is observant but does not draw conclusions beyond what she
has seen with her own eyes.
```

### 4. Hard Gates via Flag Verification

The AI must output a valid flag string to advance the investigation. The script reads this flag string from the AI's previous response and only injects content matching the current flag state. There is a one-message verification delay:

1. Player visits First National Bank
2. AI describes the visit and outputs `**FLAGS:** 00:01:00:00:00:00:00:00`
3. Next message: Script sees position 1 = '01', injects First National security details
4. AI now has the details to reference in future responses

This delay is intentional and beneficial -- the AI genuinely does not know the security details until it has "visited" the bank.

### 5. Anti-Omniscience Instruction Layer

The template injects explicit rules into the personality:

```
1. Only reference details that have been explicitly stated or provided by the script
2. Do not speculate about character motives or plot developments
3. Each character knows only what they have personally experienced
4. When information is missing, acknowledge the gap plainly
5. Do not foreshadow or prepare the player for undiscovered information
6. Do not label information as suspicious, significant, or misleading
7. Environmental descriptions reflect only what is visible and known now
```

### 6. Non-Accumulating Content

Content nodes only activate when their requirements match the CURRENT flag state. If a flag changes, previous content may or may not remain active depending on whether its requirements still match. This prevents the ever-growing body of context that plagues the TimeDelay approach.

## Core Architecture

### Two-Data-Structure Design

The template uses two separate data structures:

**Flag Definitions** -- Define valid states, descriptions, and when the AI should advance each flag. These generate the dynamic instructions the AI reads.

**Content Nodes** -- Define what information the LLM sees, gated by flag requirements. The AI never sees content nodes whose requirements aren't met.

This separation means:
- Changing flag logic doesn't affect content
- Changing content doesn't affect flag logic
- The AI only knows about flag states (via dynamic instructions), not about content

### Execution Flow

1. Script extracts flag string from AI's previous response
2. Validates flags against allowed values (anti-cheat)
3. Checks each content node against current flags
4. Activates only matching content nodes
5. Applies token management if over budget
6. Injects anti-omniscience instructions into personality
7. Injects activated content into personality and scenario
8. Generates dynamic instructions for flag management
9. AI receives modified context and generates next response

## Feature Configuration

```javascript
const FEATURES = {
    FLAG_TRACKING: true,        // Core flag-gated content system
    ANTI_OMNISCIENCE: true,     // Anti-omniscience instruction layer
    ANTI_CHEAT: true,           // Flag value validation
    DYNAMIC_INSTRUCTIONS: true, // LLM flag management guidance
    TOKEN_MANAGEMENT: true,     // Budget control
    DEBUG_MODE: false           // Debug output
};
```

### Recommended Configurations

**Full Anti-Omniscience** (recommended):
```javascript
FLAG_TRACKING: true,
ANTI_OMNISCIENCE: true,
ANTI_CHEAT: true,
DYNAMIC_INSTRUCTIONS: true,
TOKEN_MANAGEMENT: true,
DEBUG_MODE: false
```

**Lightweight** (simpler scenarios):
```javascript
FLAG_TRACKING: true,
ANTI_OMNISCIENCE: true,
ANTI_CHEAT: false,
DYNAMIC_INSTRUCTIONS: true,
TOKEN_MANAGEMENT: false,
DEBUG_MODE: false
```

**Debugging**:
```javascript
FLAG_TRACKING: true,
ANTI_OMNISCIENCE: true,
ANTI_CHEAT: true,
DYNAMIC_INSTRUCTIONS: true,
TOKEN_MANAGEMENT: true,
DEBUG_MODE: true
```

## Flag Definitions

Flag definitions define the valid states for each position and tell the AI when to advance.

```javascript
{
    position: 0,          // Array index in flag string
    states: [
        {
            hex: '00',    // Hex value for this state
            id: 'phase_initial',
            description: 'Investigation begins',
            changeInstruction: 'When player does X, advance to 01'
        },
        {
            hex: '01',
            id: 'phase_advanced',
            description: 'Investigation advancing',
            changeInstruction: 'When player does Y, advance to 05'
        }
    ]
}
```

### Writing Anti-Omniscience Change Instructions

Change instructions should describe WHAT the player must do, not WHAT will be unlocked.

**Bad**: "After interviewing Thomas, the player will learn about the suspicious photographer and realize the crew was planning a security bypass."

**Good**: "When {{user}} speaks with Thomas Anderson about his observations, set this flag to 01"

The good instruction tells the AI when to advance the flag without revealing what content will appear.

### Flag Value Spacing

Use non-sequential values to prevent guessing:

```javascript
hex: '00'  // Start
hex: '01'  // First advancement
hex: '05'  // Second (skipped 02-04)
hex: '0A'  // Third (decimal 10)
hex: 'FF'  // Final (decimal 255)
```

## Content Nodes

Content nodes define what information the LLM sees when flag requirements are met.

```javascript
{
    id: 'unique_name',
    requires: { 1: '01' },      // Position 1 must be exactly '01'
    requiresMin: { 0: '05' },   // Position 0 must be >= '05' (numeric)
    personality: ' Character trait addition',
    scenario: ' World information addition'
}
```

### Anti-Omniscience Content Rules

When writing content for this template, follow these rules:

1. **Describe observations, not conclusions.** Write "Sarah checks vault access logs repeatedly" not "Sarah appears nervous about something she's hiding."

2. **No narrative labels.** Never use markers like [HIDDEN CLUE], [MISDIRECTION], [TARGET], [RED HERRING], [KEY EVIDENCE], or [TRUE CULPRIT].

3. **No foreshadowing.** Do not include hints about future revelations. Write "Thomas describes what he saw" not "Thomas has important information he hasn't yet shared."

4. **Characters know only what they experienced.** A witness describes what they saw, not what it means for the larger investigation.

5. **No authorial commentary.** Write "The vault has a manual locking mechanism" not "The outdated vault presents a serious vulnerability."

6. **Present information neutrally.** Let the player decide what is significant, suspicious, or misleading.

### Content Node Design Patterns

**Discovery Content** (what the player learns):
```javascript
{
    id: 'location_details',
    requires: { 3: '01' },
    requiresMin: {},
    personality: '',
    scenario: ' [Location description based on direct observation]'
}
```

**Behavioral Instruction** (how a character acts):
```javascript
{
    id: 'witness_behavior',
    requires: { 5: '01' },
    requiresMin: {},
    personality: ' [Character name] responds to questions with [behavior]. '
        + 'They do not volunteer information beyond what is directly asked.',
    scenario: ''
}
```

**Evidence Connection** (requires multiple flags):
```javascript
{
    id: 'evidence_connection',
    requires: {},
    requiresMin: { 0: '05', 7: '01' },
    personality: '',
    scenario: ' [Factual evidence description]'
}
```

## Requirement Types

### requires (Exact Match)

The flag at the specified position must exactly match the given value.

```javascript
requires: { 1: '01', 4: '01' }
// Position 1 must be '01' AND position 4 must be '01'
```

Use for: Content that should only appear in a specific state (e.g., a particular witness testimony).

### requiresMin (Minimum Value)

The flag at the specified position must be numerically >= the given hex value.

```javascript
requiresMin: { 0: '05' }
// Position 0 must be >= 0x05 (decimal 5)
// Matches: 05, 0A, FF
// Does not match: 00, 01
```

Use for: Content that should persist across multiple phases (e.g., bank security details that remain relevant after the player moves to the witness interview phase).

### Combining Both

```javascript
{
    requires: { 6: '05' },      // Sarah must be cooperative
    requiresMin: { 0: '05' },   // Phase must be >= witnesses_interviewed
    personality: '...',
    scenario: '...'
}
```

### Empty Requirements

Content with no requirements activates immediately:

```javascript
{
    id: 'always_active',
    requires: {},
    requiresMin: {},
    personality: '...',
    scenario: '...'
}
```

Use sparingly -- this content is always in context.

## Anti-Omniscience Instruction Layer

When enabled, the template injects explicit rules into the character's personality that constrain the LLM's behavior:

1. Only reference explicitly stated or script-provided information
2. Do not speculate about undiscovered motives or plot developments
3. Characters know only what they have personally experienced
4. Acknowledge information gaps plainly rather than filling them
5. Do not foreshadow or hint at undiscovered information
6. Do not label information as suspicious, significant, or misleading
7. Environmental descriptions reflect only the visible and known

These instructions are always active when the ANTI_OMNISCIENCE feature is enabled. They provide the secondary defense layer that works alongside the flag-gating system.

### Why Both Layers Are Needed

Flag gating prevents the LLM from accessing locked content. But the LLM might still:

- Speculate about motives based on available clues
- Connect unrelated observations into premature conclusions
- Have characters act on information they shouldn't possess
- Hint at future plot points through environmental description

The anti-omniscience instruction layer addresses these behaviors directly.

## Token Management

When enabled, the template estimates token usage and removes lower-priority content if the budget is exceeded.

### Priority Determination

Content specificity determines priority. Nodes with more flag requirements are considered more specific and are kept when the budget is tight. Nodes with fewer requirements are removed first.

A node with `requires: { 4: '01' }` and `requiresMin: { 0: '05' }` has specificity 2.
A node with only `requires: { 1: '01' }` has specificity 1.

Higher specificity = higher priority = kept longer.

### Budget

Default budget: 1500 tokens (estimated at 4 characters per token).

Adjust by changing the `MAX_TOKENS` value in the token management section.

## Character Card Requirements

### Essential Stats

The character card must instruct the AI to maintain the flag string in every response:

```
{{char}} maintains a flag string tracking the investigation state.

**Flag Management:**
- Every response must end with: **FLAGS:** XX:XX:XX:XX:XX:XX:XX:XX
- The script provides specific conditions for when to change each flag
- Only change flags when the stated condition has genuinely occurred in the roleplay
- Preserve all unchanged flag positions exactly
```

### Status Block Format (Recommended)

```
**=== INVESTIGATION STATUS ===**
**Phase:** [Current investigation phase description]
**Discovered:** [List of discoveries made]
**Outstanding:** [What remains unknown]
**FLAGS:** XX:XX:XX:XX:XX:XX:XX:XX
```

### Anti-Omniscience Character Card Instructions

Add these to the character card's personality or scenario section:

```
**Information Boundaries:**
{{char}} presents the investigation from a limited-knowledge perspective.
Characters describe only what they have personally witnessed or been told.
Environmental descriptions reflect only what is visible and known.
When information is unavailable, {{char}} acknowledges the gap rather than inventing details.
No character possesses knowledge of events they were not present for.
```

### Example Character Card Integration

```
{{char}} is an investigation roleplay set in a city with three banks.

**Setting:**
An anonymous tip warns of an upcoming bank robbery. The player investigates
to determine which bank is the target and who is behind the plot.

**Mechanics:**
- Visit locations and interview witnesses to gather information
- Information is revealed progressively as the investigation advances
- The script system tracks discoveries through flag values
- Each response must include the flag string: **FLAGS:** XX:XX:XX:XX:XX:XX:XX:XX

**Information Boundaries:**
{{char}} presents the investigation from a limited-knowledge perspective.
Characters describe only what they have personally witnessed.
No speculation beyond established facts. No foreshadowing.
When information is unavailable, acknowledge the gap.
```

## Example Scenario

The template includes a complete bank robbery investigation demonstrating all features.

### Flag Positions

| Position | Tracks | Values |
|----------|--------|--------|
| 0 | Investigation Phase | 00 (initial), 01 (banks assessed), 05 (witnesses interviewed), 0A (connections made), FF (resolved) |
| 1 | First National Bank | 00 (unknown), 01 (visited) |
| 2 | River City Savings | 00 (unknown), 01 (visited) |
| 3 | Metro Community Bank | 00 (unknown), 01 (visited) |
| 4 | Thomas Anderson | 00 (unknown), 01 (interviewed) |
| 5 | Maria Rodriguez | 00 (unknown), 01 (interviewed) |
| 6 | Sarah Williams | 00 (unknown), 01 (interviewed), 05 (cooperative) |
| 7 | Evidence | 00 (none), 01 (outcome), 05 (financial trail), 0A (orchestrator), FF (resolved) |

### Content Flow

1. Player receives anonymous tip about three banks (Phase 00)
2. Player visits each bank; AI sets bank flags to 01; security details unlock
3. After all three banks assessed, phase advances to 01
4. Player interviews witnesses; AI sets witness flags; testimonies unlock
5. After witnesses interviewed, phase advances to 05
6. Evidence connections unlock based on combined flag state
7. Financial trail and orchestrator identity unlock progressively
8. Case resolves when all evidence gathered (Phase FF)

### Content Comparison with TimeDelay

**TimeDelay**: At hour 1, the LLM sees "First National Bank security assessment... [HIDDEN CLUE: Photographer focused on security cameras and entrance, not just taking pictures - crew was planning security bypass methods]"

**This Template**: The LLM only sees "First National Bank security assessment: State-of-the-art camera system covering all approaches..." (after the player visits). Thomas's account about the photographer is a separate content node that only appears when the player interviews him. No hidden clue labels. No narrative commentary.

## Migration from TimeDelay Template

### Step 1: Convert Timeline Events to Content Nodes

Each hour-based event becomes a content node with flag requirements instead of time thresholds:

**Before** (TimeDelay):
```javascript
if (currentHour === 5 && canonCount >= 4) {
    context.character.scenario += '[CANON]: Guard Thomas reports...';
}
```

**After** (this template):
```javascript
{
    id: 'thomas_account',
    requires: { 4: '01' },
    requiresMin: {},
    personality: '',
    scenario: ' Thomas Anderson states: "..."'
}
```

### Step 2: Remove All Meta-Labels

Strip `[CANON]`, `[HIDDEN CLUE]`, `[MISDIRECTION]`, `[TARGET]`, `[RED HERRING]`, `[WORLD EVENT]`, `[WORLD REACTION]`, and similar labels from all content.

### Step 3: Remove Foreshadowing from Personality Blocks

Remove statements like "has noticed unusual activity recently and is concerned" or "would cooperate if questioned directly." Replace with neutral behavioral instructions: "describes only what they have personally witnessed."

### Step 4: Remove the Canon Count / Hour System

Replace the `canonCount` and `currentHour` tracking with flag positions. Each discovery gets its own flag position instead of relying on a cumulative counter.

### Step 5: Add Flag Definitions

Create flag definitions that match your content nodes' requirements. Each position tracks one aspect of the investigation.

## Best Practices

### Flag Position Design

- Use one position per distinct discovery category (banks, witnesses, evidence)
- Keep the total number of positions manageable (5-12 is typical)
- Use non-sequential hex values (00, 01, 05, 0A, FF) to prevent guessing
- Phase positions should use ordered values for requiresMin to work correctly

### Content Node Design

- Keep each node focused on a single piece of information
- Use separate nodes for behavioral instructions (personality) and factual information (scenario)
- Write content from an observational perspective, not an authorial one
- Include behavioral nodes for each witness to prevent speculation
- Use requiresMin for content that should persist across phases

### Anti-Omniscience Reinforcement

- The template handles the technical gating, but the character card should reinforce the behavior
- Add information boundary instructions to the character card personality
- Use behavioral content nodes for witnesses and NPCs
- Test with leading questions to verify the LLM doesn't volunteer undiscovered information

### Testing Approach

1. Enable DEBUG_MODE to verify flag state and activated nodes
2. Test that content appears only after the appropriate flag is set
3. Test with premature flag advancement to verify anti-omniscience instructions prevent speculation
4. Test with leading player questions to verify the LLM doesn't reveal locked information
5. Test the full investigation flow to verify progressive disclosure works as intended

## Troubleshooting

### Content Not Appearing

- Verify the flag string is being output by the AI (`**FLAGS:** ...`)
- Check that the flag values match the content node's requirements exactly
- Enable DEBUG_MODE to see current flag state and activated nodes
- Verify the flag string format: `**FLAGS:** XX:XX:XX:XX:XX:XX:XX:XX`
- Remember the one-message delay: flag changes apply on the NEXT cycle

### AI Not Outputting Flag String

- Ensure DYNAMIC_INSTRUCTIONS is enabled
- Verify the character card includes flag management instructions
- Make the flag string requirement prominent in the character card personality
- Check that the AI model supports following structured output instructions

### AI Advancing Flags Too Quickly

- Make change instructions more specific about required conditions
- Add character card instructions emphasizing flags only change when conditions are genuinely met
- Use non-sequential flag values to prevent the AI from guessing the progression

### LLM Still Acting Omniscient

- Verify ANTI_OMNISCIENCE feature is enabled
- Check that content nodes don't contain foreshadowing or meta-labels
- Ensure witness behavioral nodes are present and active
- Add stronger anti-omniscience language to the character card
- Test whether the issue is from the character card rather than the script

### Anti-Cheat Triggering Incorrectly

- Verify all hex values used in content nodes are defined in flagDefinitions
- Check hex format (must be exactly two hex characters per position)
- Ensure flag string has the correct number of positions
- Review valid values in debug output

### Token Budget Issues

- Increase MAX_TOKENS if important content is being cut
- Reduce content node verbosity
- Split large content nodes into smaller ones
- Disable TOKEN_MANAGEMENT to inject all matching content (use with caution)

## Comparison to Other Templates

| Feature | This Template | TimeDelay | Persistent Flags | Adaptive |
|----------|--------------|-----------|-----------------|----------|
| **Flag-gated content** | Yes | No | Yes | No |
| **Anti-omniscience instructions** | Yes | No | No | No |
| **No meta-labels** | Yes | No (uses [CANON], [HIDDEN], etc.) | Yes | Yes |
| **No foreshadowing** | Yes | No (witnesses hint at future) | Yes | Yes |
| **Key verification** | Yes (flag output required) | No (time/message thresholds) | Yes | No |
| **Context isolation** | Yes | No (accumulates) | Partial | Yes (token-based) |
| **Token management** | Yes | Yes (3-tier) | No | Yes (3-tier) |
| **Anti-cheat** | Yes | No | Yes | No |
| **Investigation structure** | Yes | Yes | No | No |
| **Dynamic instructions** | Yes | No | Yes | No |
| **Debug mode** | Yes | Yes | Yes | No |

### When to Choose This Template

- Investigation or mystery scenarios where spoilers are harmful
- Stories with twists, red herrings, or unreliable information
- Any scenario where LLM omniscience has been a problem
- When combining flag-based state tracking with progressive narrative disclosure

### When to Choose Another Template

- **TimeDelay**: When you want time-based progression without strict anti-omniscience
- **Persistent Flags**: When you need state tracking without investigation-specific structure
- **Complex Lorebook**: When building a world with many lore entries and no specific mystery
- **Adaptive**: When token management is the primary concern and content doesn't need gating

## Version History

**v1.0 -- Initial Release**
- Flag-gated content node system
- Anti-omniscience instruction layer
- Clean content structure (no meta-labels, no foreshadowing)
- Token management with specificity-based priority
- Anti-cheat validation
- Dynamic instruction generation
- Complete bank robbery example scenario
- Feature toggle system
- Debug mode

---

Created for the JanitorAI Scripts community. Modify and distribute freely.
