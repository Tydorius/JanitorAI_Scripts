# TimeDelay Script Template

A progressive disclosure system for Janitor AI Scripts that reveals information over time through message count thresholds, hour-based timeline progression, canon count tracking, and context-aware token management.

## Table of Contents
- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Feature Configuration](#feature-configuration)
- [Canon Database Structure](#canon-database-structure)
- [Witness and Location System](#witness-and-location-system)
- [Token Management](#token-management)
- [Timeline Structure](#timeline-structure)
- [Hidden Clue System](#hidden-clue-system)
- [Conditional Events](#conditional-events)
- [Character Card Requirements](#character-card-requirements)
- [Example Scenario](#example-scenario)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

This template creates a progressive disclosure system where canonical information is revealed gradually over time, preventing spoilers and maintaining mystery engagement. The system uses multiple complementary mechanisms:

- **Message Count Thresholds**: Clues unlock at specific message counts (5, 10, 15...)
- **Hour-Based Timeline**: Events trigger at specific hours (0-24 hours)
- **Canon Count Tracking**: Cumulative count of clues unlocked, affecting what new information is available
- **Drop-In/Drop-Out System**: Witnesses and locations only activate when mentioned in conversation
- **Context-Aware Token Management**: Reduces detail of previously-discovered clues to manage token budget
- **Hidden Clue Embedding**: Critical clues hidden within observational details, only revealed when sufficient context established
- **Conditional Events**: Story branches based on player actions (e.g., robbery success vs prevention)

This template is ideal for:
- Mystery scenarios where clues must be discovered progressively
- Investigation stories with multiple suspects and locations
- Plot-twist narratives where early information would spoil later revelations
- Stories with multiple characters/witnesses who provide information over time
- Scenarios requiring strategic token management for long investigations

## Core Concepts

### Progressive Disclosure Principle

The core concept is simple: Information is only provided to the AI when appropriate conditions are met. This prevents:

**Premature Spoilers**: Early clues don't reveal later plot developments
**Information Overload**: Not all available context is provided at once
**Token Overflow**: Token budget manages how much detail is provided
**Cascading Discoveries**: New clues unlock related information

### Three-Threshold System

Each canon entry has three thresholds that must ALL be met before activation:

1. **`minMessages`**: Minimum message count before entry can activate
2. **`minHour`**: Minimum hour progression before entry can activate
3. **`minCanon`**: Minimum canon count before entry can activate

Example: A witness testimony might require:
- `minMessages: 5` (Player has interacted enough to establish investigation)
- `minHour: 5` (Timeline has progressed to appropriate time)
- `minCanon: 4` (Player has discovered enough foundational clues first)

### Canonical Information Format

All canonical information uses this format:

```
[CANON]: [Information content]
```

This format is:
- Unmistakable to the LLM (clearly denotes official truth)
- Searchable in script output (for debugging)
- Consistent across all information types

### Canon Count Stat

The character card must track a "Canon Count" statistic:

```
**Canon Count:** [X]
```

This cumulative count tracks how many canonical entries have been unlocked, affecting:
- Which clues are now available
- How cooperative witnesses become
- Which events trigger
- Token budget allocation

## Feature Configuration

The template includes a feature toggle system for easy component control:

```javascript
const FEATURES = {
    LOREBOOK: true,              // Core system (always true)
    TIMELINE_EVENTS: true,      // Hour-based events
    STAT_TRACKING: true,          // Canon Count and Hour
    PROGRESSIVE_DISCLOSURE: true, // Message-based thresholds
    DROP_IN_OUT: true,          // Witness/location system
    CONTEXT_AWARE_BUDGETING: true, // Token management
    HIDDEN_CLUES: true,         // Hidden clue embedding
    CONDITIONAL_EVENTS: true,   // Conditional story branches
    DEBUG_MODE: false             // Debug output
};
```

### Recommended Toggle Combinations

**Basic Progressive Disclosure**:
```javascript
LOREBOOK: true,
TIMELINE_EVENTS: false,
STAT_TRACKING: true,
PROGRESSIVE_DISCLOSURE: true,
DROP_IN_OUT: false,
CONTEXT_AWARE_BUDGETING: false,
HIDDEN_CLUES: false,
CONDITIONAL_EVENTS: false,
DEBUG_MODE: false
```

**Full Featured Mystery**:
```javascript
LOREBOOK: true,
TIMELINE_EVENTS: true,
STAT_TRACKING: true,
PROGRESSIVE_DISCLOSURE: true,
DROP_IN_OUT: true,
CONTEXT_AWARE_BUDGETING: true,
HIDDEN_CLUES: true,
CONDITIONAL_EVENTS: true,
DEBUG_MODE: false
```

## Canon Database Structure

The canon database contains all canonical information revealed progressively. Each entry includes:

```javascript
{
    id: 'unique_identifier',           // Internal ID
    keywords: ['trigger1', 'trigger2'], // Keywords that activate entry
    importance: 10.0,                  // Float for tiebreaking (supports 1.5, 2.7, etc.)
    minMessages: 5,                   // Minimum messages required
    minHour: 5,                         // Minimum hour required
    minCanon: 4,                       // Minimum canon count required
    full: {                              // Full detail version
        scenario: ' [CANON]: Complete information...'
    },
    summary: {                            // Summary version (token budget)
        scenario: ' [CANON]: Condensed information...'
    },
    bullet: {                              // Bullet version (token budget)
        scenario: ' [CANON]: Brief information...'
    }
}
```

### Field Explanations

- **`id`**: Unique identifier for internal organization and debugging
- **`keywords`**: Words/phrases that trigger this entry when mentioned
- **`importance`**: Float value (1.0-11.0) determining priority; higher values activate first and resist token reduction
- **`minMessages`**: Message count threshold; entry won't activate until this many messages have occurred
- **`minHour`**: Hour threshold; entry won't activate until timeline reaches this hour
- **`minCanon`**: Canon count threshold; entry won't activate until player has unlocked this many clues
- **`full.scenario`**: Complete detail version with all information
- **`summary.scenario`**: Condensed version for token management
- **`bullet.scenario`**: Minimal version for token management

### Importance Scale

Use this scale for assigning importance:

- **11.0**: Critical revelations (major plot twists, final clues)
- **10.0-9.5**: Important events (robbery, arrests, key testimonies)
- **8.5-9.0**: Significant information (witness statements, bank details)
- **7.0-8.5**: Useful details (security assessments, background information)
- **5.0-7.0**: Context information (general setting, minor details)

## Witness and Location System

The drop-in/drop-out system manages witnesses and locations that only activate when mentioned in conversation.

### Entity Detection

The script detects mentions using regex patterns:

```javascript
const entityMentions = {
    // WITNESSES
    thomas: /thomas|guard thomas|security guard/i.test(lastMessage),
    maria: /maria|customer marie|rodriguez/i.test(lastMessage),
    sarah: /sarah|manager sarah|sarah williams/i.test(lastMessage),
    
    // LOCATIONS
    first_national: /first national|first bank|downtown bank/i.test(lastMessage),
    river_city: /river city|savings|waterfront bank/i.test(lastMessage),
    metro_community: /metro community|metro bank|community bank/i.test(lastMessage)
};
```

### Conditional Content

Witnesses and locations can provide different information based on canon count:

```javascript
scenario: `Thomas Anderson (Security Guard) ${
    canonCount >= 4 
        ? 'has provided testimony about suspicious photographer...' 
        : 'is stationed at entrance and lobby...'
}${canonCount >= 4 ? 'Thomas is now cooperating fully.' : ''}`
```

This allows:
- Basic information available immediately upon mention
- Additional details revealed as canon count increases
- Progressive cooperation as investigation advances

### Multi-Format Character Content

Witness entries include full personality and scenario descriptions:

```javascript
{
    keywords: ['thomas', 'security guard'],
    priority: 8,
    content: {
        scenario: `[Dynamic scenario based on canon count]`,
        personality: `<BEGIN 'Thomas' PERSONALITY>
[Personality traits]
<END 'Thomas' PERSONALITY>`
    }
}
```

## Token Management

The token management system prevents context overflow by reducing detail of previously-discovered information.

### Three-Tier Reduction

Each canon entry has three detail levels:

**Full**: Complete information with all details
**Summary**: Condensed version preserving key points
**Bullet**: Minimal version with essential information only

### Activation Priority

When token budget is limited, entries are prioritized by:

1. **Importance**: Higher importance (10.0+) gets full version
2. **Mention Count**: Recently-mentioned entries (2+ mentions) get full version
3. **Budget**: Remaining budget distributed to lower priority entries

### Budget Allocation

Total token budget is set at 1500 tokens (configurable):

- 60% to high-priority or recently-mentioned entries
- 30% to medium-priority entries
- 10% to low-priority entries

### Automatic Reduction

When token budget is exceeded, system automatically:
1. Reduces some entries from Full → Summary
2. If still over budget, reduces from Summary → Bullet
3. Preserves top 3 entries at Full version (critical information)

This ensures important information always available in full detail while managing overall token usage.

## Timeline Structure

The timeline progresses in hours (0-24 hours), with events triggering at specific hours.

### Hour Progression

Character card must track hour progression:

```
**Hour:** [X]
```

### Hour-Based Events

Events trigger at specific hours when canon count requirements are met:

```javascript
if (currentHour === 5 && canonCount >= 4) {
    context.character.scenario += '\n\n[CANON]: Security Guard Thomas Anderson reports...';
}
```

### Conditional Events

Some events are conditional based on player actions:

```javascript
if (currentHour === 8 && canonCount >= 7) {
    const atMetro = lastMessage.includes('metro') || 
                      lastMessage.includes('community bank');
    
    if (atMetro && canonCount >= 7) {
        // Robbery prevented
    } else {
        // Robbery succeeded
    }
}
```

### Hour Range Guidelines

Use this structure for hour-based events:

- **Hours 0-3**: Initial investigation phase (bank visits, basic information)
- **Hours 4-7**: Deep investigation (witness interviews, hidden details)
- **Hour 8**: Major event (robbery)
- **Hours 9-23**: Aftermath investigation (evidence, connections)
- **Hour 24**: Final revelation (complete story)

## Hidden Clue System

The hidden clue system embeds critical clues within observational details, only revealing them when sufficient context is established.

### Hidden Clue Structure

Hidden clues use this structure:

```javascript
{
    // ... other fields
    full: {
        scenario: ' [CANON]: Basic information. [HIDDEN CLUE: Critical detail that changes understanding]'
    },
    // ... summary and bullet versions without hidden clue
    hiddenCondition: {
        type: 'either', // 'and' or 'or'
        conditions: [
            { type: 'hour', value: 5 },      // Requires hour 5+
            { type: 'canon', value: 4 }      // OR canon count 4+
        ]
    },
    hiddenContent: {
        scenario: ' [CANON]: Basic information. [HIDDEN CLUE]: Critical detail NOW REVEALED because conditions met]'
    }
}
```

### Condition Types

**`hour`**: Hidden clue reveals when timeline reaches specified hour
**`canon`**: Hidden clue reveals when canon count reaches specified value
**`message`**: Hidden clue reveals when message count reaches specified value

### Condition Logic

**`either`**: Any condition being met reveals hidden clue
**`and`**: All conditions must be met to reveal hidden clue

### Hidden Clue Integration

In the example scenario:
- Hour 1 First National details mention photographer focused on cameras (hidden clue)
- Hour 5 Thomas testimony confirms photographer focused on cameras (hidden clue NOW revealed)
- This creates "aha!" moments when pieces connect

## Conditional Events

Conditional events allow story branching based on player actions.

### Implementation Pattern

```javascript
if (currentHour === 8 && canonCount >= 7) {
    // Check player location/action
    const playerAtMetro = lastMessage.includes('metro') ||
                          lastMessage.includes('community bank');
    
    if (playerAtMetro) {
        // Success branch
        context.character.scenario += '\n\n[CANON]: Robbery attempt thwarted...';
    } else {
        // Failure branch
        context.character.scenario += '\n\n[CANON]: Robbery executed...';
    }
}
```

### Branching Guidelines

- **Player Choice**: Branch based on player's action (location visited, decision made)
- **Investigation Quality**: Branch based on how thoroughly player investigated (canon count)
- **Timing**: Branch based on when player acted (hour progression)

### Narrative Impact

Conditional branches should:
- Create significantly different outcomes
- Lead to different information becoming available
- Provide different player experiences
- Ultimately converge to complete story understanding

## Character Card Requirements

### Essential Stats

Character cards MUST track these statistics:

```
**Canon Count:** [X]%
**Hour:** [X]
```

**Canon Count**: Cumulative count of canonical entries unlocked (0-100%)
**Hour**: Current timeline progression (0-24 hours)

### Status Block Format

Every AI response MUST end with a status block in this format:

```
**=== INVESTIGATION STATUS ===**
**Canon Count:** [X]%
**Current Hour:** [X]/24
**Investigation Phase:** [Phase description]
```

### Progressive Disclosure Instructions

Character card MUST include:

```
{{char}} is working on a progressive investigation where information is revealed over time.

**CANONICAL INFORMATION PROTOCOL:**

All canonical information about this scenario is provided through a progressive disclosure system. Critical details (clues, character motivations, plot revelations) are introduced systematically as the investigation advances. Information not yet provided does not exist in the current story context.

**CANONICAL INFORMATION FORMAT:**

When the Script injects canonical information, it uses this format:
```
[CANON]: [Information content]
```

This format indicates official, verified information that is now part of the story reality. All other context from this message forward must align with these canon facts.

**STRICT CONSTRAINTS:**

1. DO NOT assume motives, relationships, or plot developments not yet provided
2. DO NOT create convenient connections or coincidences to advance the story
3. DO NOT foreshadow or hint at revelations not yet disclosed
4. DO NOT have characters know things they haven't learned through provided context

5. When information is missing:
   - State uncertainty ("The motive isn't clear yet")
   - Request investigation ("More clues are needed")
   - Maintain ambiguity ("The evidence points in conflicting directions")

6. What you CAN do:
   - Respond naturally to information that HAS been provided
   - Ask questions that would logically arise from current knowledge
   - Describe settings and atmosphere using established context
   - Have characters react to revealed information appropriately

**CANON COUNT TRACKING:**

The investigation tracks cumulative canonical information unlocked. As Canon Count increases:
- New witnesses become more cooperative
- Additional details become available in previously-visited locations
- Critical clues connect and reveal deeper information
- The investigation advances toward complete understanding

**HOUR PROGRESSION:**

The investigation operates on a 24-hour timeline. Each hour may bring new information, events, or revelations. The investigation begins at Hour 0 and must conclude or reach critical points by Hour 24.

**INVESTIGATION GUIDELINES:**

- When [CANON]: [Content] appears, integrate it completely into narrative
- All future references must acknowledge established canon facts
- Do not contradict or modify canonical information
- Recognize that missing information is intentional - don't fill gaps with speculation
- Maintain mystery and investigation pace - don't rush to conclusions without sufficient evidence
```

### Example Status Block

```
**=== INVESTIGATION STATUS ===**
**Canon Count:** 15%
**Current Hour:** 12/24
**Investigation Phase:** Deep investigation phase, pursuing criminal background
```

## Example Scenario

The template includes a complete example scenario demonstrating all features:

### Scenario Overview

**Setting**: Modern city with three banks
**Event**: Upcoming bank robbery at Hour 8 (2 PM)
**Player Role**: Investigator who received anonymous tip
**Goal**: Identify target bank and prevent robbery

### Banks

1. **First National Bank**: High-tech security, NOT target (red herring)
2. **River City Savings**: Older bank with vulnerabilities, NOT target (misdirection)
3. **Metro Community Bank**: Small neighborhood bank, THE TARGET (vulnerable)

### Witnesses

1. **Thomas Anderson** (Security Guard at First National): Observed photographer focused on security cameras (hidden clue)
2. **Maria Rodriguez** (Customer at River City): Reported watchers in silver sedan (timing clue)
3. **Sarah Williams** (Manager at Metro Community): Nervous behavior, providing inside help (critical)

### Timeline (0-24 Hours)

- **Hour 0**: Initial anonymous tip received
- **Hours 1-3**: Bank security assessments (observational clues)
- **Hours 4-7**: Witness interviews (detailed clues, hidden details)
- **Hour 8**: Robbery event (conditional: success or prevention based on player action)
- **Hours 9-23**: Investigation aftermath (background, connections, mastermind)
- **Hour 24**: Final revelation (complete story)

### Hidden Clues Example

**Hidden in Hour 1 (First National)**: "Photographer focused on security cameras" (not just exterior shots)
**Revealed at Hour 5 (Thomas testimony)**: Confirms photographer was checking security bypass methods
**Impact**: Crew was planning how to defeat security systems

### Mastermind Twist

**Hour 21 reveals**: Marcus Thorne (First National CEO) orchestrated everything to benefit from acquiring Metro Community Bank at reduced price. First National appeared as red herring but was actually the mastermind behind everything.

## Best Practices

### Canon Database Design

**Start with foundation**: Early hours provide basic setting and context
**Build progressively**: Each hour adds layer of complexity
**Create connections**: Later hours reveal why earlier information was significant
**Use hidden clues**: Embed critical insights within observational details
**Plan thresholds**: Carefully choose minMessages, minHour, minCanon for each entry

### Importance Assignment

**Critical information**: 11.0 (always full detail)
**Key revelations**: 10.0 (resistant to token reduction)
**Important details**: 9.0 (high priority)
**Useful context**: 8.0-8.5 (medium priority)
**Background**: 7.0 and below (low priority)

### Witness/Location Design

**Basic info available immediately**: When mentioned, provide foundational information
**Progressive cooperation**: More details available as canon count increases
**Conditional content**: Different responses based on investigation phase
**Natural dialogue**: Example dialogs showing personality and cooperation level

### Timeline Pacing

**Initial phase (0-3)**: Provide enough to engage but not overwhelm
**Investigation phase (4-7)**: Most information should unlock here
**Event phase (8)**: Major branching point
**Aftermath phase (9-23)**: Build toward complete understanding
**Revelation (24)**: Tie everything together with complete picture

### Token Management

**Importance first**: Critical information always full detail
**Recent context**: Currently-investigated areas full detail
**Past reduction**: Previously-discovered information summarized
**Background**: Not-currently-active areas minimal detail

### Conditional Events

**Meaningful choices**: Player actions should significantly impact outcome
**Fair branching**: Both paths should lead to complete story (different routes)
**Clear criteria**: Player should understand what affects branches
**Reconvergence**: Paths should ultimately lead to complete understanding

## Troubleshooting

### Common Issues

**Too Much Canon Activating at Once**
- Increase `minMessages` values for later entries
- Increase `minCanon` requirements to force progressive discovery
- Increase `minHour` requirements to space out timeline
- Check that multiple entries don't share too many keywords

**Important Canon Not Activating**
- Verify all three thresholds are being met (messages, hour, canon)
- Check that keywords are actually being mentioned in conversation
- Ensure `Canon Count` stat is advancing properly in character card
- Verify `Hour` stat is progressing in character card
- Enable `DEBUG_MODE` to see activation state

**Timeline Events Not Firing**
- Confirm `Hour` stat is advancing in character card
- Check that `TIMELINE_EVENTS` feature is enabled
- Verify `minHour` values are appropriate for your timeline
- Ensure conditional events have proper conditions

**Witnesses/Not Locations Not Activating**
- Check regex patterns in `entityMentions` match natural conversation
- Verify that character names/locations are being mentioned
- Ensure `DROP_IN_OUT` feature is enabled
- Test by mentioning entity directly in conversation

**Hidden Clues Not Revealing**
- Verify `HIDDEN_CLUES` feature is enabled
- Check that `hiddenCondition` thresholds are being met
- Ensure condition type (`hour`, `canon`, `message`) is appropriate
- Confirm that `hiddenContent` version is being used when conditions met

**Token Budget Issues**
- Reduce `MAX_TOKENS` if still experiencing overflow
- Check that `CONTEXT_AWARE_BUDGETING` is enabled
- Verify importance values are appropriate (critical info should be 10.0+)
- Enable `DEBUG_MODE` to see token usage and reduction

### Debugging Mode

Enable debugging to see system state:

```javascript
const FEATURES = {
    // ... other features
    DEBUG_MODE: true
};
```

Debug output includes:
- How many canon entries activated
- How many witnesses/locations activated
- Current hour and canon count
- Message count
- Token usage (if context-aware budgeting enabled)
- Triggered keywords (for cascading)

### Testing Approach

1. **Test activation**: Mention different entities to verify drop-in/out system
2. **Test progression**: Advance through hours to verify timeline events
3. **Test thresholds**: Verify canon entries unlock only when all three thresholds met
4. **Test branching**: Test different player actions at conditional events
5. **Test token management**: Verify reduction happens when many entries activate
6. **Test hidden clues**: Verify hidden content reveals when conditions met

## Feature Comparison

| Feature | TimeDelay Template | Complex Template | Adaptive Template |
|---------|------------------|-----------------|-----------------|
| **Message Thresholds** | Yes (minMessages) | Yes (minMessages) | No |
| **Timeline Progression** | Yes (hours 0-24) | Yes (days) | No |
| **Canon Count Tracking** | Yes (minCanon) | No (stat tracking only) | No |
| **Drop-In/Out System** | Yes (witnesses/locations) | No | No |
| **Context-Aware Budgeting** | Yes (Full/Summary/Bullet) | No | Yes (Full/Summary/Bullet) |
| **Hidden Clue System** | Yes (conditional revelation) | No | No |
| **Conditional Events** | Yes (player action branching) | No | No |
| **Feature Toggles** | Yes | Yes | No |
| **Debug Mode** | Yes | Yes | No |

## Version History

**v1.0 - Initial Release**
- Full progressive disclosure system
- Hour-based timeline (0-24 hours)
- Canon count tracking
- Drop-in/drop-out witness/location system
- Context-aware token management
- Hidden clue embedding
- Conditional events system
- Feature toggle system
- Complete example scenario (bank robbery)

---

**Created for the Janitor AI Scripts community. Feel free to modify, share, and improve upon this system.**

**This template demonstrates a comprehensive approach to progressive disclosure, combining multiple complementary systems to create engaging mystery scenarios that reveal information at the right pace.**
