# Progressive Sentence Lorebook Template

A token-aware lorebook system for JanitorAI Scripts that builds context sentence-by-sentence based on priority tiers, with configurable message history scope per subject.

## Table of Contents
- [Overview](#overview)
- [Key Differences from Adaptive Template](#key-differences-from-adaptive-template)
- [How It Works](#how-it-works)
- [Priority Tier System](#priority-tier-system)
- [Dynamic Tier System](#dynamic-tier-system)
- [History Scope System](#history-scope-system)
- [Budget Allocation](#budget-allocation)
- [Subject Structure](#subject-structure)
- [Configuration Options](#configuration-options)
- [Setup Instructions](#setup-instructions)
- [Writing Effective Sentences](#writing-effective-sentences)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

This template provides granular control over lore injection by treating each subject as an array of prioritized sentences rather than switching between full/summary/bullet versions. The system builds output incrementally using round-robin allocation within priority tiers.

## Key Differences from Adaptive Template

| Feature | Adaptive Template | Progressive Template |
|---------|------------------|---------------------|
| Content structure | 3 versions (full/summary/bullet) | Array of 6-12 sentences |
| Selection method | Switch entire version | Add sentences one-by-one |
| Multi-subject balance | Top entries get full, others compressed | Round-robin ensures all subjects get coverage |
| History awareness | Current message only | Configurable per subject |
| Budget allocation | Global reduction passes | Tier-based with current/historical split |

**When to use Progressive:**
- You want fine-grained control over which details appear
- Multiple subjects should get balanced coverage
- Some topics should persist across message turns
- You need different history behaviors for different subjects

**When to use Adaptive:**
- You prefer simpler full/summary/bullet approach
- Single dominant topic per message is common
- All subjects use same history scope
- Faster to set up for simple scenarios

## How It Works

1. **Detection**: Keywords in messages activate subjects
2. **Scope Resolution**: Each subject checks its configured history scope
3. **Mention Counting**: Count mentions in the appropriate message context
4. **Tier Assignment**: Subjects sorted into HIGH/MEDIUM/LOW tiers by mention count
5. **Pool Splitting**: Each tier split into current vs historical pools
6. **Budget Calculation**: Token budgets calculated per tier per pool
7. **Round-Robin Building**: Sentences added one-by-one across subjects in each pool
8. **Application**: Built sentences added to character context

## Priority Tier System

Subjects are assigned to tiers based on mention count:

**HIGH Tier** (default: 3+ mentions)
- Receives 60% of token budget
- Most detailed coverage
- First sentences from each subject guaranteed

**MEDIUM Tier** (default: 2 mentions)
- Receives 25% of token budget
- Moderate coverage
- Key details included

**LOW Tier** (default: 1 mention)
- Receives 15% of token budget
- Essential facts only
- May only get first 1-2 sentences per subject

### Tier Threshold Configuration

```javascript
const CONFIG = {
    HIGH_THRESHOLD: 3,    // 3+ mentions = high tier
    MEDIUM_THRESHOLD: 2,  // 2 mentions = medium tier
    // 1 mention = low tier (implicit)
};
```

## Dynamic Tier System

The dynamic tier system optimizes budget usage when tiers are underfilled. It provides two mechanisms:

### Budget Redistribution

When `DYNAMIC_BUDGETS: true`, unused budget from higher tiers flows to lower tiers.

**Example Scenario:**
- HIGH tier budget: 900 tokens
- HIGH tier subjects only need: 200 tokens
- Unused: 700 tokens redistributed to MEDIUM/LOW

**Redistribution Modes:**

| Mode | Behavior |
|------|----------|
| `cascade` | HIGH unused → MEDIUM, then MEDIUM unused → LOW |
| `proportional` | Unused split based on remaining tiers' needs |
| `low_priority` | All unused goes directly to LOW tier |

```javascript
// Cascade mode (default)
// 700 unused from HIGH goes to MEDIUM
// If MEDIUM still has 400 unused after that, it goes to LOW

// Proportional mode
// If MEDIUM needs 300 more and LOW needs 600 more
// MEDIUM gets 233 (300/900 * 700), LOW gets 467 (600/900 * 700)

// Low priority mode
// All 700 goes straight to LOW tier
```

### Subject Promotion

When `PROMOTION_ENABLED: true`, subjects can be promoted to higher tiers if those tiers are empty.

**How it works:**
1. If HIGH tier is empty, promote top subject from MEDIUM (if importance >= threshold)
2. If MEDIUM tier is empty (after promotion), promote top subject from LOW
3. Only subjects meeting `PROMOTION_MIN_IMPORTANCE` are eligible

**Example:**
- User mentions only "the Duke" once (normally LOW tier)
- HIGH and MEDIUM tiers are empty
- Duke has importance 9.0 (>= threshold of 5.0)
- Duke gets promoted to HIGH tier → receives 60% budget instead of 15%

### Configuration

```javascript
const CONFIG = {
    // Enable/disable dynamic features
    DYNAMIC_BUDGETS: true,
    PROMOTION_ENABLED: true,

    // Minimum importance to be promotion-eligible
    PROMOTION_MIN_IMPORTANCE: 5.0,

    // Redistribution strategy
    REDISTRIBUTION_MODE: 'cascade',  // 'cascade', 'proportional', or 'low_priority'
};
```

### When to Use Each Mode

**Cascade (default):**
- Balanced approach
- Good for most scenarios
- Higher tiers get first chance at extra budget

**Proportional:**
- Fair distribution based on need
- Best when all tiers matter equally
- Prevents any tier from being starved

**Low Priority:**
- Maximizes coverage of low-mention subjects
- Good for broad exploration scenarios
- Ensures minor subjects get adequate detail

### Disabling Dynamic Features

Set both to `false` for static tier behavior:

```javascript
DYNAMIC_BUDGETS: false,
PROMOTION_ENABLED: false,
```

This gives predictable, fixed budget allocation regardless of what activates.

## History Scope System

Each subject can specify which messages to consider for keyword detection:

### CURRENT_USER_ONLY
Only looks at the user's most recent message.

**Use for:**
- Historical events (only relevant when directly asked)
- Minor characters
- Specific mechanics or rules
- Topics that shouldn't "linger"

```javascript
historyScope: HISTORY_SCOPE.CURRENT_USER_ONLY
```

### CURRENT_EXCHANGE
Looks at both the user's message and the AI's last response.

**Use for:**
- Active NPCs in a scene
- Current location details
- Ongoing conversations
- Topics that should persist through a turn

```javascript
historyScope: HISTORY_SCOPE.CURRENT_EXCHANGE
```

### HISTORICAL
Looks back N messages (configurable).

**Use for:**
- Major factions the player has engaged with
- Ongoing plot threads
- Persistent threats or relationships
- Topics that should remain in context

```javascript
historyScope: HISTORY_SCOPE.HISTORICAL
// Controlled by CONFIG.HISTORY_MESSAGE_COUNT
```

## Budget Allocation

### Tier Budgets
Total budget is split by configurable ratios:

```javascript
TOTAL_BUDGET: 1500,
HIGH_RATIO: 0.60,    // 900 tokens for high tier
MEDIUM_RATIO: 0.25,  // 375 tokens for medium tier
LOW_RATIO: 0.15,     // 225 tokens for low tier
```

### Current vs Historical Pools
Each tier's budget is further split:

```javascript
CURRENT_BUDGET_RATIO: 0.70,     // 70% for current-scope subjects
HISTORICAL_BUDGET_RATIO: 0.30,  // 30% for historical-scope subjects
```

This ensures subjects using historical scope don't crowd out immediate context.

### Example Budget Breakdown

```
Total: 1500 tokens

HIGH Tier (900 tokens):
  - Current pool: 630 tokens
  - Historical pool: 270 tokens

MEDIUM Tier (375 tokens):
  - Current pool: 262 tokens
  - Historical pool: 113 tokens

LOW Tier (225 tokens):
  - Current pool: 157 tokens
  - Historical pool: 68 tokens
```

## Subject Structure

Each subject in the database follows this structure:

```javascript
{
    id: 'unique_identifier',
    keywords: ['trigger', 'words', 'phrases'],
    importance: 8.5,  // Float for tiebreaking within tiers
    historyScope: HISTORY_SCOPE.CURRENT_EXCHANGE,
    sentences: [
        { text: ' Most important fact about this subject.', target: 'scenario' },
        { text: ', key personality trait related to subject', target: 'personality' },
        { text: ' Second most important detail.', target: 'scenario' },
        { text: ' Additional context.', target: 'scenario' },
        { text: ', secondary personality trait', target: 'personality' },
        { text: ' Deep lore detail.', target: 'scenario' },
        // ... up to 12 sentences
    ]
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier for debugging |
| keywords | array | Trigger words/phrases (case-insensitive) |
| importance | float | Tiebreaker when subjects have equal mentions |
| historyScope | enum | Which messages to search for keywords |
| sentences | array | Ordered list of sentence objects |

### Sentence Object

| Field | Type | Values |
|-------|------|--------|
| text | string | The sentence to inject (include leading space) |
| target | string | `'personality'` or `'scenario'` |

## Configuration Options

```javascript
const CONFIG = {
    // Budget settings
    TOTAL_BUDGET: 1500,           // Total available tokens
    HIGH_RATIO: 0.60,             // High tier percentage
    MEDIUM_RATIO: 0.25,           // Medium tier percentage
    LOW_RATIO: 0.15,              // Low tier percentage (remainder)

    // Tier thresholds
    HIGH_THRESHOLD: 3,            // Mentions needed for high tier
    MEDIUM_THRESHOLD: 2,          // Mentions needed for medium tier

    // History settings
    HISTORY_MESSAGE_COUNT: 10,    // Messages to search for HISTORICAL scope

    // Pool split ratios
    CURRENT_BUDGET_RATIO: 0.70,   // Current-scope budget share
    HISTORICAL_BUDGET_RATIO: 0.30, // Historical-scope budget share

    // Dynamic tier settings
    DYNAMIC_BUDGETS: true,        // Redistribute unused budget to lower tiers
    PROMOTION_ENABLED: true,      // Promote subjects to empty higher tiers
    PROMOTION_MIN_IMPORTANCE: 5.0, // Minimum importance for promotion eligibility
    REDISTRIBUTION_MODE: 'cascade', // 'cascade', 'proportional', or 'low_priority'

    // Debug
    DEBUG: false                  // Show activation info in output
};
```

### Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| TOTAL_BUDGET | number | 1500 | Maximum tokens for all lore |
| HIGH_RATIO | float | 0.60 | Budget share for high tier |
| MEDIUM_RATIO | float | 0.25 | Budget share for medium tier |
| LOW_RATIO | float | 0.15 | Budget share for low tier |
| HIGH_THRESHOLD | number | 3 | Mentions needed for high tier |
| MEDIUM_THRESHOLD | number | 2 | Mentions needed for medium tier |
| HISTORY_MESSAGE_COUNT | number | 10 | Messages to search for HISTORICAL scope |
| CURRENT_BUDGET_RATIO | float | 0.70 | Pool share for current-scope subjects |
| HISTORICAL_BUDGET_RATIO | float | 0.30 | Pool share for historical-scope subjects |
| DYNAMIC_BUDGETS | boolean | true | Enable budget redistribution |
| PROMOTION_ENABLED | boolean | true | Enable subject promotion |
| PROMOTION_MIN_IMPORTANCE | float | 5.0 | Minimum importance for promotion |
| REDISTRIBUTION_MODE | string | 'cascade' | How to redistribute unused budget |
| DEBUG | boolean | false | Show debug info in output |

## Setup Instructions

1. Copy `Progressive_Sentence_Lorebook_Template.js` to your JanitorAI Scripts
2. Adjust CONFIG values for your scenario
3. Replace example subjects with your world content
4. Order sentences within each subject by importance
5. Set appropriate history scope for each subject
6. Test with DEBUG: true enabled
7. Fine-tune thresholds and budgets based on results

## Writing Effective Sentences

### Sentence Ordering

Order sentences from most to least important within each subject:

1. **First sentence**: Core identity/definition (always included if subject activates)
2. **Second sentence**: Primary personality trait OR key detail
3. **Third-fourth sentences**: Important relationships and context
4. **Middle sentences**: Significant background information
5. **Later sentences**: Flavor details, deep lore, optional nuance

### Writing Guidelines

**DO:**
- Start scenario sentences with a space
- Start personality sentences with a comma and space
- Make each sentence meaningful standalone
- Include mix of scenario and personality targets
- Keep sentences focused on single facts

**DON'T:**
- Start sentences with conjunctions (unless continuing thought)
- Include redundant information across sentences
- Put the most interesting details last
- Make sentences dependent on previous sentences

### Example - Good Sentence Set

```javascript
sentences: [
    { text: ' The Crimson Order is an elite military unit serving the Emperor directly.', target: 'scenario' },
    { text: ', respectful of the Crimson Order\'s legendary combat prowess', target: 'personality' },
    { text: ' They answer to no noble house and operate above normal military law.', target: 'scenario' },
    { text: ' Membership requires surviving brutal trials and absolute loyalty oaths.', target: 'scenario' },
    { text: ' Their signature crimson cloaks are both feared and respected.', target: 'scenario' },
    { text: ', aware that crossing the Crimson Order rarely ends well', target: 'personality' },
    { text: ' Rumors persist of their involvement in political assassinations.', target: 'scenario' }
]
```

## Usage Examples

### Example 1: Single Subject, High Mentions

**User message:** "Tell me more about the Duke. What is Duke Ashford planning? The Duke seems suspicious."

**Result:**
- Duke Ashford subject: 3 mentions ("Duke" x3)
- Placed in HIGH tier
- Gets full high-tier budget allocation
- Most/all sentences added

### Example 2: Multiple Subjects, Balanced

**User message:** "What do the Mages Guild and Merchant Guild think of each other?"

**Result:**
- Mages Guild: 1 mention
- Merchant Guild: 1 mention
- Both in LOW tier (1 mention each)
- Round-robin allocation: Mages sentence 1, Merchant sentence 1, Mages sentence 2, etc.
- Balanced coverage of both topics

### Example 3: Historical vs Current

**Setup:**
- Duke Ashford: CURRENT_EXCHANGE scope
- Merchant Guild: HISTORICAL scope (discussed 5 messages ago)

**User message:** "What does the Duke think about trade?"

**Result:**
- Duke Ashford: Activated (mentioned in current message)
- Merchant Guild: Also activated (mentioned in historical context, "trade" keyword)
- Duke uses current pool, Merchant uses historical pool
- Both get coverage without competing for same budget

### Example 4: Dynamic Budget Redistribution

**Setup:**
- DYNAMIC_BUDGETS: true
- REDISTRIBUTION_MODE: 'cascade'
- Total budget: 1500 tokens

**User message:** "Tell me about the capital."

**What happens:**
1. Only "capital" subject activates (1 mention → LOW tier normally)
2. HIGH tier: empty (budget 900, needs 0) → 900 unused
3. MEDIUM tier: empty (budget 375, needs 0) → 375 unused
4. CASCADE redistribution kicks in:
   - HIGH's 900 unused → MEDIUM (now has 1275)
   - MEDIUM's 1275 unused → LOW (now has 1500)
5. LOW tier now has full 1500 token budget
6. Capital subject gets ALL its sentences instead of just 1-2

**Result:** Single subject gets comprehensive coverage instead of minimal detail.

### Example 5: Subject Promotion

**Setup:**
- PROMOTION_ENABLED: true
- PROMOTION_MIN_IMPORTANCE: 5.0
- Duke Ashford importance: 9.0

**User message:** "What is the Duke planning?"

**What happens:**
1. Only Duke activates (1 mention → normally LOW tier)
2. HIGH tier empty, MEDIUM tier empty
3. Promotion checks Duke's importance (9.0 >= 5.0 threshold)
4. Duke promoted directly to HIGH tier
5. Duke receives HIGH tier budget (60% = 900 tokens)

**Result:** Important single-subject queries get the detail they deserve.

### Example 6: Combined Dynamic Features

**Setup:**
- Both DYNAMIC_BUDGETS and PROMOTION_ENABLED: true
- Three subjects: Duke (importance 9.0), Mages Guild (8.5), Great War (5.0)

**User message:** "The Duke and the mages fought in the war."

**What happens:**
1. All three subjects activate with 1 mention each (normally all LOW)
2. HIGH tier empty → Duke promoted to HIGH (importance 9.0)
3. MEDIUM tier empty → Mages Guild promoted to MEDIUM (importance 8.5)
4. Great War stays in LOW (importance 5.0, but no empty tiers left)
5. Budget redistribution:
   - HIGH tier: Duke needs ~400 tokens, has 900 → 500 unused
   - 500 cascades to MEDIUM → Mages Guild now has 875 tokens
   - MEDIUM needs ~350, has 875 → 525 unused
   - 525 cascades to LOW → Great War now has 750 tokens
6. All subjects get expanded coverage

**Result:** Balanced, detailed coverage across multiple subjects with intelligent budget allocation.

## Best Practices

### Budget Tuning
- Start with default ratios and adjust based on testing
- Lower HIGH_THRESHOLD if single mentions feel under-served
- Increase TOTAL_BUDGET for complex scenes
- Decrease TOTAL_BUDGET for faster models or simpler scenarios

### History Scope Selection
- Default to CURRENT_USER_ONLY for most subjects
- Use CURRENT_EXCHANGE for active scene elements
- Reserve HISTORICAL for truly persistent elements
- Too many HISTORICAL subjects can bloat context

### Keyword Design
- Include common variations and synonyms
- Add character titles and nicknames
- Consider partial matches ("duke" catches "Duke Ashford")
- Avoid overly generic keywords that activate unintentionally

### Testing Strategy
1. Enable DEBUG mode
2. Send test messages with various keyword combinations
3. Verify tier assignments match expectations
4. Check sentence counts per subject
5. Ensure important info appears first
6. Test edge cases (no keywords, many keywords, etc.)

## Troubleshooting

### Too Much Content Added
- Lower TOTAL_BUDGET
- Raise tier thresholds
- Reduce sentence counts per subject
- Lower HISTORICAL_BUDGET_RATIO

### Important Subjects Getting Cut
- Increase their importance value
- Lower tier thresholds
- Move critical info to first sentences
- Adjust tier budget ratios

### Historical Subjects Dominating
- Lower HISTORICAL_BUDGET_RATIO
- Reduce HISTORY_MESSAGE_COUNT
- Change some subjects to CURRENT_USER_ONLY
- Be more selective with HISTORICAL scope

### Unbalanced Coverage
- Check mention counts in DEBUG output
- Verify tier assignments are as expected
- Consider adjusting keyword specificity
- May need to adjust thresholds

### Sentences Appearing Out of Order
- This is expected - round-robin adds one sentence per subject at a time
- Important info should be in first sentences of each subject
- The alternating pattern ensures balance across subjects

### Performance Issues
- Reduce subject count
- Lower HISTORY_MESSAGE_COUNT
- Simplify keyword patterns
- Consider splitting into multiple scripts if needed
