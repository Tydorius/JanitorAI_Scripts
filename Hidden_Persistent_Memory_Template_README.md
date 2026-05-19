# Hidden Persistent Memory Template

This is a very large script. It is intended to be used as an example, so that it can be broken up into other Scripts.

Because it is an example, it has not been fully tested. The use of zero-width characters was tested, as well as the ability for them to persist in last_messages.

Much of the logic here has been taken from my previous Scripts and adapted using an LLM to make it utilize the zero-width method for data retention.

Mileage will vary based upon the model. If your audience is non-proxy users you will want to be careful about how much context you feed back to the model as you will need to ensure you have space for both the Script specific instructions AND the actual content.

A Janitor AI Scripts template that uses zero-width unicode characters for invisible state persistence between Script instances. Tracks weather, location, emotional state, inventory, schedule, and character presence without any visible markers in the chat.

## What This Template Does

The Hidden Persistent Memory template replaces visible flag strings (like `**FLAGS:** XX:XX:XX`) with invisible zero-width unicode characters embedded in the AI's output. State data passes between Script cycles without breaking user immersion.

This is the successor to the Persistent Flags Lorebook Template. Where that template uses visible hex strings that the user can see (and potentially cheat), this template encodes all state information invisibly.

### Key Features

- **Invisible State Tracking**: Zero-width unicode characters encode data without visible markers
- **Modular Components**: Each tracking system (weather, location, emotions, etc.) can be used independently
- **Scene Shift Detection**: Keyword-weighted analysis detects potential location changes and asks the LLM to evaluate
- **Emotion Bitmask**: 16-bit bitmask tracks 8 emotion axes at 4 intensity levels each
- **Character Presence**: Tracks which characters are in the scene with arrival/departure evaluation
- **Token Budget Management**: Automatically reduces detail levels (Full > Summary > Bullet) when context is tight
- **Natural Emotion Decay**: Emotions gradually diminish over time without reinforcement
- **ES6 Enabled**: Requires `"use worker"` directive for modern JavaScript support

### Comparison to Persistent Flags

| Feature | Persistent Flags | Hidden Persistent Memory |
|---------|-----------------|------------------------|
| State visibility | Visible hex string | Invisible unicode |
| State format | `**FLAGS:** 00:1A:FF` | Zero-width characters |
| Tracking types | Single flag chain | Multiple categories |
| Anti-cheat needed | Yes | Not applicable |
| Token overhead | Moderate (instructions + hex) | Low (encoded string only) |
| User can edit state | Yes (copy/paste) | No (invisible) |
| Modularity | Monolithic | Component-based |

## How It Works

### Zero-Width Encoding

The system maps decimal digits (0-9) to zero-width unicode characters:

| Digit | Character | Unicode |
|-------|-----------|---------|
| 0 | Zero-Width Space | U+200B |
| 1 | Zero-Width Non-Joiner | U+200C |
| 2 | Zero-Width Joiner | U+200D |
| 3 | Zero-Width No-Break Space | U+FEFF |
| 4 | Word Joiner | U+2060 |
| 5 | Function Application | U+2061 |
| 6 | Invisible Times | U+2062 |
| 7 | Invisible Separator | U+2063 |
| 8 | Left-to-Right Mark | U+200E |
| 9 | Right-to-Left Mark | U+200F |

State data is encoded as a decimal string, then each digit is replaced with its corresponding zero-width character. The encoded block is wrapped in header/footer markers (ZWJ ZWJ) for reliable extraction.

### State String Format

The state is organized as pipe-delimited category segments:

```
CATEGORY_ID + DATA | CATEGORY_ID + DATA | ...
```

Example state string (decimal, before encoding):

```
0102|0205|0314820|0400010010|05015|0601010
```

| Segment | Category | Value | Meaning |
|---------|----------|-------|---------|
| `0102` | Weather (01) | Index 02 | Raining |
| `0205` | Location (02) | Index 05 | Dungeon |
| `0314820` | Emotion (03) | 14820 | Specific emotion bitmask |
| `0400010010` | Inventory (04) | Bitfield | Items at positions 4, 8 owned |
| `05015` | Schedule (05) | Day 015 | Day 15 |
| `0601010` | Characters (06) | Bitfield | Characters 2 and 4 present |

