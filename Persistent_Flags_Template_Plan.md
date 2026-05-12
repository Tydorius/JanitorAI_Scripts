# Persistent Flags Template - Implementation Plan

## Overview

A new Script template that uses hexadecimal flag strings to track persistent state and dynamically control context activation. Flags are parsed from AI responses, validated against expected values, and used to conditionally include lore entries.

## Core Concept

Instead of traditional stat tracking, this system uses a colon-separated hexadecimal string (e.g., `00:1A:FF`) to represent multiple flags. Each flag position corresponds to a piece of lore, and the hex value at that position determines which content is active.

### Example Flag String
- `00:00:00` - All flags in initial state
- `01:00:05` - Flags 0 and 2 have changed
- `1A:FF:0D` - All flags in different states

## Architecture

### 1. Flag Definition Structure

```javascript
const flagDefinitions = [
    {
        hexValue: '00',
        id: 'missing_wallet',
        description: 'Wallet is missing',
        personality: ', aware their wallet is missing',
        scenario: ' Your wallet containing your driver\'s license is missing.',
        keywords: ['wallet', 'lost wallet', 'missing wallet'],
        flagChangeInstruction: 'If {{user}} has found their wallet, set this flag to 01'
    },
    {
        hexValue: '01',
        id: 'found_wallet',
        description: 'Wallet found',
        personality: ', relieved to have their wallet back',
        scenario: ' You have recovered your wallet with your driver\'s license.',
        keywords: ['license', 'id card', 'identification'],
        flagChangeInstruction: 'If {{user}} has found their license, set this flag to 05'
    }
];
```

**Key Properties:**
- `hexValue`: The flag's hexadecimal value (used for identification)
- `id`: Unique identifier for the flag
- `description`: Human-readable description
- `personality`: Personality addition when flag is active
- `scenario`: Scenario addition when flag is active
- `keywords`: Keywords that only apply when this flag is active
- `flagChangeInstruction`: Instruction for LLM on when to change this flag

### 2. Flag Parsing and Validation

```javascript
function parseFlags(flagString) {
    const parts = flagString.split(':');
    const flags = parts.map(part => part.toUpperCase());
    const expectedLength = getExpectedFlagCount();
    const validFlags = getValidFlagValues();

    // Anti-cheat validation
    flags.forEach((flag, index) => {
        if (!validFlags.includes(flag)) {
            triggerAntiCheat(index, flag);
        }
    });

    return flags;
}

function getExpectedFlagCount() {
    // Count unique flag positions (determined by position in flagDefinitions array)
    // Automatically adjusts based on number of entries
    return flagDefinitions.length;
}
```

**Validation Logic:**
1. Split flag string by colon
2. Convert to uppercase for case-insensitive comparison
3. Check each flag against valid values
4. Trigger anti-cheat if invalid flag found
5. Return parsed flag array

### 3. Anti-Cheat System

```javascript
const ANTI_CHEAT_MODE = 'OOC_WARNING'; // or 'COMICAL', 'SEVERE'

const antiCheatResponses = {
    OOC_WARNING: {
        scenario: ' [OOC: Invalid flag detected. Please roll back and use valid responses only.]',
        personality: ''
    },
    COMICAL: {
        scenario: ' Suddenly, without warning, you suffer a violent bout of diarrhea.',
        personality: ', experiencing intestinal distress'
    },
    SEVERE: {
        scenario: ' The world seems to freeze around you as reality rejects this invalid state. [OOC: Please reset to a valid flag state.]',
        personality: ''
    }
};

function triggerAntiCheat(flagIndex, invalidFlag) {
    const response = antiCheatResponses[ANTI_CHEAT_MODE];
    context.character.scenario += response.scenario;
    if (response.personality) {
        context.character.personality += response.personality;
    }
}
```

**Anti-Cheat Modes:**
- `OOC_WARNING`: Direct out-of-character warning (default)
- `COMICAL`: In-universe humorous consequence
- `SEVERE`: Major in-universe disruption

### 4. Dynamic Flag Instructions

The system generates instructions for the LLM based on current flag state:

```javascript
function generateFlagInstructions(currentFlags) {
    const instructions = [];

    flagDefinitions.forEach((definition, index) => {
        const currentFlag = currentFlags[index] || '00';

        // Only include flag change instructions for flags currently active
        if (currentFlag === definition.hexValue) {
            if (definition.flagChangeInstruction) {
                instructions.push(`[Flag ${index} (${currentFlag})]: ${definition.flagChangeInstruction}`);
            }

            // Include keywords that are only relevant when this flag is active
            if (definition.keywords.length > 0) {
                instructions.push(`[Flag ${index} active]: Monitor these keywords: ${definition.keywords.join(', ')}`);
            }
        }
    });

    return instructions.join('\n');
}
```

**How It Works:**
1. Iterate through all flag definitions
2. Check if flag is currently active (hex value matches)
3. Include flag change instruction if present
4. Include keyword monitoring instructions
5. Only active flags generate instructions

### 5. Flag Lore Application

