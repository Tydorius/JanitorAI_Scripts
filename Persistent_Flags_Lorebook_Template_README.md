# Persistent Flags Lorebook Template

A Janitor AI Scripts template that uses hexadecimal flag strings to track persistent state across roleplay sessions. Flags represent discrete states that control which lore context is active.

## What This Template Does

The Persistent Flags template provides a hex-based flag system for tracking story progression and maintaining state across sessions. Unlike stat-based systems that track continuous values, this system uses discrete flag states that activate and deactivate context based on narrative progression.

### Key Features

- **Hexadecimal Flag Strings**: Track state using colon-separated hex values (e.g., `00:1A:FF`)
- **Dynamic Context Activation**: Lore comes and goes based on flag state
- **Position Preservation**: Flags maintain their positions across updates
- **Anti-Cheat Validation**: Detects and responds to invalid flag values
- **Progressive Unfolding**: Only relevant context is active at any time
- **Save System Support**: Cross-scenario and session continuity options

## How It Works

### Flag String Format

Flags are stored as a colon-separated hex string at the end of AI responses:

```
**FLAGS:** 00:1A:FF
```

Each hex value represents a different flag position:
- Position 0: `00`
- Position 1: `1A`
- Position 2: `FF`

### Flag Definitions

Each flag definition represents a discrete state:

```javascript
{
    hexValue: '00',
    id: 'missing_wallet',
    description: 'Wallet is missing',
    personality: ', aware their wallet is missing',
    scenario: ' Your wallet containing your driver\'s license is missing.',
    keywords: ['wallet', 'lost wallet', 'missing wallet'],
    flagChangeInstruction: 'If {{user}} has found their wallet, set this flag to 01'
}
```

### Flag Properties

- **hexValue**: The hex value that identifies this flag state
- **id**: Unique identifier for this flag
- **description**: Human-readable description
- **personality**: Personality addition when flag is active
- **scenario**: Scenario addition when flag is active
- **keywords**: Keywords that apply when flag is active
- **flagChangeInstruction**: When to change this flag to next state

### Flag Flow Example

Starting state: `00:00:00`

1. **Position 0 (00) active**: "Wallet is missing"
   - Keywords: wallet, lost wallet, missing wallet
   - Instruction: If found wallet, change to 01

2. **User finds wallet**: LLM sets `01:00:00`
   - Position 0 (01) active: "Wallet found"
   - Keywords: license, id card, identification
   - "wallet" keywords no longer active
   - Instruction: If found license, change to 05

3. **User finds license**: LLM sets `01:00:05`
   - Position 0 (01) active: "Wallet found"
   - Position 2 (05) active: "License found"
   - "license" keywords no longer active
   - Instruction: If filed police report, change to 13

## Installation and Setup

### Step 1: Define Your Flags

Replace the example flag definitions in the template with your own:

```javascript
const flagDefinitions = [
    {
        hexValue: '00',
        id: 'story_start',
        description: 'Story beginning',
        personality: ', at the start of their journey',
        scenario: ' Your adventure begins here.',
        keywords: ['start', 'beginning', 'first'],
        flagChangeInstruction: 'If {{user}} has completed the first task, set this flag to 01'
    },
    {
        hexValue: '01',
        id: 'first_task_complete',
        description: 'First task completed',
        personality: ', having completed the first task',
        scenario: ' You have successfully completed the first task.',
        keywords: ['quest', 'mission', 'objective'],
        flagChangeInstruction: 'If {{user}} has reached the destination, set this flag to 05'
    }
];
```

### Step 2: Configure Anti-Cheat

Choose an anti-cheat mode:

```javascript
const ANTI_CHEAT_MODE = 'OOC_WARNING'; // or 'COMICAL', 'SEVERE'
```

Options:
- `OOC_WARNING`: Direct out-of-character warning (default)
- `COMICAL`: In-universe humorous consequence
- `SEVERE`: Major in-universe disruption

### Step 3: Test Flag Flow

Start a conversation with the character and verify:
1. Initial state defaults to all `00` flags
2. LLM includes flag string in responses
3. Flag changes activate appropriate context
4. Keywords update based on flag state

## Usage Guide

### Creating Flag States