### Execution Cycle

1. Script scans the last 10 messages for encoded state blocks
2. Decodes the most recent valid state found
3. Parses into category segments
4. Each active component processes its segment:
   - Checks lastMessage for relevant keywords
   - Updates state based on triggers
   - Builds context output at appropriate detail level
5. Re-encodes updated state
6. Appends instruction for LLM to reproduce encoded string
7. LLM copies invisible string at start and end of its response
8. Cycle repeats

## Components

### Weather Tracking

**Category ID**: `01`
**Detail method**: Flat (no tiering - minimal context)

Tracks current weather as an index into a predefined table. Weather changes when keywords are detected in the user's message.

Default table (modify for your scenario):

| Index | Weather | Keywords |
|-------|---------|----------|
| 00 | Clear | clear sky, sunny, sunlight |
| 01 | Cloudy | cloudy, overcast, gray sky |
| 02 | Rain | rain, raining, downpour |
| 03 | Storm | storm, thunder, lightning |
| 04 | Snow | snow, snowing, blizzard |
| 05 | Fog | fog, mist, haze |
| 06 | Windy | wind, windy, gale |
| 07 | Hail | hail, hailstorm |
| 08 | Heatwave | heatwave, scorching, sweltering |
| 09 | Eclipse | eclipse, darkened sky, black sun |

**Output**: Single sentence injected into scenario context.

### Location Tracking

**Category ID**: `02`
**Detail method**: Summary (Full / Summary / Bullet)

Tracks current location with three detail levels. Includes scene shift detection using keyword weights.

**Scene Shift Detection**:

When the user's message contains keywords that suggest travel (e.g., "walk", "go to", "head to"), the system scores potential destination locations based on keyword matches. If a candidate exceeds the weight threshold, the script injects an evaluation prompt asking the LLM to determine if a scene change actually occurred.

The LLM evaluates the context and either confirms the shift (updating location) or rejects it (remaining at current location).

**Default locations**: Tavern, Forest, Castle, Market, Dungeon

### Emotional State

**Category ID**: `03`
**Detail method**: Ranked information (highest intensity first)

Tracks 8 emotion axes using a 16-bit bitmask (2 bits per emotion):

| Bits | Emotion | Triggers |
|------|---------|----------|
| 0-1 | Affectionate | praise, compliment, kind, gentle |
| 2-3 | Frustrated | reject, insult, refuse, deny |
| 4-5 | Anxious | danger, threat, risk, afraid |
| 6-7 | Romantic | flirt, kiss, hold hands, embrace |
| 8-9 | Playful | joke, tease, laugh, grin |
| 10-11 | Dominant | command, order, control, submit |
| 12-13 | Trust | confide, trust, share, honest |
| 14-15 | Intimacy | close, intimate, vulnerable |

**Intensity levels**: 00=off, 01=low, 10=medium, 11=high

**Natural decay**: When no emotion triggers are detected in a cycle, all active emotions decrease by one intensity level. This prevents emotions from staying at high intensity indefinitely.

**Processing**:
1. Decode decimal value to 16-bit binary
2. Extract 2-bit values for each axis
3. Scan for trigger keywords in user message
4. Increment matching axes (max: 11)
5. Apply decay if no triggers found
6. Re-encode to decimal
7. Inject personality modifiers for active emotions, highest intensity first

### Inventory

**Category ID**: `04`
**Detail method**: Summary (Full / Summary / Bullet)

Tracks item ownership as a bitfield (one digit per item: 0=unowned, 1=owned). Supports weapons, consumables, construction materials, resources, currency, and accessories.

**Kingdom-building support**: The default table includes construction items (castle blueprints, iron ingots, stone blocks, timber) suitable for building scenarios.

**Acquisition keywords**: pick up, take, find, receive, acquire, buy, craft, build, gather

**Removal keywords**: drop, discard, lose, use up, consume, spend, sell, trade

**Default items** (8 slots):

