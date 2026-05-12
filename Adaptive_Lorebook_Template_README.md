# Adaptive Lorebook Template

A token-aware lorebook system for JanitorAI Scripts that automatically adjusts detail levels based on context relevance and token budgets.

## Table of Contents
- [Overview](#overview)
- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [How It Works](#how-it-works)
- [Detail Level System](#detail-level-system)
- [Lore Entry Structure](#lore-entry-structure)
- [Importance Values](#importance-values)
- [Token Management Process](#token-management-process)
- [Setup Instructions](#setup-instructions)
- [Customization Guide](#customization-guide)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Technical Details](#technical-details)
- [Troubleshooting](#troubleshooting)

## Overview

This template manages token consumption by dynamically scaling lore detail based on relevance. Frequently mentioned topics receive full descriptions, while less relevant information is condensed to summaries or bullet points.

## The Problem

Standard lorebook implementations add all triggered entries at full detail, causing:

- Excessive token consumption for users
- Context bloat reducing response quality
- Inconsistent costs across conversations
- Poor scaling with large lorebooks

## The Solution

The adaptive system provides three detail levels per entry and automatically selects the appropriate version based on:

- Keyword mention frequency
- User-defined importance ratings
- Total token budget constraints
- Priority preservation for top entries

## How It Works

1. **Detection**: Keywords in recent messages activate lore entries
2. **Counting**: System counts mentions for each triggered entry
3. **Ranking**: Entries sorted by mentions, with importance as tiebreaker
4. **Budgeting**: Total tokens calculated and compared to MAX_TOKENS
5. **Adaptation**: Detail levels adjusted to fit within token budget
6. **Application**: Selected versions added to character context

## Detail Level System

Each lore entry includes three versions:

**Full Version**
- Complete descriptions with context and nuance
- Used for top 3 most-mentioned entries
- Highest token cost

**Summary Version**
- Condensed information retaining key details
- Used for moderately relevant entries
- Medium token cost

**Bullet Version**
- Essential facts only
- Used for least relevant entries
- Lowest token cost

## Lore Entry Structure

Each entry requires:

```javascript
{
  id: 'unique_identifier',
  keywords: ['trigger', 'words', 'or phrases'],
  importance: 8.5,  // Float value for tiebreaking
  full: {
    personality: ', personality addition',
    scenario: ' Full scenario description'
  },
  summary: {
    personality: ', brief personality note',
    scenario: ' Condensed scenario info'
  },
  bullet: {
    personality: ', minimal trait',
    scenario: ' Key facts only'
  }
}
```

## Importance Values

Importance determines priority when entries have equal mentions.

**Recommended Scale:**
- 9.0-10.0: Core world elements, main characters
- 7.0-8.9: Significant factions, locations, events
- 5.0-6.9: Supporting characters, minor factions
- 3.0-4.9: Background details, flavor text
- 1.0-2.9: Optional lore, Easter eggs

**Using Decimals:**

Decimal values allow insertion between existing entries without renumbering:
- Original: 5.0, 6.0, 7.0
- Insert between 5.0 and 6.0: use 5.5
- Insert between 5.5 and 6.0: use 5.75

## Token Management Process

The system follows this reduction sequence:

**Step 1**: Keep top 3 entries as Full, reduce entries 7+ to Summary

**Step 2**: If still over budget, reduce entries 4-6 to Summary

**Step 3**: Convert non-top-3 Summary entries to Bullet

**Step 4**: Reduce entries 2-3 to Summary if needed

**Step 5**: Convert all remaining Summary entries to Bullet except position 1

This preserves maximum detail for the most relevant information while staying within token limits.

## Setup Instructions

1. Copy the template file to your JanitorAI Scripts
2. Adjust MAX_TOKENS constant based on your needs
3. Replace example lore entries with your world content
4. Set importance values for each entry
5. Test with various keyword combinations

## Customization Guide

### Adding New Entries

Create entries following the structure:

```javascript
{
  id: 'location_forest',
  keywords: ['dark forest', 'woods', 'ancient trees'],
  importance: 6.0,
  full: {
    personality: ', familiar with the legends of the Dark Forest',
    scenario: ' The Dark Forest spans hundreds of miles along the eastern border. Ancient trees tower overhead, their canopy blocking most sunlight. Locals tell stories of strange lights and missing travelers. Few paths exist through the dense undergrowth.'
  },
  summary: {
    personality: ', aware of Dark Forest dangers',
    scenario: ' The Dark Forest is a dangerous woodland on the eastern border. Ancient trees, limited paths, and local legends of disappearances.'
  },
  bullet: {
    personality: ', knows Dark Forest',
    scenario: ' Dark Forest: eastern border, dangerous, unexplored.'
  }
}
```

### Adjusting Token Budget

Modify MAX_TOKENS based on context window size:

- Small models (4k context): 800-1200 tokens
- Medium models (8k context): 1500-2000 tokens
- Large models (16k+ context): 2500-3500 tokens

### Writing Detail Levels

**Full Version Guidelines:**
- Include historical context
- Describe relationships and dynamics
- Explain motivations and consequences
- Provide atmospheric details

**Summary Version Guidelines:**
- Focus on current state
- List key relationships
- State primary characteristics
- Omit historical depth

**Bullet Version Guidelines:**
- Name and category only
- One or two defining traits
- Critical relationships if any
- Minimal elaboration

## Usage Examples

### Example 1: Single High-Priority Entry

User mentions: "the capital city"

Result: Capital entry loads as Full (under token budget)

### Example 2: Multiple Equal Priority Entries

User mentions: "mages guild" (3 times), "merchant guild" (3 times)

Result: Mages Guild loads as Full (importance 8.5 > 7.0), Merchant Guild loads as Summary

### Example 3: Token Budget Exceeded

8 entries triggered, total would be 2400 tokens (MAX_TOKENS = 1500)

Result:
- Top 3 by mentions: Full
- Entries 4-6: Summary
- Entries 7-8: Bullet

Total reduced to ~1450 tokens

## Best Practices

**Writing Entries:**
- Ensure Full version contains all information
- Summary should cover 60-70% of Full content
- Bullet should identify the entry with minimal context
- Maintain consistent voice across versions

**Setting Importance:**
- Reserve 10.0 for absolutely critical world elements
- Avoid clustering too many entries at same value
- Use decimals to create clear hierarchy
- Review and adjust after testing

**Keyword Selection:**
- Include common variations and misspellings
- Add relevant synonyms
- Consider plural and singular forms
- Test keyword detection accuracy

**Token Management:**
- Start with conservative MAX_TOKENS
- Monitor actual usage patterns
- Adjust based on user feedback
- Balance detail with performance

## Technical Details

### Token Estimation

The system estimates tokens by dividing character count by 4. This approximates:

- Short tokens: "un", "to" (2 characters)
- Medium tokens: "able", "the" (4 characters)
- Long tokens: "believe", "understand" (8 characters)

Average across typical English text yields ~4 characters per token.

### Mention Counting

Keywords are matched case-insensitively with global search. Multiple mentions of the same keyword in one message count separately.

### Sorting Algorithm

Primary sort by mention count (descending), secondary sort by importance value (descending). This ensures:

1. Most discussed topics rank highest
2. Ties broken by assigned importance
3. Consistent ordering across runs

## Troubleshooting

### Too Much Detail Lost

Issue: Important information appearing as bullets

Solutions:
- Increase MAX_TOKENS
- Raise importance values for affected entries
- Consolidate related entries
- Improve keyword coverage

### Token Budget Still Exceeded

Issue: Total tokens over MAX_TOKENS after all reductions

Solutions:
- Lower MAX_TOKENS target to leave reduction headroom
- Write more concise Full versions
- Ensure Summary/Bullet versions are significantly shorter
- Remove low-priority entries from database

### Incorrect Entry Ranking

Issue: Less relevant entries outranking important ones

Solutions:
- Adjust importance values
- Refine keyword lists to reduce false positives
- Consider context window for mention counting
- Review keyword overlap between entries

### Detail Level Transitions Too Abrupt

Issue: Summary/Bullet versions lack context

Solutions:
- Improve Summary version completeness
- Add transitional phrasing in reduced versions
- Ensure critical information appears in all versions
- Test each version independently for clarity

### Performance Issues

Issue: Script execution slow with large databases

Solutions:
- Reduce total lore entries
- Optimize keyword matching patterns
- Cache token calculations
- Profile to identify bottlenecks