Each flag state should represent a meaningful progression point:

1. **Start with `00`**: Initial state for each flag position
2. **Create progression**: Define logical flag changes (00 → 01 → 05 → FF)
3. **Space values** (optional): Use non-sequential hex values (05, 13, 1A) to make flag guessing harder

Example flag progression:

```javascript
{ hexValue: '00', id: 'quest_not_started', ... }
{ hexValue: '01', id: 'quest_accepted', ... }
{ hexValue: '05', id: 'first_objective_complete', ... }
{ hexValue: '13', id: 'all_objectives_complete', ... }
{ hexValue: 'FF', id: 'quest_finished', ... }
```

### Writing Flag Change Instructions

Flag change instructions tell the LLM when to advance to the next state:

```javascript
flagChangeInstruction: 'If {{user}} has completed the first task, set this flag to 01'
```

Guidelines:
- Be specific about conditions
- Use clear language
- Reference story elements
- Include the target hex value

### Designing Keywords

Keywords are only active when their flag state is active:

```javascript
keywords: ['wallet', 'lost wallet', 'missing wallet']
```

Best practices:
- Use specific phrases
- Include variations
- Consider context
- Update with flag progression

### Using Feature Toggles

Enable or disable components:

```javascript
const FEATURES = {
    FLAG_SYSTEM: true,           // Core flag tracking
    ANTI_CHEAT: true,            // Validate flag values
    DYNAMIC_INSTRUCTIONS: true,  // Generate LLM guidance
    DEBUG_MODE: false            // Show flag parsing info
};
```

## Save Systems

This template supports two save system approaches for maintaining state across sessions or scenarios.

### Cross-Scenario Save Game

Users can copy their flag string and paste it into a different bot/character to carry over story state. This allows:

- **Multi-character scenarios**: Continue a story across different characters
- **Time jumps**: Move to a different time period while maintaining state
- **Spin-off scenarios**: Create related stories that reference previous events
- **Shared universe**: Multiple bots operating in the same world

**How to use:**

1. Copy the flag string from the current character: `**FLAGS:** 01:05:FF`
2. Paste it into the new character's first message
3. The new character reads the flag string and activates appropriate context
4. Story continuity is maintained across characters

**Example use case:**

A user completes a mystery investigation with Detective Bot A, ending with flag state `01:05:FF`. They then switch to Lawyer Bot B to handle the legal proceedings. By pasting the flag string into the first message with Lawyer Bot B, the lawyer knows which evidence was found, which suspects were interviewed, and which crimes were proven.

### Session Continuity

When a chat fills the context window, users can copy their flag string and paste it into a new session along with a summary of important events. This allows:

- **Continuing long stories**: Continue stories beyond context limits
- **Refreshing context**: Start fresh with updated state
- **Selective summary**: Choose which events to summarize
- **State preservation**: Maintain all flag states across sessions

**How to use:**

1. Copy the flag string from the current session: `**FLAGS:** 05:13:1A`
2. Create a summary of important events and plot points
3. Start a new session with the same character
4. Include both the flag string and summary in the first message
5. The character activates context based on flags and incorporates the summary

**Example use case:**

After 100 messages of an epic adventure, the context window is filling up. The user copies the flag string `**FLAGS:** 0A:FF:13:05:00` which shows they've completed 7 quests, found 3 artifacts, defeated 2 bosses, and are at a specific location. They write a brief summary of the overall plot and key victories, then start a new session. The flag string immediately activates all the appropriate context, while the summary refreshes the narrative flow.

## Anti-Cheat System

The anti-cheat system validates all flag values and responds to invalid states.

### Validation Process

1. Parse flag string from AI response
2. Check each hex value against allowed values
3. Verify hex format is correct (pairs of characters)
4. Trigger anti-cheat response if validation fails

### Anti-Cheat Modes

#### OOC_WARNING (Default)

```
[OOC: Invalid flag detected. Please roll back and use valid responses only.]
```

Best for: Most scenarios, serious roleplay

#### COMICAL

```
Suddenly, without warning, you suffer a violent bout of diarrhea.
```

Best for: Light-hearted scenarios, comedic roleplay

#### SEVERE