| Index | Item | Category |
|-------|------|----------|
| 0 | Iron Sword | weapon |
| 1 | Healing Potion | consumable |
| 2 | Castle Blueprint | construction |
| 3 | Iron Ingots | resource |
| 4 | Stone Blocks | construction |
| 5 | Timber | construction |
| 6 | Gold Coins | currency |
| 7 | Magic Amulet | accessory |

### Schedule/Time

**Category ID**: `05`
**Detail method**: Ranked information (current day + triggered events)

Tracks a day counter (1-999) and triggers scheduled events at specific day thresholds.

**Time passage keywords**:

| Keywords | Day increment |
|----------|---------------|
| next day, next morning, wake up, dawn breaks | +1 |
| days later, days pass, a week, several days | +3 |

**Default events**:

| Day | Event |
|-----|-------|
| 1 | Arrival (first day) |
| 7 | Weekly gathering |
| 14 | Supply caravan expected |
| 30 | Monthly reports due |
| 90 | Seasonal changes |

### Character Presence

**Category ID**: `06`
**Detail method**: Summary (Full / Summary / Bullet)

Tracks which characters from a predefined list are present in the current scene. Uses the Multiple Character Template's approach for mention detection with persistent tracking added.

**How it works**:
1. Character presence is stored as a bitfield (1=present, 0=absent)
2. When a character's name is detected in the user's message:
   - If arrival keywords found and character absent: mark as present
   - If departure keywords found and character present: mark as absent
   - If name mentioned without explicit arrival/departure: inject evaluation prompt
3. Present characters get full personality and dialog context injected
4. Mentioned-but-absent characters get an evaluation instruction asking the LLM to determine if they should enter

**Arrival keywords**: arrives, enters, walks in, comes in, approaches

**Departure keywords**: leaves, exits, walks away, departs, heads out

**Default characters**: Alex, Maya, Jordan, Sam, Riley, Casey (6 slots)

## Configuration

### Feature Toggles

Enable or disable components independently:

```javascript
const FEATURES = {
    CORE_ENCODING: true,         // Always keep true
    WEATHER_TRACKING: true,      // Weather component
    LOCATION_TRACKING: true,     // Location + scene shifts
    EMOTION_TRACKING: true,      // Emotion bitmask
    INVENTORY_TRACKING: true,    // Item ownership
    SCHEDULE_TRACKING: true,     // Day counter + events
    CHARACTER_TRACKING: true,    // Multi-character presence
    SCENE_SHIFT_DETECTION: true, // Location change evaluation
    EMOTION_DECAY: true,         // Natural emotion reduction
    TOKEN_MANAGEMENT: true,      // Auto detail reduction
    DEBUG_MODE: false            // Show encoded state info
};
```

### Token Budget

```javascript
const CONFIG = {
    MAX_SCENARIO_CHARS: 600,       // Total scenario addition budget
    MAX_PERSONALITY_CHARS: 400,    // Total personality addition budget
    SEARCH_DEPTH: 10,              // Messages to scan for state
    SCENE_SHIFT_THRESHOLD: 4,      // Weight needed to trigger shift eval
    EMOTION_DECAY_RATE: 1          // Steps emotions decay per cycle
};
```

### Default State

Set starting conditions for each component:

```javascript
const DEFAULT_STATE = {
    '01': '00',        // Weather: clear
    '02': '00',        // Location: first entry
    '03': '00000',     // Emotion: all off
    '04': '00000000',  // Inventory: empty
    '05': '001',       // Schedule: day 1
    '06': '000000'     // Characters: all absent
};
```

## Quick Start

### Minimal Setup (Weather Only)

1. Copy the full template into a Script lorebook entry
2. Disable all components except CORE_ENCODING and WEATHER_TRACKING
3. Modify `WEATHER_TABLE` with your scenario's weather conditions
4. Set the default weather index in `DEFAULT_STATE`
5. Test by mentioning weather keywords in chat

### Using Multiple Components