```javascript
function applyFlagLore(currentFlags) {
    flagDefinitions.forEach((definition, index) => {
        const currentFlag = currentFlags[index];

        if (currentFlag === definition.hexValue) {
            // Apply personality
            if (definition.personality) {
                if (!context.character.personality.includes(definition.personality)) {
                    context.character.personality += definition.personality;
                }
            }

            // Apply scenario
            if (definition.scenario) {
                if (!context.character.scenario.includes(definition.scenario)) {
                    context.character.scenario += definition.scenario;
                }
            }
        }
    });
}
```

**Key Features:**
- Only active flags (matching hex values) are applied
- Prevents duplicate additions
- Maintains flag order (position in array = position in string)

### 6. LLM Flag Setting Instructions

The system provides clear instructions to the LLM for setting flags:

```
[FLAG MANAGEMENT INSTRUCTIONS]

You must maintain a flag string at the end of your responses in this format:
**FLAGS:** 00:1A:FF

Rules:
1. Always maintain the same number of flag positions (3 in this example)
2. Only change flag values that are currently active (check the active flag instructions below)
3. Preserve positions - do NOT append new flags to the end
4. Only use valid flag values (00, 01, 05, 1A, FF, etc.)
5. Format exactly as shown: **FLAGS:** XX:XX:XX

[ACTIVE FLAG INSTRUCTIONS]
Flag 0 (00): If {{user}} has found their wallet, set this flag to 01
Flag 0 active: Monitor these keywords: wallet, lost wallet, missing wallet
```

**LLM Workflow:**
1. Read current flag string
2. Check which flags are active
3. Review instructions for active flags
4. Evaluate if any flag should change
5. Generate response with updated flag string

## Flag Position System

### How Flag Positions Work

Flags are assigned positions based on their order in the `flagDefinitions` array:

```javascript
flagDefinitions = [
    { hexValue: '00', id: 'missing_wallet', ... },  // Position 0
    { hexValue: '01', id: 'found_wallet', ... },    // Position 1
    { hexValue: '05', id: 'found_license', ... },   // Position 2
];
```

**Flag String Format:**
- Position 0 → First hex value
- Position 1 → Second hex value
- Position 2 → Third hex value

**Example Evolution:**
```
Initial state:     00:00:00 (all flags in default state)
After wallet found: 01:00:00 (position 0 changed)
After license found: 01:00:05 (position 2 changed, position 0 maintained)
```

### Why This Works

1. **Position Persistence**: Each flag always stays in its assigned position
2. **Clear Mapping**: Position in array = Position in string
3. **Easy Updates**: Change only the flags that need to change
4. **Anti-Cheat**: Invalid positions/values are detected

## Anti-Cheat Mechanism

### Validation Process

1. Parse flag string
2. Check length matches expected count
3. Validate each hex value against allowed values
4. Trigger response if any validation fails

### Allowed Values

The system automatically builds a list of valid hex values from all flag definitions:

```javascript
function getValidFlagValues() {
    const validValues = new Set();
    flagDefinitions.forEach(definition => {
        validValues.add(definition.hexValue.toUpperCase());
    });
    return Array.from(validValues);
}
```

### Flag Spacing for Anti-Cheating

Users can use non-sequential hex values to make flag guessing harder:

```javascript
{
    hexValue: '05',  // Not 01, 02, 03, 04
    id: 'found_license',
    ...
},
{
    hexValue: '13',  // Spaced out
    id: 'police_contact',
    ...
},
{
    hexValue: 'A1',  // Using letters
    id: 'case_closed',
    ...
}
```

**Trade-offs:**
- ✓ More difficult to guess flag values
- ✓ Can create narrative significance (e.g., FF for "finished")
- ✗ Less intuitive for debugging
- ✗ More complex to manage

**Recommendation:**
Start with sequential values (00, 01, 02) for clarity. Add spacing only if needed.

## Feature Toggles

```javascript
const FEATURES = {
    FLAG_SYSTEM: true,           // Core flag tracking (always keep true)
    ANTI_CHEAT: true,            // Validate flag values
    DYNAMIC_INSTRUCTIONS: true,  // Generate LLM instructions
    DEBUG_MODE: false            // Show flag parsing info
};
```

## Usage Example

### Scenario: Lost Wallet Story

**Flag Definitions:**
```javascript
const flagDefinitions = [
    {
        hexValue: '00',
        id: 'missing_wallet',
        description: 'Wallet is missing',
        personality: ', aware their wallet is missing',
        scenario: ' Your wallet containing your driver\'s license is missing.',
        keywords: ['wallet', 'lost wallet', 'missing wallet'],
        flagChangeInstruction: 'If {{user}} has found their wallet, set this flag to 01'
    },
    {
        hexValue: '01',
        id: 'found_wallet',
        description: 'Wallet found',
        personality: ', relieved to have their wallet back',
        scenario: ' You have recovered your wallet with your driver\'s license.',
        keywords: ['license', 'id card', 'identification'],
        flagChangeInstruction: 'If {{user}} has found their license, set this flag to 05'
    },
    {
        hexValue: '05',
        id: 'found_license',
        description: 'License found',
        personality: ', having their identification secured',
        scenario: ' You have your driver\'s license back in your possession.',
        keywords: ['police', 'report', 'station'],
        flagChangeInstruction: 'If {{user}} has filed a police report, set this flag to 13'
    }
];
```