```
The world seems to freeze around you as reality rejects this invalid state.
[OOC: Please reset to a valid flag state.]
```

Best for: High-stakes scenarios, serious consequences

### Flag Spacing for Anti-Cheating

Use non-sequential hex values to make flag guessing harder:

```javascript
{ hexValue: '00', id: 'start', ... }
{ hexValue: '05', id: 'midpoint', ... }  // Not 01, 02, 03, 04
{ hexValue: '13', id: 'near_end', ... }  // Spaced out
{ hexValue: 'A1', id: 'end', ... }       // Using letters
```

**Trade-offs:**

Advantages:
- More difficult to guess flag values
- Can create narrative significance (e.g., FF for "finished")
- Adds complexity for users attempting to game the system

Disadvantages:
- Less intuitive for debugging
- More complex to manage
- Harder to remember progression

**Recommendation:**
Start with sequential values (00, 01, 02) for clarity. Add spacing only if anti-cheat is a genuine concern.

## Debugging

### Enable Debug Mode

```javascript
const FEATURES = {
    DEBUG_MODE: true
};
```

Debug output shows:

```
[DEBUG FLAGS]
Current state: 01:05:FF
Expected count: 5
Valid values: 00, 01, 05, 13, FF
Extracted from response: 01:05:FF
```

### Common Issues

#### Flags Not Updating

- Check that LLM is including flag string in responses
- Verify flag change instructions are clear
- Ensure flag string format is correct: `**FLAGS:** XX:XX:XX`

#### Wrong Context Activating

- Verify hex values in flag definitions
- Check that flag positions match expected order
- Review which flags are actually active

#### Anti-Cheat Triggering Incorrectly

- Verify all hex values are valid (pairs of characters)
- Check that flag definitions include all used values
- Ensure flag string format matches regex pattern

#### Keywords Not Working

- Verify keywords are only active for current flag state
- Check spelling and case sensitivity
- Ensure keywords are in lowercase when checking

## Best Practices

### Flag Design

1. **Start with sequential values**: Use 00, 01, 02 for clarity
2. **Document flag meanings**: Keep track of what each hex value represents
3. **Consider narrative flow**: Design flags to match story progression
4. **Plan flag transitions**: Think about how states connect
5. **Test flag flows**: Verify each transition works as expected

### Instruction Writing

1. **Be specific**: Clear conditions for flag changes
2. **Use story language**: Reference events, not mechanics
3. **Include target state**: Always specify which hex value to use
4. **Keep it concise**: Long instructions may be ignored
5. **Test with AI**: Verify LLM understands and follows instructions

### Keyword Management

1. **Use specific phrases**: Avoid common words
2. **Include variations**: Account for different ways users might say things
3. **Update with flags**: Keywords come and go with flag states
4. **Test activation**: Verify keywords trigger when expected
5. **Avoid overloading**: Too many keywords can confuse the LLM

### Anti-Cheat Balance

1. **Start with OOC_WARNING**: Default mode is usually sufficient
2. **Match tone to scenario**: COMICAL for comedy, SEVERE for serious stories
3. **Consider user experience**: Don't make anti-cheat too harsh
4. **Document responses**: Users should understand what triggered the response
5. **Test edge cases**: Verify anti-cheat catches actual cheating attempts

## When to Use This Template

### Good Candidates

- **Mystery/Investigation**: Track clue discovery and case progression
- **Quest Systems**: Monitor objective completion and story beats
- **Branching Narratives**: Handle different story paths and outcomes
- **Relationship Tracking**: Track NPC approval and relationship states
- **Inventory Management**: Monitor item acquisition and use
- **Skill Progression**: Track discrete skill upgrades and abilities
- **Achievement Systems**: Unlock content based on accomplishments
- **Save System Support**: Need to carry state across scenarios or sessions

### Poor Candidates

- **Continuous Values**: Health, resources, money (use stat tracking instead)
- **Gradual Progression**: Experience points, skill levels, training
- **Complex Math**: Calculations, probabilities, damage systems
- **Fine-Grained Control**: 0-100 scales, percentages, detailed metrics
- **Real-Time Systems**: Combat rounds, time-sensitive mechanics
- **Simulations**: Economy models, population dynamics, weather