1. Enable the components you need in `FEATURES`
2. Modify each component's data table for your scenario
3. Adjust `DEFAULT_STATE` to match your starting conditions
4. Set `CONFIG.MAX_SCENARIO_CHARS` and `CONFIG.MAX_PERSONALITY_CHARS` based on your token limits
5. Enable `DEBUG_MODE: true` to verify state is encoding/decoding correctly
6. Test each component independently before combining

### Copy/Paste Isolation

Each component section is clearly marked with `// === COMPONENT: NAME ===` comments. To isolate a component:

1. Always include the three CORE sections (encoding, extraction, injection)
2. Include the desired COMPONENT section
3. Include the corresponding output section in OUTPUT ASSEMBLY
4. Remove entries for unused components from `DEFAULT_STATE`
5. Remove unused component processing from `buildStateString()`
6. Remove unused component output from the OUTPUT ASSEMBLY section

## Component Data Tables

### Customizing Weather

Replace the `WEATHER_TABLE` array entries:

```javascript
{ id: 'clear', keywords: ['clear sky', 'sunny'], description: 'The sky is clear and bright.' }
```

- `id`: Internal identifier
- `keywords`: Triggers weather change when detected in user message
- `description`: Text injected into scenario context

### Customizing Locations

Replace the `LOCATION_TABLE` array entries. Each location needs three detail tiers:

```javascript
{
    id: 'tavern',
    keywords: ['tavern', 'bar', 'inn'],
    full: {
        scenario: ' Detailed location description...',
        personality: ', personality trait related to location'
    },
    summary: {
        scenario: ' Shorter description...',
        personality: ', shorter trait'
    },
    bullet: {
        scenario: ' Location: name. Key features.',
        personality: ', brief trait'
    }
}
```

### Customizing Emotions

Modify `EMOTION_AXES` to change which emotions are tracked:

```javascript
{ name: 'affectionate', triggers: ['praise', 'compliment', 'kind'] }
```

Modify `EMOTION_TEMPLATES` to change personality output for each emotion at each intensity:

```javascript
affectionate: {
    low: { personality: ', slightly warm in demeanor' },
    medium: { personality: ', noticeably affectionate' },
    high: { personality: ', deeply affectionate' }
}
```

### Customizing Inventory

Replace the `INVENTORY_TABLE` entries. Each item needs three detail tiers:

```javascript
{
    id: 'iron_sword',
    keywords: ['sword', 'iron sword', 'blade'],
    category: 'weapon',
    full: { scenario: '...', personality: '...' },
    summary: { scenario: '...', personality: '...' },
    bullet: { scenario: '...', personality: '...' }
}
```

Update `DEFAULT_STATE[CATEGORY.INVENTORY]` to match the number of items (one digit per item).

### Customizing Schedule

Modify `SCHEDULE_EVENTS` for your timeline:

```javascript
{ day: 7, id: 'weekly_gathering', description: 'The village holds its weekly market.' }
```

Adjust `TIME_KEYWORDS` for your time passage detection needs.

### Customizing Characters

Replace `CHARACTER_TABLE` entries:

```javascript
{
    id: 'alex',
    name: 'Alex',
    aliases: ['alexander', 'alec'],
    departureKeywords: ['leaves', 'exits', 'walks away'],
    arrivalKeywords: ['arrives', 'enters', 'walks in'],
    full: {
        scenario: "Alex was mentioned...",
        personality: "Alex personality traits...",
        example_dialogs: "<BEGIN 'Alex' EXAMPLE DIALOGS>...<END>"
    },
    summary: { scenario: "...", personality: "...", example_dialogs: "" },
    bullet: { scenario: "...", personality: "...", example_dialogs: "" }
}
```

Update `DEFAULT_STATE[CATEGORY.CHARACTER]` to match the number of characters.

## Scene Shift Detection

### How Keyword Weights Work

The system assigns weights to categories of movement-related keywords:

| Category | Weight | Example Keywords |
|----------|--------|------------------|
| Travel | 3 | walk, go to, head to, leave, arrive |
| Indoor | 2 | step inside, walk in, open the door |
| Outdoor | 2 | step outside, go outside, fresh air |
| Rest | 1 | sit down, settle, stay at |
| Distance | 2 | across, through the, beyond |

Each candidate location also gets +2 weight when its own keywords are matched.