**Story Flow:**

1. **Start**: `00:00:00`
   - Context: Wallet missing
   - Keywords: wallet, lost wallet, missing wallet
   - Instruction: If found, change to 01

2. **User finds wallet**: LLM sets `01:00:00`
   - Context: Wallet found, license still missing
   - Keywords: license, id card, identification
   - Instruction: If found, change to 05
   - "wallet" keywords no longer active

3. **User finds license**: LLM sets `01:00:05`
   - Context: Wallet and license found
   - Keywords: police, report, station
   - Instruction: If filed report, change to 13
   - "license" keywords no longer active

## Advantages Over Traditional Stats

1. **Discrete States**: Clear state transitions (00 → 01 → 05)
2. **Positional Integrity**: Flags stay in position, no shuffling
3. **Dynamic Context**: Keywords come and go based on state
4. **Anti-Cheat Protection**: Invalid values detected immediately
5. **Progressive Unfolding**: Only relevant context active at any time
6. **LLM Control**: LLM evaluates and updates based on narrative

## Implementation Priority

### Phase 1: Core System
1. Flag definition structure
2. Flag parsing (colon-separated format)
3. Basic validation (hex format only)
4. Flag lore application

### Phase 2: Dynamic System
5. Generate flag instructions for LLM
6. Active flag keyword system
7. Position preservation logic

### Phase 3: Anti-Cheat
8. Valid flag value extraction
9. Anti-cheat detection
10. Multiple anti-cheat modes

### Phase 4: Debugging & Documentation
11. Debug mode for flag tracking
12. Comprehensive documentation
13. Example scenarios
14. README

## Technical Considerations

### Flag String Location

Flags should be at the end of AI responses, similar to stat blocks:

```
[Normal AI response here]

**FLAGS:** 00:1A:FF
```

### Parsing Location

Script should parse from `context.chat.last_message` at the end:

```javascript
function extractFlagsFromResponse(lastResponse) {
    const regex = /\*\\*FLAGS:\*\\*\s*([0-9A-Fa-f:]+)/;
    const match = lastResponse.match(regex);
    if (match && match[1]) {
        return match[1];
    }
    return '00:00:00'; // Default if not found
}
```

### Default State

If no flag string exists:
- Use all flags as `00`
- Assume first flag in definition list is the initial state

### Error Handling

- Invalid hex format: Treat as anti-cheat trigger
- Too few flags: Pad with `00` to expected count
- Too many flags: Validate first N, ignore extras

## Potential Issues & Solutions

### Issue: LLM forgets to include flag string
**Solution**: Include flag management instructions in character card's personality section as well

### Issue: LLM changes wrong flag position
**Solution**: Clear position labeling in instructions (`[Flag 0 (00)]`)

### Issue: LLM uses invalid hex value
**Solution**: Anti-cheat triggers, provide valid list in instructions

### Issue: Context not updating after flag change
**Solution**: Flag changes apply on NEXT message cycle, not current one

## Comparison to Existing Templates

### vs Complex Lorebook Template
- **Similarities**: Context application, keyword-based activation
- **Differences**: Flag-based state vs stat-based thresholds

### vs Adaptive Lorebook Template
- **Similarities**: Dynamic context management
- **Differences**: Discrete flag states vs token budgeting

### vs Progressive Sentence Template
- **Similarities**: Progressive content reveal
- **Differences**: Flag-driven state vs sentence-based allocation

## Use Cases

### Good Candidates:
- Mystery/investigation scenarios (clue discovery)
- Quest systems (objective completion)
- Branching narratives (story progression)
- Relationship tracking (NPC approval levels)
- Inventory management (item acquisition)

### Poor Candidates:
- Continuous values (health, resources)
- Gradual progression (skills, experience)
- Complex math-based systems
- Scenarios needing fine-grained control (0-100 scales)

## Next Steps

1. Create template file structure based on this plan
2. Implement Phase 1 (core system)
3. Create example scenario (lost wallet or similar)
4. Write comprehensive README
5. Test with various LLM responses
6. Document anti-cheat effectiveness
7. Create additional examples

## File Structure

```
Templates/
├── Persistent_Flags_Lorebook_Template.js
└── Persistent_Flags_README.md

Examples/
├── Lost_Wallet_Scenario/
│   ├── scenario_script.js
│   └── worldbuilding.md
└── Mystery_Investigation/
    ├── scenario_script.js
    └── worldbuilding.md
```

## Template Features

- **Feature Toggles**: Enable/disable components
- **Configurable Anti-Cheat**: Choose response style
- **Debug Mode**: Track flag changes and validation
- **Dynamic Instructions**: Auto-generate LLM guidance
- **Positional Integrity**: Maintain flag positions
- **Flexible Hex Values**: Support sequential or spaced values
- **Clear Documentation**: Inline comments and examples

This plan provides a complete roadmap for implementing the Persistent Flags Template while maintaining compatibility with existing Janitor AI Scripts architecture and best practices.
