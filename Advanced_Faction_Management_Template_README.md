# Advanced Faction Management and Diplomacy Template

A two-mode faction management system for JanitorAI Scripts that provides invisible stat tracking via zero-width characters during normal roleplay, and a full management interface with slash commands for construction, recruitment, research, diplomacy, and operations when activated.

Designed for any scenario involving faction governance: kingdoms, merchant guilds, mercenary companies, criminal organizations, political parties, or corporate entities.

## Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [State Schema](#state-schema)
- [Feature Toggles](#feature-toggles)
- [Command Reference](#command-reference)
- [Data Tables](#data-tables)
- [Character Card Setup](#character-card-setup)
- [For Non-Programmers: AI-Assisted Setup](#for-non-programmers-ai-assisted-setup)
- [Safe Component Removal](#safe-component-removal)
- [Troubleshooting](#troubleshooting)

## Overview

This template includes:

- **Zero-Width State Persistence**: All game state is encoded as invisible Unicode characters, completely hidden from players
- **Two-Mode Operation**: Normal roleplay mode with invisible tracking, and `/faction` mode for a full management interface
- **Project System**: 20 buildable structures with prerequisites, upgrade paths, and passive resource generation
- **Scalable Project Slots**: 2 slots base, upgradeable to 4 then 6 via Command Center upgrades
- **Diplomacy**: Stance and treaty tracking for up to 6 rival factions
- **Resource Management**: 5 resource types with passive generation from infrastructure and daily consumption
- **Population Tracking**: 3 personnel types plus morale, with recruitment costs
- **Stat Keyword Detection**: Normal-mode roleplay keywords automatically adjust stats
- **Day-Based Timeline Events**: Story beats triggered by time progression
- **Lore Activation Engine**: Keyword-triggered lore with cascading triggers and priority sorting
- **Stat Display Toggle**: `/showstats` and `/hidestats` for optional visible stat output

## Quick Start

### Step 1: Customize Data Tables

Open `Advanced_Faction_Management_Template.js` and modify these tables at the top of the file:

1. **STAT_NAMES** (line 142): Rename the 7 stats to match your setting
2. **RESOURCE_NAMES** (line 147): Rename the 5 resource types
3. **POP_NAMES** (line 151): Rename the 3 personnel types (index 3 is always morale/loyalty)
4. **PROJECT_TABLE** (line 161): Replace the 20 example buildings with your own
5. **NATION_TABLE** (line 214): Replace the 6 example factions with your rivals
6. **LORE_ENTRIES** (line 324): Replace example lore with your world's content
7. **TIMELINE_EVENTS** (line 349): Replace example events with your story beats
8. **DEFAULT_STATE** (line 127): Adjust starting values for stats, resources, and population

### Step 2: Update Starting Values

The `DEFAULT_STATE` object encodes all starting values as digit strings. Modify these to set your scenario's initial conditions:

```javascript
const DEFAULT_STATE = {
    [CATEGORY.MODE_DAY]:   '000012',       // Mode(0) Display(0) Day(001) Slots(2)
    [CATEGORY.STATS]:      '10251505100502', // Force, Security, Knowledge, Technology, Wealth, Reputation, Opposition
    [CATEGORY.RESOURCES]:  '1520101525',    // Funds, Materials, Arms, Supplies, Provisions
    [CATEGORY.POPULATION]: '10200550',      // Soldiers, Operatives, Scholars, Morale
    [CATEGORY.PROJECTS]:   '000000000000000000000000000000000000',
    [CATEGORY.DIPLOMACY]:  '111100000000',
    [CATEGORY.INFRA]:      '0000000'
};
```

### Step 3: Customize Keywords

Update these keyword tables to match your setting's vocabulary:

- **STAT_KEYWORDS** (line 292): Phrases that adjust stats during normal roleplay
- **TIME_KEYWORDS** (line 303): Phrases that advance the day counter
- **BUILD_ALIASES** (line 186): Shortcuts players can type for `/build` commands
- **RECRUIT_COSTS** (line 233): Unit recruitment costs
- **RESEARCH_ACTIONS** (line 245): Research fields and their costs
- **MILITARY_ACTIONS** (line 258): Military operations
- **MANAGE_ACTIONS** (line 265): Management actions (tax, feast, etc.)
- **DIPLOMACY_ACTIONS** (line 273): Diplomacy options

### Step 4: Configure Character Card

See the [Character Card Setup](#character-card-setup) section for instructions on setting up your character card to work with the template.

### Step 5: Test

Set `DEBUG_MODE: true` in the `FEATURES` object (line 48) and test basic functionality. See [Troubleshooting](#troubleshooting) for guidance.

## How It Works

### Zero-Width State Persistence

The template encodes all game state as decimal digits, then converts each digit to a zero-width Unicode character. This invisible string is injected into the scenario and the LLM is instructed to reproduce it at the start and end of every response.

State encoding flow:
1. Build a pipe-delimited string of category IDs + data digits
2. Convert each digit to its zero-width character equivalent
3. Wrap with header/footer markers (`\u200D\u200D`)
4. Inject into `context.character.scenario` with reproduction instructions
5. On next execution, scan recent messages backward for the state block
6. Decode the zero-width characters back to digits
7. Parse into the current state object

This approach means players never see any numbers or tracking data. The game state travels invisibly through the conversation.

### Two-Mode System

**Normal Mode** (default): The script silently tracks stats and resources in the background. It detects keywords in the player's messages to adjust stats, auto-start construction projects, and advance the day counter. Lore entries activate based on keywords. The AI roleplays normally.

**Faction Management Mode** (`/faction`): The script replaces the scenario and personality entirely with a management interface showing current stats, resources, personnel, active projects, and diplomacy status. The AI processes slash commands and narrates their results. Type `/exit` to return to normal roleplay.

### Day Advancement

Days advance through two mechanisms:
- **Time keywords**: During normal roleplay, phrases like "next day" or "a week later" advance the day counter
- **`/endturn`**: In faction mode, explicitly advances one day

Each day tick:
1. Advances all active projects (completing those that reach their duration)
2. Applies stat effects and population effects from completed projects
3. Sets infrastructure bits for completed buildings
4. Generates passive resources from completed infrastructure
5. Consumes provisions based on personnel counts

## State Schema

Each state category uses a 2-digit prefix followed by fixed-width data, pipe-delimited.

| Category | ID | Structure | Width |
|----------|-----|-----------|-------|
| Mode/Day | 01 | Mode(1) + StatsDisplay(1) + Day(3) + MaxSlots(1) | 6 digits |
| Stats | 02 | 7 stats x 2 digits each | 14 digits |
| Resources | 03 | 5 resources x 2 digits each | 10 digits |
| Population | 04 | 4 values x 2 digits each | 8 digits |
| Projects | 05 | 6 slots x (TypeID(2) + Elapsed(2) + Total(2)) | 36 digits |
| Diplomacy | 06 | 6 factions x (Stance(1) + Treaty(1)) | 12 digits |
| Infrastructure | 07 | Building bitmask | 7 decimal digits |

**Total encoded state**: ~93 decimal digits

### Diplomacy Stance Values

| Value | Stance |
|-------|--------|
| 0 | Unknown |
| 1 | Hostile |
| 2 | Unfriendly |
| 3 | Neutral |
| 4 | Cautious |
| 5 | Friendly |
| 6 | Allied |
| 7 | Vassal |

### Diplomacy Treaty Values

| Value | Treaty |
|-------|--------|
| 0 | None |
| 1 | Non-Aggression Pact |
| 2 | Trade Agreement |
| 3 | Military Alliance |
| 4 | Vassalage |
| 5 | Secret Pact |

## Feature Toggles

Control which systems are active via the `FEATURES` object:

```javascript
const FEATURES = {
    LORE_ENGINE: true,          // Keyword-triggered lore activation
    STAT_KEYWORDS: true,        // Detect stat-changing keywords in normal mode
    TIME_TRACKING: true,        // Day advancement detection
    TIMELINE_EVENTS: true,      // Day-based scripted events
    PROJECT_SYSTEM: true,       // Construction/upgrade projects
    DIPLOMACY_SYSTEM: true,     // Faction diplomacy tracking
    RESOURCE_SYSTEM: true,      // Resource generation and consumption
    DEBUG_MODE: false           // Diagnostic output
};
```

Set any feature to `false` to disable it without removing code.

## Command Reference

All commands work only in faction management mode (after typing `/faction`).

### Mode and Display

| Command | Effect |
|---------|--------|
| `/faction` | Enter faction management mode |
| `/exit` | Return to normal roleplay |
| `/showstats` | Show basic stat display in normal mode |
| `/showstats verbose` | Show detailed stat display in normal mode |
| `/hidestats` | Hide stat display in normal mode |
| `/overview` | Display current faction status |
| `/help` | List all available commands |
| `/endturn` | Advance one day |

### Construction

| Command | Example | Effect |
|---------|---------|--------|
| `/build [project]` | `/build barracks watch` | Start construction (multiple projects allowed) |
| `/upgrade [building]` | `/upgrade workshop` | Upgrade an existing building |

Build aliases are defined in `BUILD_ALIASES`. Add synonyms your players might use.

### Recruitment

| Command | Example | Effect |
|---------|---------|--------|
| `/train [count] [type]` | `/train 5 soldiers` | Recruit personnel |

Personnel types: `soldiers`, `operatives`, `scholars` (plus aliases: `military`, `troops`, `workers`, `researchers`)

### Research

| Command | Example | Effect |
|---------|---------|--------|
| `/research [field]` | `/research technology` | Spend funds to increase a stat |

Fields: `knowledge`, `technology`, `security`, `force` (plus aliases: `arcane`, `magic`, `tech`, `defense`, `military`)

### Diplomacy

| Command | Example | Effect |
|---------|---------|--------|
| `/diplomacy [faction] [action]` | `/diplomacy northern envoy` | Conduct diplomacy |

Actions: `envoy`, `threaten`, `treaty`, `trade`, `alliance`, `secret pact`

### Espionage and Military

| Command | Example | Effect |
|---------|---------|--------|
| `/espionage [faction]` | `/espionage eastern` | Spy on a faction (5 Funds) |
| `/military [action]` | `/military train` | Military operations |
| `/military raid [faction]` | `/military raid mountain` | Hostile action against a faction |

Military actions: `train` (+Force), `patrol` (+Security), `raid` (+Force, worsens relations)

### Management

| Command | Example | Effect |
|---------|---------|--------|
| `/manage [action]` | `/manage feast` | Internal management |

Actions: `tax` (+Funds, -Morale), `ration` (+Provisions, -Morale), `feast` (-Funds/Provisions, +Morale/Reputation), `festival` (larger feast)

## Data Tables

### Project Table

Each project entry has these fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | 2-digit unique identifier |
| `name` | string | Display name |
| `duration` | number | Days to complete |
| `cost` | object | Resource cost keys: `{f, m, a, s, p}` |
| `requires` | number/null | Bit index of prerequisite (0-based position in PROJECT_TABLE) |
| `statEffect` | object | Stats adjusted on completion: `{StatName: delta}` |
| `passiveGen` | object | Daily resource generation after completion: `{ResourceName: amount}` |
| `special` | string/null | `'slots4'` or `'slots6'` to increase project slots |
| `popEffect` | object | Population added on completion: `{PopName: count}` |

### Cost Key Reference

Resources use abbreviated keys in cost objects:

| Key | Resource |
|-----|----------|
| `f` | Funds |
| `m` | Materials |
| `a` | Arms |
| `s` | Supplies |
| `p` | Provisions |

### Faction Table

Each faction entry has:

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | 0-5 array index |
| `name` | string | Full faction name |
| `aliases` | array | Strings players might type to reference this faction |

### Lore Entry Structure

```javascript
{
    keywords: ['trigger phrases'],
    priority: 10,                // 0-11, higher activates first
    minMessages: 0,              // Minimum chat length before activation
    category: 'unique_id',       // Organization identifier
    personality: ', trait',      // Prepended to character personality
    scenario: ' context text',   // Prepended to character scenario
    triggers: ['keywords'],      // Cascading activation keywords
    filters: {                   // Conditional activation
        requiresAny: ['word'],
        requiresAll: ['word1', 'word2'],
        notWith: ['exclusion']
    },
    probability: 0.7             // Random activation chance (optional)
}
```

### Timeline Event Structure

```javascript
{
    day: 7,                      // Which day this event triggers
    id: 'unique_event_id',       // Organization identifier
    text: ' Scenario text',      // Added to character scenario
    personality: ', trait',      // Added to character personality (optional)
    minMessages: 2               // Minimum chat length (optional)
}
```

## Character Card Setup

Your character card needs to instruct the AI to reproduce the hidden state and respond to the management interface. The template handles the technical side; your card handles the narrative side.

### Personality Section

Include instructions for the AI to maintain awareness of the state system:

```
{{char}} operates within a faction management system that tracks multiple statistics invisibly.

**Behavior Rules:**
- {{char}} MUST reproduce the hidden characters from [PERSISTENT MEMORY] at the very start and end of every response
- {{char}} MUST NOT mention, describe, or acknowledge the hidden characters or the tracking system
- {{char}} considers stat values when making narrative decisions
- {{char}} treats displayed stat values as authoritative and does not contradict them
```

### Scenario Section

Set the initial scene and reference the management system:

```
{{user}} has recently established their faction and is beginning to build power. The surrounding region contains multiple rival groups, each with their own agendas.

**Management System:**
- Type /faction to enter management mode for construction, diplomacy, and operations
- Type /exit to return to normal roleplay
- The system tracks resources, personnel, and faction relationships automatically
- Building projects advance with each day that passes in the narrative
```

### Important Notes

- The template does not use `getStat()` regex parsing. Stats are tracked internally via zero-width encoding. Your character card does not need a status block format.
- The template injects stat displays directly when `/showstats` is active.
- In faction mode, the template replaces the scenario entirely with the management interface. The AI sees the management screen and processes commands.
- In normal mode, lore entries and timeline events are appended to the existing scenario. The AI roleplays normally while the system tracks state invisibly.

## For Non-Programmers: AI-Assisted Setup

You can use AI assistants to populate this template with your scenario's content. Paste the template file along with one of these prompts.

### Basic Setup Prompt

```
I have a JanitorAI faction management template (attached: Advanced_Faction_Management_Template.js). I want you to populate it with my scenario's content.

[PASTE YOUR WORLD/SCENARIO INFORMATION HERE]

Please:
1. Replace STAT_NAMES with 7 stats appropriate for my setting
2. Replace RESOURCE_NAMES with 5 resource types that fit my setting
3. Replace POP_NAMES with 3 personnel types (index 3 must stay as morale/loyalty)
4. Replace all 20 entries in PROJECT_TABLE with buildings appropriate for my setting
5. Replace NATION_TABLE with my scenario's rival factions (up to 6)
6. Replace LORE_ENTRIES with my world's lore, keeping the same entry structure
7. Replace TIMELINE_EVENTS with my story's key events
8. Update BUILD_ALIASES to match the new project names
9. Update STAT_KEYWORDS with keywords appropriate for my setting
10. Update DEFAULT_STATE starting values to make sense for my scenario
11. Do NOT modify Sections 2, 6, 7, 8, 9, 10, 12, 13, or 14 (the engine code)
```

### Customization Prompt

```
I want to adapt the Advanced Faction Management template for a [SETTING TYPE: e.g., modern corporate / medieval kingdom / sci-fi colony / criminal underworld] scenario.

Please:
1. Rename all stats, resources, and personnel to fit the setting
2. Create 20 buildings/projects that make sense for this setting
3. Design 6 rival factions with appropriate names and relationships
4. Write lore entries for the setting's key locations, organizations, and characters
5. Set up timeline events for a [DURATION]-month campaign
6. Adjust all keyword tables to use vocabulary from this setting
7. Set appropriate starting values in DEFAULT_STATE
```

### Debugging Prompt

```
My faction management template isn't working as expected. Here's the file:

[ATTACH YOUR FILE]

Issues:
- [DESCRIBE PROBLEMS]

Please:
1. Check for syntax errors (missing commas, brackets, mismatched quotes)
2. Verify DEFAULT_STATE digit strings match the schema (correct widths)
3. Verify BUILD_ALIASES map to valid project IDs
4. Verify NATION_TABLE aliases are lowercase
5. Check that stat names in statEffect/popEffect match STAT_NAMES/POP_NAMES exactly
6. Set DEBUG_MODE to true and explain what each section is doing
```

## Safe Component Removal

If you want to permanently remove a system instead of toggling it off, here is what to delete.

**WARNING**: Always make a backup before deleting code.

### Remove Lore Engine
1. Set `LORE_ENGINE: false`
2. Or delete: `LORE_ENTRIES` array, Section 11 (lore activation engine), and the lore application block in Section 12

### Remove Stat Keywords
1. Set `STAT_KEYWORDS: false`
2. Or delete: `STAT_KEYWORDS` object and Section 10c (keyword detection)

### Remove Timeline Events
1. Set `TIMELINE_EVENTS: false`
2. Or delete: `TIMELINE_EVENTS` array and the timeline application block in Section 12

### Remove Diplomacy
1. Set `DIPLOMACY_SYSTEM: false`
2. Or delete: `NATION_TABLE`, `STANCE_NAMES`, `TREATY_NAMES`, `DIPLOMACY_ACTIONS`, Section 10e (passive diplomacy shifts), and diplomacy display in Section 12

### Remove Project System
1. Set `PROJECT_SYSTEM: false`
2. Or delete: `PROJECT_TABLE`, `BUILD_ALIASES`, `UPGRADE_ONLY`, `BASE_ONLY`, and the build/upgrade command handlers in Section 10b

### Remove Resource System
1. Set `RESOURCE_SYSTEM: false`
2. Or delete: `RESOURCE_NAMES`, `RECRUIT_COSTS`, `RESEARCH_ACTIONS`, `MILITARY_ACTIONS`, `MANAGE_ACTIONS`, and the resource generation block in Section 10d

### Critical Sections (NEVER DELETE)

- Section 2: Zero-width encoding/decoding
- Section 6: Context access
- Section 7: State extraction and parsing
- Section 8: Helper functions
- Section 9: Mode detection and command parsing
- Section 13: State injection

## Troubleshooting

### Stats Not Changing

- Verify `STAT_KEYWORDS` contains keywords your players actually use
- Check that stat names in `STAT_KEYWORDS` keys match `STAT_NAMES` exactly
- Enable `DEBUG_MODE: true` to see parsed state values
- Ensure the zero-width state is being found (check debug output for "Extracted state")

### Projects Not Completing

- Days must advance for projects to progress. Check that `TIME_TRACKING: true`
- Verify the day counter is incrementing (check debug output)
- Ensure project slot data is correctly formatted (6 digits per slot)

### Diplomacy Not Working

- Verify faction names in commands match entries in `NATION_TABLE` aliases
- Check that `DIPLOMACY_SYSTEM: true` in FEATURES
- Ensure the diplomacy string is 12 digits (6 factions x 2 digits)

### Lore Not Activating

- Check keyword spelling (keywords are matched case-insensitively)
- Verify `LORE_ENGINE: true`
- Check `minMessages` isn't set too high for early-game entries
- Enable `DEBUG_MODE: true` to see which entries activate

### State Not Persisting

- The AI must reproduce the hidden characters faithfully. Verify your character card includes reproduction instructions.
- Check that `SEARCH_DEPTH` (default 15) is sufficient. If conversations are long, increase it.
- Look at debug output for "Extracted state" -- if it says "NONE", the AI is not reproducing the state.

### Too Many Commands at Once

The template processes all `/command` patterns in a single message. If a player types multiple commands, all are processed. This is by design, but if it causes issues:

- The `/help` output lists all available commands for player reference
- Error messages are collected separately from results for clarity

### Script Not Loading

- Run a JavaScript syntax validator (`node -c filename.js` if Node.js is available)
- Check for missing commas, brackets, or quotes in data tables
- Verify the `FEATURES` object syntax is correct
- Ensure no essential code sections were deleted

---

**Created for the Janitor AI Scripts community. Modify, share, and improve upon this system freely.**
