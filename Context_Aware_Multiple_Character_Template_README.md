# Context Aware Multiple Character Template for JanitorAI Scripts

Drop-in/drop-out character management with adaptive detail levels. Characters activate when mentioned, and their context scales between full, limited, and summary versions based on per-category token budgets.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Configuration](#configuration)
- [Character Structure](#character-structure)
- [Budget System](#budget-system)
- [3-Version Categories](#3-version-categories)
- [Progressive Sentence Categories](#progressive-sentence-categories)
- [Instruction String](#instruction-string)
- [Included Sample Characters](#included-sample-characters)
- [Setup Instructions](#setup-instructions)
- [Adding Characters](#adding-characters)
- [Adding Custom Categories](#adding-custom-categories)
- [Relationships](#relationships)
- [Integration with Other Templates](#integration-with-other-templates)
- [Troubleshooting](#troubleshooting)

## Overview

This template combines three concepts:

1. **Character mention detection** from the Multiple Character Template. Characters activate when their name appears in recent messages.

2. **3-version adaptive detail** from the Adaptive Lorebook Template. Each character category has full, limited, and summary versions. The system selects the appropriate version based on how many characters are active and how much budget is available.

3. **Progressive sentence building** from the Progressive Sentence Lorebook Template. Sentence-level detail that adds information from most to least important within a budget.

The result is a system where mentioning a character's name drops them into the scene with as much detail as the context window allows, and mentioning multiple characters gracefully reduces detail across the board.

## How It Works

1. **Scan** recent messages for character name matches
2. **Activate** any character whose name or alias is detected
3. **Sort** activated characters by mention frequency, then importance
4. **Budget** each category independently: higher-priority characters keep full detail, lower-priority characters reduce to limited or summary
5. **Build** progressive sentences round-robin across activated characters within budget
6. **Match** relationships between activated character pairs
7. **Inject** instruction strings (one per activated character) into scenario
8. **Apply** all content to the appropriate context fields

## Configuration

All settings are in the `CONFIG` object at the top of the script.

### Categories

```javascript
CATEGORIES: {
    personality:        { budget: 800, priority: 10.0, includeInGlobal: true, limitByGlobal: true },
    appearance:         { budget: 500, priority: 8.0,  includeInGlobal: true, limitByGlobal: true },
    sampleDialog:       { budget: 800, priority: 7.0,  includeInGlobal: true, limitByGlobal: true },
    exampleCategory:    { budget: 400, priority: 5.0,  includeInGlobal: true, limitByGlobal: true },
    exampleProgressive: { budget: 400, priority: 5.0,  includeInGlobal: true, limitByGlobal: true }
}
```

Each category has four properties:

| Property | Type | Description |
|----------|------|-------------|
| `budget` | number | Per-category token budget shared across all activated characters. When the combined cost of all characters' "full" versions exceeds this, lower-priority characters are reduced to "limited" or "summary". |
| `priority` | float | Degradation order during global budget enforcement. Lower values are degraded first. Floats allow inserting new categories between existing ones (e.g., 9.5 between 10.0 and 8.0). |
| `includeInGlobal` | boolean | Whether this category's tokens count toward the `GLOBAL_BUDGET` total. |
| `limitByGlobal` | boolean | Whether this category can be degraded when `GLOBAL_BUDGET` is exceeded. A category can count toward the global total without being restricted by it. |

### Global Budget

```javascript
GLOBAL_BUDGET: 3000
```

The global budget is a ceiling on the combined token total across all categories where `includeInGlobal: true`. It runs as a second pass after per-category budgets have been applied.

**How it works:**

1. After per-category budgeting, sum tokens from all categories with `includeInGlobal: true`
2. If the total exceeds `GLOBAL_BUDGET`, collect all categories where both `includeInGlobal: true` and `limitByGlobal: true`
3. Sort those categories by `priority` ascending (lowest priority degraded first)
4. For each degradable category:
   - **3-version categories**: Downgrade the lowest-priority activated character first (full -> limited -> summary)
   - **Progressive categories**: Remove sentences from the end of the results array
5. Stop as soon as the global total is within budget

**includeInGlobal vs limitByGlobal:**

A category can have `includeInGlobal: true` and `limitByGlobal: false`. This means its tokens contribute to whether the global budget is exceeded, but the category itself will never be degraded by global enforcement. Useful for categories you always want at full detail but whose size should still factor into the overall budget pressure.

Set `GLOBAL_BUDGET: Infinity` to disable global enforcement entirely.

Budget values are approximate token counts (4 characters per token). Adjust based on your model's context window and how many characters you expect to be active simultaneously.

### Mention Scan Depth

```javascript
MENTION_SCAN_DEPTH: 2
```

Number of recent messages to scan for character name mentions. A value of 1 checks only the last message. A value of 2 checks the last two messages (typically the user's message and the AI's previous response). Higher values keep characters active longer between mentions.

### Debug Mode

```javascript
DEBUG: false
```

When enabled, appends activation information to the scenario field showing which characters activated, their detail levels per category, and progressive sentence counts.

## Character Structure

Each character in the `characters` array follows this structure:

```javascript
{
    id: 'unique_id',
    displayName: 'Display Name',
    names: ['name', 'nickname', 'alias'],
    importance: 7.0,

    personality: {
        full: '...',
        limited: '...',
        summary: '...'
    },
    appearance: {
        full: '...',
        limited: '...',
        summary: '...'
    },
    sampleDialog: {
        full: '...',
        limited: '...',
        summary: '...'
    },
    exampleCategory: {
        full: '...',
        limited: '...',
        summary: '...'
    },
    exampleProgressive: {
        sentences: [
            { text: ' Sentence text.', target: 'scenario' },
            { text: ', personality fragment', target: 'personality' }
        ]
    }
}
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. Not shown to the AI. |
| `displayName` | string | Name used in instruction strings and content headers. |
| `names` | string[] | Variants used for mention detection. Supports partial matches. |
| `importance` | float | Priority tiebreaker. Higher values keep full detail longer. Range: 0.0-10.0. |

### Category Target Mapping

Each 3-version category writes to a specific context field:

| Category | Target Field | Notes |
|----------|-------------|-------|
| `personality` | `personality` | Character traits and behavioral patterns |
| `appearance` | `personality` | Physical description (appended after personality) |
| `sampleDialog` | `example_dialogs` | Dialog examples |
| `exampleCategory` | `scenario` | Default custom category target |

To change a category's target, modify the `CATEGORY_TARGETS` object:

```javascript
const CATEGORY_TARGETS = {
    personality: 'personality',
    appearance: 'personality',
    sampleDialog: 'example_dialogs',
    exampleCategory: 'scenario',
    yourCustomCategory: 'scenario'
};
```

## Budget System

The budget system operates in two passes: per-category first, then global.

### Per-Category Budget

Each category enforces its own budget independently:

1. All activated characters start at the "full" detail level
2. Total tokens are summed for the category
3. If total exceeds budget, the lowest-priority character is reduced to "limited"
4. If still over budget, that character is further reduced to "summary"
5. Process repeats from lowest to highest priority until within budget

**Priority order**: Characters are sorted by mention count (descending), then by `importance` value (descending). The most-mentioned, highest-importance character retains full detail the longest.

**Example**: Three characters mentioned, personality budget of 800 tokens:
- Nadia (3 mentions, importance 8.0): full (400 tokens)
- Corvin (2 mentions, importance 7.0): limited (200 tokens)
- Template (1 mention, importance 7.0): summary (50 tokens)
- Total: 650 tokens (under 800 budget)

### Global Budget Enforcement

After all per-category budgets are resolved, the system checks whether the combined total of all categories with `includeInGlobal: true` exceeds `CONFIG.GLOBAL_BUDGET`.

If exceeded, categories with both `includeInGlobal: true` and `limitByGlobal: true` are sorted by their `priority` value (ascending) and degraded in order:

- **3-version categories**: Characters are further downgraded (full -> limited -> summary) starting from the least-mentioned character
- **Progressive categories**: Sentences are removed from the end of the results array

This means a character already reduced to "limited" by its category budget can be further reduced to "summary" by global enforcement.

**Priority tip**: Use fractional values like 9.5 to insert new categories between existing ones without renumbering.

## 3-Version Categories

Each 3-version category provides three levels of detail for the same information:

### Full
Complete description with all nuances and supporting details. Typically 6-8 sentences for personality, 2-3 for appearance, 4-5 for dialog examples.

### Limited
Essential information with supporting context trimmed. Typically 3-4 sentences for personality, 1-2 for appearance, 3 for dialog examples.

### Summary
Bare minimum identifiers. Typically 1 sentence with comma-separated descriptors.

### Writing Guidelines

- Full versions should be self-contained and complete
- Limited versions should preserve the character's core identity
- Summary versions should be enough for the AI to maintain basic characterization
- Each version should work independently (the AI only sees one version at a time)

## Progressive Sentence Categories

Progressive categories contain an ordered list of sentences rather than three discrete versions. Sentences are added from most to least important, distributed round-robin across activated characters within the category budget.

Each sentence specifies a `target` field:

- `'personality'` — appended to `context.character.personality`
- `'scenario'` — appended to `context.character.scenario`

```javascript
exampleProgressive: {
    sentences: [
        { text: ' Most important fact.', target: 'scenario' },
        { text: ', personality trait', target: 'personality' },
        { text: ' Second fact.', target: 'scenario' },
        { text: ' Third fact.', target: 'scenario' },
        { text: ' Minor detail.', target: 'scenario' },
        { text: ', minor trait', target: 'personality' }
    ]
}
```

### Sentence Writing Guidelines

- First 2 sentences: Essential facts that should always appear
- Middle sentences: Supporting context and relationships
- Last sentences: Flavor details and deep lore
- Each sentence should be meaningful on its own
- Personality-targeted sentences should start with a comma (they append to existing personality text)
- Scenario-targeted sentences should start with a space

## Instruction String

The `INSTRUCTION_STRING` is a template injected into the scenario once per activated character. The placeholder `CHAR_PLACEHOLDER` is replaced with the character's `displayName`.

The default instruction string covers:

- Scene presence evaluation
- Re-entry decision logic
- Travel time and off-screen activity consideration
- Emotional state continuity

To modify the instruction, edit the `INSTRUCTION_STRING` value in CONFIG. Keep the `CHAR_PLACEHOLDER` marker where the character's name should appear.

If you prefer no instruction string (you handle scene logic in the character card), set it to an empty string:

```javascript
INSTRUCTION_STRING: ""
```

## Included Sample Characters

| Character | Archetype | Key Traits |
|-----------|-----------|------------|
| **Nadia** | Pragmatic Fighter | Direct, protective, distrustful of authority |
| **Corvin** | Reclusive Scholar | Analytical, socially awkward, knowledge-obsessed |
| **Template** | Blank | Placeholder with structural guidance |

Nadia and Corvin are fully populated examples. The Template character contains placeholder text showing the expected structure and content density for each version.

## Setup Instructions

### Basic Setup

1. Copy the `Context_Aware_Multiple_Character_Template.js` file
2. Create a new Script in your JanitorAI character
3. Paste the template code
4. Replace sample characters with your own
5. Adjust budgets based on your context window size

### Character Card Integration

For best results, include instructions in your character card like:

> {{char}} should portray multiple characters as they become relevant to the scene. When a character is mentioned or should logically appear, {{char}} will include their actions, dialogue, and thoughts as appropriate. Characters should enter and exit scenes naturally based on story flow.

## Adding Characters

1. Copy the blank template character block (the third entry in the `characters` array)
2. Paste it as a new entry in the array
3. Fill in all fields:

```javascript
{
    id: 'your_character_id',
    displayName: 'Your Character',
    names: ['your character', 'nickname', 'alias'],
    importance: 7.0,

    personality: {
        full: `<BEGIN 'Your Character' PERSONALITY>
...
<END 'Your Character' PERSONALITY>`,
        limited: `<BEGIN 'Your Character' PERSONALITY>
...
<END 'Your Character' PERSONALITY>`,
        summary: `<BEGIN 'Your Character' PERSONALITY> ... <END 'Your Character' PERSONALITY>`
    },
    // ... other categories
}
```

4. Remove the template character block when done
5. Adjust `importance` values relative to other characters (higher = retains detail longer)

### Importance Guidelines

| Range | Use For |
|-------|---------|
| 9.0-10.0 | Protagonists, always-present characters |
| 7.0-8.0 | Major supporting characters |
| 5.0-6.0 | Recurring characters |
| 3.0-4.0 | Minor characters, background roles |
| 0.0-2.0 | Crowd characters, one-time appearances |

## Adding Custom Categories

### 3-Version Custom Category

1. Add a new key to each character object:

```javascript
background: {
    full: `<BEGIN 'Nadia' BACKGROUND>Detailed background...<END 'Nadia' BACKGROUND>`,
    limited: `<BEGIN 'Nadia' BACKGROUND>Shorter background...<END 'Nadia' BACKGROUND>`,
    summary: `<BEGIN 'Nadia' BACKGROUND> Brief background. <END 'Nadia' BACKGROUND>`
}
```

2. Add the key to the `THREE_VERSION_CATEGORIES` array:

```javascript
const THREE_VERSION_CATEGORIES = [
    'personality',
    'appearance',
    'sampleDialog',
    'exampleCategory',
    'background'
];
```

3. Add the key to `CATEGORY_TARGETS`:

```javascript
const CATEGORY_TARGETS = {
    // ...existing entries
    background: 'scenario'
};
```

4. Add the category to `CONFIG.CATEGORIES` with all four properties:

```javascript
CATEGORIES: {
    // ...existing entries
    background: { budget: 400, priority: 6.0, includeInGlobal: true, limitByGlobal: true }
}
```

5. (Optional) If you want the category to participate in global budget tracking but never be degraded by it, set `limitByGlobal: false`:

```javascript
background: { budget: 400, priority: 6.0, includeInGlobal: true, limitByGlobal: false }
```

### Progressive Sentence Custom Category

1. Add a new key to each character object:

```javascript
fightingStyle: {
    sentences: [
        { text: ' Most important combat fact.', target: 'scenario' },
        { text: ' Second combat fact.', target: 'scenario' },
        { text: ', combat-related personality note', target: 'personality' }
    ]
}
```

2. Add a budget in `CONFIG.CATEGORIES`:

```javascript
CATEGORIES: {
    // ...existing entries
    fightingStyle: { budget: 300, priority: 4.0, includeInGlobal: true, limitByGlobal: true }
}
```

3. Add the key to the `PROGRESSIVE_CATEGORIES` array:

```javascript
const PROGRESSIVE_CATEGORIES = ['exampleProgressive', 'fightingStyle'];
```

4. The progressive sentence builder is called automatically for all entries in `PROGRESSIVE_CATEGORIES`. No manual build call is needed.

5. Progressive results are applied to output automatically. No manual output assembly is needed.

## Relationships

The `relationships` array stores pairwise relationship descriptions between characters. A relationship only activates when **both** characters in the pair are mentioned during the scan depth. Relationships are not bidirectional — you only need one entry per pair.

### Structure

```javascript
const relationships = [
    {
        characters: ['nadia', 'corvin'],
        text: ', Nadia trusts Corvin despite his reclusive nature'
    },
    {
        characters: ['nadia', 'template'],
        text: ", Nadia is cautiously curious about Template"
    }
];
```

### Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `characters` | string[] | Two character `id` values. Order does not matter. Must match `id` fields in the `characters` array. |
| `text` | string | Relationship description appended to personality. Should start with a comma (it appends to existing personality text). |

### Activation Rules

- Both characters in a pair must be detected during the mention scan for the relationship to activate
- Relationships activate independently of budget — they are appended after all category budgeting
- Output is wrapped in `<ACTIVE RELATIONSHIPS>...<END ACTIVE RELATIONSHIPS>` tags

### Pair Count

With N characters, you need `N * (N-1) / 2` entries for full pairwise coverage:

| Characters | Pairs |
|-----------|-------|
| 3 | 3 |
| 5 | 10 |
| 8 | 28 |
| 10 | 45 |

You do not need an entry for every possible pair. Only define relationships that are narratively important. Missing pairs simply produce no output when co-activated.

### Writing Guidelines

- Text should start with a comma (appending to personality)
- Describe the dynamic from both sides in one sentence
- Keep entries concise — this text always activates at full detail with no degradation
- Focus on dynamics the AI needs to portray accurately when both characters are in a scene

## Integration with Other Templates

### With Persistent Memory Flags

Use flag tracking alongside this template to remember which characters have been introduced, relationships established, or story beats completed.

### With Hidden Persistent Memory

The hidden persistent memory template can track character emotional states, inventory, and locations. The instruction string in this template already prompts the AI to evaluate emotional state continuity.

### With Complex Lorebook

Combine with the complex lorebook template to add world lore that activates alongside characters. Character-specific lore entries can cascade into world-building entries through the trigger system.

### With TimeDelay Script

Use time-based progression alongside character management to control when characters become available or when their circumstances change.

## Troubleshooting

### Characters Not Activating

- Verify character names appear in the `names` array exactly as used in chat
- Check `MENTION_SCAN_DEPTH` is sufficient (increase from 1 to 2 or 3)
- Ensure names are not substring matches of common words (use specific names)
- Enable `DEBUG: true` to see activation output

### Too Much Context Used

- Reduce budget values in `CONFIG.CATEGORIES`
- Write shorter "full" versions for each category
- Reduce `MENTION_SCAN_DEPTH` to limit activation window
- Lower `CONFIG.GLOBAL_BUDGET` to force stricter overall limits

### Characters Getting Summary When They Should Be Full

- Increase the relevant category budget
- Raise the character's `importance` value
- Reduce other characters' importance values
- Ensure fewer characters are active simultaneously

### Progressive Sentences Not Appearing

- Check that the character has an `exampleProgressive` section with sentences
- Verify the `exampleProgressive` budget is sufficient
- Confirm sentences have valid `target` fields ('personality' or 'scenario')

### Custom Categories Not Working

- Ensure the category key is in `THREE_VERSION_CATEGORIES` for 3-version categories
- Ensure the category key is in `CATEGORY_TARGETS` with a valid target field
- Ensure the category has an entry in `CONFIG.CATEGORIES` with budget, priority, includeInGlobal, and limitByGlobal
- Check for typos between the character object key and the category configuration

### Relationships Not Appearing

- Verify both characters in the pair are being activated (check debug output)
- Ensure the `characters` array contains valid `id` values matching the character database exactly
- Remember both characters must be mentioned within the scan depth window
- Check that the relationship entry exists in the `relationships` array

### Syntax Errors After Editing

- Verify all commas between object properties and array items
- Check that template literals use backticks, not quotes
- Ensure no unmatched braces or brackets
- Test one change at a time to isolate the error