## Comparison to Other Templates

### vs Complex Lorebook Template

**Similarities:**
- Context application to personality and scenario
- Keyword-based activation system
- Feature toggle system

**Differences:**
- **This template**: Discrete flag states (00 → 01 → 05)
- **Complex**: Continuous stat tracking (0-100 scales)
- **This template**: Progressive context unfolding
- **Complex**: Static lore database with activation conditions

### vs Adaptive Lorebook Template

**Similarities:**
- Dynamic context management
- Budget-based activation control

**Differences:**
- **This template**: State-based context (flags control what's active)
- **Adaptive**: Token-budget-based (activation limited by token count)
- **This template**: Discrete state transitions
- **Adaptive**: Continuous detail adjustment (full → summary → bullet)

### vs Progressive Sentence Template

**Similarities:**
- Progressive content reveal
- Priority-based activation

**Differences:**
- **This template**: Flag-driven state determines content
- **Progressive**: Sentence-based allocation within tier budgets
- **This template**: All-or-nothing flag states
- **Progressive**: Granular sentence-level control

## Technical Details

### Flag String Parsing

The script uses regex to extract flag strings:

```javascript
const regex = /\*\*FLAGS:\*\*\s*([0-9A-Fa-f:]+)/;
```

Supported formats:
- `**FLAGS:** 00:1A:FF` (default)
- `**FLAGS:**00:1A:FF` (no space after colon)
- `**FLAGS:** 00: 1A: FF` (spaces after colons)

### Position Mapping

Flag positions are determined by array order:

```javascript
flagDefinitions = [
    { hexValue: '00', ... },  // Position 0
    { hexValue: '01', ... },  // Position 1
    { hexValue: '05', ... }   // Position 2
];
```

Flag string `00:01:05` means:
- Position 0 is 00
- Position 1 is 01
- Position 2 is 05

### Default State

If no flag string exists:
- All flags default to `00`
- First flag in each position is considered the default state
- System generates default string automatically

### Error Handling

- **Invalid hex format**: Triggers anti-cheat
- **Too few flags**: Pads with `00` to expected count
- **Too many flags**: Validates first N, ignores extras
- **Missing flag string**: Uses default state

## Feature Toggles Reference

| Toggle | Default | Effect |
|--------|---------|--------|
| `FLAG_SYSTEM` | true | Core flag tracking (always keep true) |
| `ANTI_CHEAT` | true | Validate flag values against allowed list |
| `DYNAMIC_INSTRUCTIONS` | true | Generate LLM guidance for flag changes |
| `DEBUG_MODE` | false | Show flag parsing and validation info |

To disable a feature:
```javascript
const FEATURES = {
    FLAG_SYSTEM: true,
    ANTI_CHEAT: false,  // Disable anti-cheat
    DYNAMIC_INSTRUCTIONS: true,
    DEBUG_MODE: false
};
```

## Advanced Techniques

### Multi-Flag Dependencies

You can create dependencies between multiple flags:

```javascript
{
    hexValue: '05',
    id: 'boss_unlocked',
    flagChangeInstruction: 'If {{user}} has found the key (position 2 = 13) AND has the weapon (position 3 = 0A), set this flag to FF'
}
```

### Conditional Keywords

Use keywords that only apply under certain conditions:

```javascript
{
    hexValue: '01',
    id: 'quest_active',
    keywords: ['quest', 'mission'],
    flagChangeInstruction: 'If {{user}} mentions "secret passage" AND position 1 = 13, set this flag to 05'
}
```

### Branching Paths

Create multiple valid flag states at the same position:

```javascript
{ hexValue: '05', id: 'path_good', ... }
{ hexValue: '13', id: 'path_neutral', ... }
{ hexValue: '1A', id: 'path_evil', ... }
```

### Hidden Flags

Use flags that don't add context but track internal state:

```javascript
{
    hexValue: 'A1',
    id: 'easter_egg_unlocked',
    personality: '',
    scenario: '',
    keywords: [],
    flagChangeInstruction: 'If {{user}} mentions the secret phrase "shadow moon", set this flag to FF'
}
```

## Troubleshooting

### LLM Not Including Flag String

**Problem**: AI responses don't include the flag string.

**Solutions**:
1. Add flag instructions to character card's personality section
2. Make flag instructions more prominent in scenario
3. Reduce the length of instructions
4. Test with different AI models

### Flag String Wrong Format

**Problem**: Flag string doesn't match expected format.

**Solutions**:
1. Verify format is `**FLAGS:** XX:XX:XX`
2. Check for extra spaces or characters
3. Ensure hex values are uppercase or lowercase consistently
4. Use debug mode to see what's being extracted

### Wrong Context Activating

**Problem**: Context from inactive flags is appearing.

**Solutions**:
1. Verify hex values in flag definitions
2. Check flag order matches flag string positions
3. Review which flags are currently active (debug mode)
4. Ensure only active flags are being applied

### Anti-Cheat Triggering Incorrectly

**Problem**: Valid flag strings trigger anti-cheat.

**Solutions**:
1. Verify all hex values are in flag definitions
2. Check hex format (pairs of characters only)
3. Ensure flag string length matches expected count
4. Review valid values in debug output

## Examples

### Lost Wallet Scenario

Flag definitions track wallet recovery:

```javascript
{ hexValue: '00', description: 'Missing wallet', flagChangeInstruction: 'If found wallet, set to 01' }
{ hexValue: '01', description: 'Wallet found', flagChangeInstruction: 'If found license, set to 05' }
{ hexValue: '05', description: 'License found', flagChangeInstruction: 'If filed report, set to 13' }
{ hexValue: '13', description: 'Report filed', flagChangeInstruction: 'If investigation complete, set to FF' }
{ hexValue: 'FF', description: 'Complete', flagChangeInstruction: 'No further changes' }
```

### Mystery Investigation

Track investigation progression:

```javascript
{ hexValue: '00', description: 'Case opened', flagChangeInstruction: 'If first clue found, set to 01' }
{ hexValue: '01', description: 'First clue found', flagChangeInstruction: 'If suspect identified, set to 05' }
{ hexValue: '05', description: 'Suspect identified', flagChangeInstruction: 'If evidence collected, set to 13' }
{ hexValue: '13', description: 'Evidence collected', flagChangeInstruction: 'If case solved, set to FF' }
{ hexValue: 'FF', description: 'Case solved', flagChangeInstruction: 'No further changes' }
```

### Quest System

Track quest objectives:

```javascript
{ hexValue: '00', description: 'Quest not started', flagChangeInstruction: 'If quest accepted, set to 01' }
{ hexValue: '01', description: 'Quest accepted', flagChangeInstruction: 'If objective 1 complete, set to 05' }
{ hexValue: '05', description: 'Objective 1 complete', flagChangeInstruction: 'If objective 2 complete, set to 13' }
{ hexValue: '13', description: 'Objective 2 complete', flagChangeInstruction: 'If quest complete, set to FF' }
{ hexValue: 'FF', description: 'Quest complete', flagChangeInstruction: 'No further changes' }
```

## Limitations

- **No Continuous Values**: Cannot track numbers like health or money
- **No State Memory**: Flags are reset each execution (must be stored in flag string)
- **LLM Dependency**: Relies on LLM to correctly update flag strings
- **No Conditional Logic**: Cannot create complex if/else relationships within flags
- **No Time Tracking**: Cannot measure duration or time-based events

## Future Enhancements

Potential improvements for future versions:

- **Flag Groups**: Organize flags into logical groups
- **Flag Dependencies**: Explicit dependencies between flags
- **Flag History**: Track flag change history
- **Flag Templates**: Reusable flag patterns
- **Visual Flag Editor**: Interface for designing flag systems
- **Flag Import/Export**: Save and load flag configurations
- **Advanced Validation**: More sophisticated anti-cheat detection

## Support and Resources

For help with this template:

1. Review the debug output to understand flag states
2. Test flag changes with simple scenarios first
3. Check the Complex Lorebook Template for similar patterns
4. Consult Janitor AI Scripts documentation
5. Refer to community examples for inspiration

## Version History

- **v1.0**: Initial release with core flag system, anti-cheat, and save system support

## License

This template is provided as-is for use with Janitor AI Scripts. Modify and distribute freely.