### Tuning the Threshold

`CONFIG.SCENE_SHIFT_THRESHOLD` controls sensitivity:

- **Lower threshold** (2-3): More sensitive, may trigger false positives
- **Default** (4): Balanced detection
- **Higher threshold** (6-8): Only detects explicit travel language

### Shift Evaluation

When a potential shift is detected, the script does NOT immediately change the location. Instead, it injects an instruction:

```
[SCENE SHIFT EVALUATION] The user may have moved to [location].
Evaluate whether an actual scene change has occurred.
If confirmed, describe the new surroundings naturally.
If not confirmed, remain at the current location.
```

The LLM decides whether the shift is real based on the narrative context.

## Troubleshooting

### State Not Persisting

1. Enable `DEBUG_MODE: true` to see the decoded state
2. Check that the LLM is reproducing the encoded string (look for `[PERSISTENT MEMORY]` in debug output)
3. Verify `SEARCH_DEPTH` is sufficient (default 10 messages)
4. Check that the state string format is valid (decimal digits and pipe delimiters only)

### LLM Not Reproducing State

The LLM sometimes fails to copy zero-width characters exactly. The script handles this by falling back to `DEFAULT_STATE`. To improve compliance:

- Keep the `[PERSISTENT MEMORY]` instruction block short and clear
- Ensure the instruction appears at the end of scenario context
- Avoid overloading the LLM with too many simultaneous instructions

### Too Much Context Being Injected

1. Enable `TOKEN_MANAGEMENT` and reduce `MAX_SCENARIO_CHARS` / `MAX_PERSONALITY_CHARS`
2. Components will automatically drop from Full to Summary to Bullet detail
3. Consider disabling components you don't need
4. Shorten the text in your data table entries

### Emotions Not Changing

1. Check that your trigger keywords are in the user's message (lowercase matching)
2. Verify the emotion axes are correctly indexed (0-7 for 8 axes)
3. Remember that emotions are encoded as a single decimal number - the 16-bit structure means each axis can only go up to 3 (binary 11)
4. Emotions decay naturally each cycle when no triggers fire

### Location Not Shifting

1. Lower `SCENE_SHIFT_THRESHOLD` to make detection more sensitive
2. Ensure the location keywords in `LOCATION_TABLE` match how users describe places
3. Remember that scene shifts require the LLM to confirm - the script only suggests a potential shift
4. Check that the target location exists in the table

### Characters Not Appearing

1. Verify the character's name or aliases appear in the user's message
2. Check if arrival keywords are present (arrives, enters, walks in)
3. Characters mentioned without arrival keywords get an evaluation prompt, but the LLM decides if they enter
4. Check `DEFAULT_STATE[CATEGORY.CHARACTER]` - characters start absent by default

## Known Limitations

1. **Platform portability**: Copying AI text to other platforms may strip zero-width characters
2. **Model compliance**: LLMs occasionally fail to reproduce exact zero-width strings; the script falls back to defaults gracefully
3. **No manual state editing**: Users cannot see or modify state like they could with visible hex flags
4. **Debugging difficulty**: Invisible state requires DEBUG_MODE to troubleshoot
5. **Character limits**: Each component adds encoding overhead; very complex scenarios should limit active components

## Adding Custom Components

To add a new tracking component:

1. Define a new `CATEGORY_ID` (2-digit string, e.g., `'07'`)
2. Add a default value to `DEFAULT_STATE`
3. Create a data table and processing section under a `// === COMPONENT: NAME ===` comment
4. Add state encoding in `buildStateString()`
5. Add output logic in the OUTPUT ASSEMBLY section
6. Add a feature toggle in `FEATURES`

## File Location

- Template: [Hidden_Persistent_Memory_Template.js](https://github.com/Tydorius/JanitorAI_Scripts/blob/main/Templates/Hidden_Persistent_Memory_Template.js)
- Author: [Tydorius on JanitorAI](https://janitorai.com/profiles/0f618e4a-4d83-49da-969b-aba188761259_profile-of-tydorius)
- Support: [Ko-fi](https://ko-fi.com/tydorius)
