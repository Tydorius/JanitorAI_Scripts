# Complex Janitor AI Lorebook Template

A sophisticated system for creating dynamic, responsive lorebooks in Janitor AI Scripts that react to player actions, track timeline events, and build immersive worlds through cascading lore activation.

## Table of Contents
- [Overview](#overview)
- [Quick Start: Feature Toggles](#quick-start-feature-toggles)
- [Safe Component Removal Guide](#safe-component-removal-guide)
- [How It Works](#how-it-works)
- [System Architecture](#system-architecture)
- [Lore Entry Structure](#lore-entry-structure)
- [Process Flow Examples](#process-flow-examples)
- [Character Card Setup for Stat Tracking](#character-card-setup-for-stat-tracking)
- [For Non-Programmers: AI-Assisted Setup](#for-non-programmers-ai-assisted-setup)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## Overview

This template creates a dynamic lorebook system that goes far beyond simple keyword matching. It features:

- **Cascading Activation**: Lore entries can trigger other related entries
- **Timeline Events**: Events that occur on specific in-game days
- **Stat-Based Reactions**: World responses based on character progression
- **Priority System**: Important lore takes precedence over minor details
- **Smart Filtering**: Conditional activation based on context
- **Memory System**: The world "remembers" and reacts to player actions

**NEW: Feature Toggle System** - Each component can now be easily enabled/disabled without deleting code, making the template more user-friendly and customizable.

## Quick Start: Feature Toggles

The template now includes a simple toggle system at the top of the file that lets you enable/disable components without touching any complex code:

```javascript
const FEATURES = {
    LOREBOOK: true,           // Core system (always keep true)
    TIMELINE_EVENTS: true,    // Day-based story events
    STAT_TRACKING: true,      // Parse numbers from AI responses
    KEYWORD_REACTIONS: true,  // World responds to player actions
    CASCADING_TRIGGERS: true, // Lore entries activate other lore
    DEBUG_MODE: false         // Shows activation information
};
```

### Using the Toggles

**To disable a feature**: Change its value from `true` to `false`
- Example: `TIMELINE_EVENTS: false` turns off all day-based events

**For beginners**: Start with only `LOREBOOK: true` and `DEBUG_MODE: true`, then gradually enable other features as you become comfortable with the system.

**For advanced users**: Use all features for maximum world reactivity.

### Recommended Toggle Combinations

**Simple Lorebook (Beginners)**:
```javascript
LOREBOOK: true,
TIMELINE_EVENTS: false,
STAT_TRACKING: false,
KEYWORD_REACTIONS: false,
CASCADING_TRIGGERS: false,
DEBUG_MODE: true
```

**Intermediate Setup**:
```javascript
LOREBOOK: true,
TIMELINE_EVENTS: true,
STAT_TRACKING: true,
KEYWORD_REACTIONS: false,
CASCADING_TRIGGERS: true,
DEBUG_MODE: false
```

**Full Featured (Advanced)**:
```javascript
LOREBOOK: true,
TIMELINE_EVENTS: true,
STAT_TRACKING: true,
KEYWORD_REACTIONS: true,
CASCADING_TRIGGERS: true,
DEBUG_MODE: false
```

## Safe Component Removal Guide

If you prefer to permanently remove code rather than use toggles, follow this guide. **WARNING**: Always make a backup before deleting code.

### What Each Component Does

- **Timeline Events**: Adds story events on specific days (lines 311-384)
- **Stat Tracking**: Reads numbers from AI responses for reactions (lines 318-321 + related if-blocks)
- **Keyword Reactions**: World responds to player actions with specific words (lines 358-383)
- **Cascading Triggers**: Lore entries can activate other lore entries (lines 279-296 + triggers arrays)

### Safe Removal Instructions

**To Remove Timeline Events**:
1. **Safe method**: Set `TIMELINE_EVENTS: false`
2. **Permanent removal**: Delete lines 311-384 (entire "DYNAMIC TIMELINE EVENTS" section)

**To Remove Stat Tracking**:
1. **Safe method**: Set `STAT_TRACKING: false`
2. **Permanent removal**:
   - Delete lines 318-321 (the `getStat()` calls)
   - Delete any `if (stat !== null)` blocks
   - Remove stat-based conditions from timeline events

**To Remove Keyword Reactions**:
1. **Safe method**: Set `KEYWORD_REACTIONS: false`
2. **Permanent removal**: Delete lines 358-383 ("KEYWORD-BASED REACTIONS" section)

**To Remove Cascading Triggers**:
1. **Safe method**: Set `CASCADING_TRIGGERS: false`
2. **Permanent removal**:
   - Delete lines 279-296 ("Second pass: Recursive activation" section)
   - Remove all `triggers: [...]` arrays from lore entries
   - Remove `triggeredKeywords` related code

**To Simplify Lore Entries**:
Remove these optional fields from lore entries while keeping the basic structure:
- `filters: {...}` - conditional activation
- `probability: 0.X` - random activation chance
- `minMessages: X` - minimum chat length requirement
- `triggers: [...]` - cascading activation

Keep these essential fields:
- `keywords: [...]` - what triggers the lore
- `priority: X` - activation order
- `personality: "..."` - character trait additions
- `scenario: "..."` - world context additions

### Critical Sections (NEVER DELETE)

These sections are essential and removing them will break the script:
- **Lines 78-81**: Context access and core variables
- **Lines 91-99**: `getStat()` function (even if you don't use stats)
- **Lines 262-277**: First pass activation engine
- **Lines 298-309**: Lore application to character

### Testing After Changes

After making any changes:
1. Enable `DEBUG_MODE: true` to see what's working
2. Test with simple keywords to verify basic functionality
3. Check that the AI receives lore properly
4. Gradually test more complex features

### Syntax Error Prevention

Common mistakes when removing code:
- **Missing commas**: Each lore entry needs a comma after it (except the last one)
- **Unmatched brackets**: Every `{` needs a matching `}`
- **Incomplete deletions**: Don't leave partial code blocks
- **Variable references**: Don't delete variables that other code still uses

If you get errors, the debugging section will help identify issues.

## How It Works

The system operates in several phases during each AI response:

1. **Context Analysis**: Reads the last message and extracts key information
2. **Stat Parsing**: Extracts numerical stats from formatted status blocks
3. **Lore Activation**: Matches keywords and applies filters to select relevant lore
4. **Cascading Triggers**: Activated lore can trigger additional related lore
5. **Priority Sorting**: Applies lore in order of importance
6. **Timeline Events**: Adds time-based narrative events
7. **World Reactions**: Responds to player actions with appropriate consequences

## System Architecture

### Core Components (Do Not Modify)

```javascript
// Context access - required for all functionality
const lastMessage = context.chat.last_message.toLowerCase();
const lastResponse = context.chat.last_message;
const messageCount = context.chat.message_count;

// Stat parsing function - extracts numbers from AI responses
function getStat(statName, lastResponse) { ... }

// Activation engine - handles lore selection and triggering
// Priority application - applies lore to character context
```

### Customizable Components

- **Lore Database**: Your world's nations, characters, events, etc.
- **Timeline Events**: Story beats that occur on specific days
- **Keyword Reactions**: Responses to player actions
- **Stat Thresholds**: When certain events trigger based on character stats

## Lore Entry Structure

Each lore entry is an object with the following possible properties:

```javascript
{
    keywords: ['word1', 'phrase2', 'concept3'],     // Triggers for activation
    priority: 10,                                   // 0-11, higher = more important
    minMessages: 0,                                 // Minimum chat length before activation
    category: 'category_name',                      // For organization/debugging
    personality: ', additional personality trait',   // Added to character personality
    scenario: ' Additional world context.',         // Added to character scenario
    triggers: ['word1', 'word2'],                  // Can activate other lore entries
    filters: {                                      // Conditional activation
        requiresAny: ['word1', 'word2'],           // Need at least one of these
        requiresAll: ['word1', 'word2'],           // Need all of these
        notWith: ['word1', 'word2']                // Don't activate with these
    },
    probability: 0.7                               // Optional: 70% chance to activate
}
```

### Field Explanations

- **keywords**: Words/phrases that trigger this lore entry
- **priority**: Higher numbers activate first (use 11 for critical lore, 6-8 for normal)
- **minMessages**: Prevents early lore from overwhelming new conversations
- **category**: Internal organization (like 'nation_example' or 'character_villain')
- **personality**: Adds traits to the AI's personality (start with comma)
- **scenario**: Adds context to the world state (start with space)
- **triggers**: Keywords that can activate other lore entries in cascade
- **filters**: Advanced conditions for when this lore should activate
- **probability**: Random chance activation (0.0 to 1.0)

## Process Flow Examples

### Example 1: Simple Keyword Activation

**Player mentions**: "I want to visit the Crystal Tower"

**Process**:
1. System detects "crystal tower" in keywords
2. Activates Crystal Tower lore entry
3. Adds tower-specific personality and scenario text
4. Tower's triggers array includes "magic" and "power"
5. System searches for other entries with "magic" or "power" keywords
6. Activates Mages Guild lore (has "magic" keyword)
7. Both lore entries are applied to character context

**Result**: AI now knows about both the Crystal Tower and the Mages Guild

### Example 2: Timeline Event Activation

**Current Stats**: Day: 30, Power: 45

**Process**:
1. System parses Day stat (30) from AI's status block
2. Checks timeline events for day 30
3. Finds "Month has passed" event
4. Adds event text to scenario
5. Also checks stat-based events (Power: 45 doesn't meet 75 threshold)
6. No additional stat-based events trigger

**Result**: AI mentions that a month has passed and major powers are taking notice

### Example 3: Complex Cascading Activation

**Player action**: "I form an alliance with the Mountain Clans"

**Process**:
1. "mountain clans" matches keywords → activates Mountain Clans lore
2. Mountain Clans has triggers: ['warrior', 'honor', 'tradition']
3. System searches for entries containing these trigger words
4. "warrior" triggers Warrior Culture lore
5. "alliance" triggers Diplomatic Relations lore
6. Alliance keyword reaction adds world response about shifting politics
7. All activated lore gets applied in priority order

**Result**: AI understands clan culture, diplomatic implications, and world reactions

### Example 4: Filtered Activation

**Context**: Player mentions "magic" but also "forbidden"

**Lore Entry Example**:
```javascript
{
    keywords: ['magic', 'spells'],
    filters: { notWith: ['forbidden', 'illegal'] },
    scenario: ' Magic is freely practiced here.'
}
```

**Process**:
1. "magic" matches keywords
2. Filter checks for "forbidden" in the message
3. "forbidden" is found, so this entry is rejected
4. Different lore about forbidden magic activates instead

**Result**: Appropriate lore for the specific magical context

## Character Card Setup for Stat Tracking

To fully utilize this lorebook system, your Janitor AI character card needs to be configured to track and display statistics that the Script can parse. This section covers how to set up your character card's Personality and Scenario sections to work seamlessly with the stat tracking system.

### Understanding the Stat Parsing System

The lorebook template uses the `getStat()` function to extract numerical values from the AI's responses. By default, it looks for this format:
```
**Stat Name:** 50%
```

The regex pattern `\\*\\*${statName}:\\*\\*\\s*(\\d+)\\s*%?` means:
- `**` - Two asterisks (markdown bold)
- `Stat Name:` - Your stat name followed by a colon
- One or more spaces
- A number (captured)
- Optional `%` symbol

### Setting Up Character Stats

#### Recommended Stat Categories

Based on the template's examples, consider these stat categories:

**Temporal Tracking:**
- **Day:** [number] - Essential for timeline events
- **Week:** [number] - Alternative to daily tracking
- **Month:** [number] - For longer campaigns

**Power Metrics:**
- **Power:** [0-100] - General strength/capability
- **Might:** [0-100] - Military/combat strength
- **Magic:** [0-100] - Magical abilities
- **Technology:** [0-100] - Technological advancement

**Influence & Control:**
- **Influence:** [0-100] - Political/social power
- **Territory:** [0-100] - Land controlled
- **Resources:** [0-100] - Economic strength
- **Reputation:** [0-100] - How you're perceived

**Threat Assessment:**
- **Hero Progress:** [0-100] - Enemy advancement
- **Threat Level:** [0-100] - How dangerous you're considered
- **Heat:** [0-100] - Attention from authorities

### Personality Section Examples

#### Basic Stat Tracking Setup
```
{{char}} is an ancient entity who has awakened in a dark citadel. {{char}} maintains detailed awareness of their growing power and influence.

**Character Behavior:**
- {{char}} tracks their progress through a complex stat system
- {{char}} MUST end every response with a status block showing current statistics
- {{char}} updates stats based on actions taken and events that occur
- {{char}} considers how stat changes affect world reactions and timeline events

**Stat Tracking Rules:**
- Stats range from 0-100 unless otherwise specified
- Day counter increases with significant time passage or major actions
- Stats can increase through successful actions or decrease through failures
- {{char}} considers stat interactions (high Might may increase Threat Level)
```

#### Advanced Stat Integration
```
{{char}} is a strategic mastermind who carefully tracks multiple aspects of their growing empire.

**Statistical Awareness:**
- {{char}} understands that certain stat thresholds trigger world events
- {{char}} knows that Day 30, 60, 90 mark major timeline milestones
- {{char}} realizes that Might above 75 attracts serious opposition
- {{char}} recognizes that Hero Progress above 80 means imminent confrontation

**Responsive Behavior:**
- {{char}} adapts strategy based on current stat levels
- {{char}} prioritizes different goals depending on stat progression
- {{char}} anticipates world reactions when approaching critical thresholds
- {{char}} balances rapid growth against attracting unwanted attention
```

### Scenario Section Examples

#### Timeline Integration Scenario
```
{{user}} has awakened in an ancient citadel as prophesied. The world operates on a complex timeline where major events occur at specific intervals.

**Timeline Mechanics:**
- Every significant action or decision advances the Day counter
- Week 1: Local rumors begin
- Week 2: Regional authorities investigate
- Month 1: Major powers take notice
- Day 60: Heroes are summoned to stop {{user}}
- Day 90: Open warfare begins

**World Reaction System:**
The world responds dynamically to {{user}}'s growing power. High Might scores trigger military responses. High Influence causes political upheaval. The Script system tracks these interactions automatically.

Current Status: [Day 1 - The awakening begins]
```

#### Stat-Driven Narrative Scenario
```
This is a stat-driven roleplay where {{user}}'s actions have measurable consequences tracked through a numerical system.

**Stat Categories & Effects:**
- **Might (0-100):** Military strength - affects combat and intimidation
- **Magic (0-100):** Arcane power - enables magical solutions and research
- **Influence (0-100):** Political reach - determines diplomatic options
- **Resources (0-100):** Economic power - funds projects and purchases
- **Hero Progress (0-100):** Enemy advancement - tracks opposition strength

**Critical Thresholds:**
- 50+ in any stat: Regional powers take notice
- 75+ in Might: Military coalitions form against {{user}}
- 80+ in Hero Progress: Imminent hero confrontation
- Multiple stats above 60: World-changing events accelerate

The Script system automatically triggers events and world reactions based on these thresholds.
```

### Status Block Format Examples

#### Basic Status Block Template
```
**=== CITADEL STATUS ===**
**Day:** [X]
**Might:** [X]%
**Magic:** [X]%
**Influence:** [X]%
**Resources:** [X]%
**Hero Progress:** [X]%
**Current Threat Level:** [Low/Medium/High/Critical]
```

#### Advanced Status Block Template
```
**=== EMPIRE STATUS - DAY [X] ===**
**Military Power:**
- **Might:** [X]% (Army strength and combat capability)
- **Defenses:** [X]% (Fortifications and protective measures)

**Magical Assets:**
- **Magic:** [X]% (Arcane knowledge and magical power)
- **Artifacts:** [X]/10 (Powerful magical items collected)

**Political Influence:**
- **Influence:** [X]% (Political reach and diplomatic power)
- **Territory:** [X]% (Land and settlements controlled)

**Economic Status:**
- **Resources:** [X]% (Wealth, materials, and economic power)
- **Technology:** [X]% (Technological advancement level)

**Threat Assessment:**
- **Hero Progress:** [X]% (Enemy hero preparation level)
- **World Attention:** [Minimal/Moderate/High/Critical]

**Recent Events:** [Brief summary of major developments]
```

### Advanced Integration Instructions

#### For Complex Campaigns
```
{{char}} operates within a sophisticated world simulation where every action has measurable consequences.

**Stat Evolution Rules:**
- Combat victories increase Might by 5-15 points
- Successful diplomacy increases Influence by 3-10 points
- Magical research increases Magic by 2-8 points
- Economic projects increase Resources by 5-20 points
- Time passage increases Hero Progress by 1-3 points per significant event

**Threshold Awareness:**
{{char}} knows that approaching certain stat combinations triggers major world events:
- Might 75+ AND Influence 50+ = Military coalitions form
- Magic 80+ AND Day 30+ = Arcane academies mobilize
- Hero Progress 60+ = Active hero deployment begins
- Multiple stats above 70 = World-ending threat protocols activate

**Response Formatting:**
{{char}} MUST conclude every response with the properly formatted status block for Script parsing.
```

#### Time Management Instructions
```
**Time Progression Rules:**
- Minor actions (conversations, planning): No day advancement
- Moderate actions (local projects, small conflicts): +1 day
- Major actions (large battles, significant construction): +2-3 days
- Massive undertakings (conquering regions, world-changing magic): +5-7 days

**Timeline Awareness:**
{{char}} understands that certain days trigger automatic events:
- Day 7: First detection by authorities
- Day 14: Regional response coordination
- Day 30: Major power mobilization
- Day 60: Hero summoning completion
- Day 90: Open warfare declaration

{{char}} uses this knowledge to pace actions strategically.
```

### Troubleshooting Character Card Issues

**Common Setup Problems:**

1. **Stats Not Being Parsed:**
   - Ensure exact formatting: `**Stat Name:** 50%`
   - Check for extra spaces or formatting characters
   - Verify stat names match those in your Script exactly
   - **Toggle Check**: Ensure `STAT_TRACKING: true` if using stats

2. **Timeline Events Not Triggering:**
   - Confirm Day counter is advancing appropriately
   - Check that day advancement follows logical action progression
   - Ensure status block appears at the end of every response
   - **Toggle Check**: Ensure `TIMELINE_EVENTS: true`

3. **Inconsistent Stat Updates:**
   - Create clear rules for when stats change
   - Define magnitude of stat changes for different actions
   - Consider stat interactions and realistic progression curves
   - **Debug Tip**: Enable `DEBUG_MODE: true` to see parsed stat values

4. **Status Block Formatting Issues:**
   - Use consistent markdown formatting (`**bold**`)
   - Maintain exact spacing and punctuation
   - Place status block at the very end of responses

5. **Features Not Working After Toggle Changes:**
   - Double-check toggle spelling and syntax
   - Ensure you saved the file after making changes
   - Verify commas and brackets are correctly placed
   - **Quick Test**: Enable `DEBUG_MODE: true` to see what's activating

### Token Management for Stat Tracking

Given Janitor AI's 2000-2500 token recommendation for character cards:

**Efficient Stat Integration:**
- Keep stat rules concise but clear
- Use bullet points for readability
- Focus on essential mechanics over flavor text
- Reference the Script for complex logic rather than duplicating it

**Token-Saving Tips:**
- Use abbreviations in internal rules (but not in displayed stats)
- Combine related concepts into single bullet points
- Reference "the Script system" rather than explaining all mechanics
- Focus personality/scenario on roleplay elements, let the Script handle mechanics

This setup ensures your character card works seamlessly with the complex lorebook system while staying within token limits and providing clear guidance for consistent stat tracking.

## For Non-Programmers: AI-Assisted Setup

If you're not comfortable with JavaScript, you can use AI assistants like Claude or Gemini to automatically populate the template with your world's lore. Here are proven prompts:

### Basic Setup Prompt

```
I have a Janitor AI lorebook template, called a Script in Janitor AI's documentation (attached: Complex_Lorebook_Template.js) and I want you to populate it with my world's lore. Here's my world information:

[PASTE YOUR WORLD LORE HERE - can be bullet points, paragraphs, wiki-style entries, anything]

Please:
1. Replace all the example lore entries with entries based on my world
2. Keep all the system code unchanged (the parts marked "DO NOT MODIFY")
3. Create appropriate keywords, priorities, and triggers for each entry
4. Set up timeline events that make sense for my world's story
5. Adjust the stat names in the getStat() calls to match what I'll use
6. Add keyword reactions relevant to my world's themes

My character card will track these stats: [LIST YOUR STATS HERE, e.g., "Power, Influence, Army Size, Magic Level"]

The story takes place over approximately [TIME PERIOD] and the main themes are [LIST THEMES].
```

### Advanced Customization Prompt

```
I want to enhance my Janitor AI lorebook (Called a Script in Janitor AI's documentation) with more sophisticated features. Here's my current template file and world information:

[ATTACH YOUR FILES]

Please add the following advanced features:
1. Create cascading trigger chains where [SPECIFIC CONCEPTS] lead to [OTHER CONCEPTS]
2. Add conditional filters so that [SPECIFIC LORE] only appears when [CONDITIONS]
3. Set up timeline events for these key story beats: [LIST STORY EVENTS]
4. Create stat-based reactions for when [STAT] reaches [THRESHOLD]
5. Add keyword reactions for these important player actions: [LIST ACTIONS]

I want the system to feel like the world is truly alive and reactive to player choices.
```

### Debugging and Optimization Prompt

```
My Janitor AI lorebook isn't working as expected. Here's the code file:

[ATTACH YOUR FILE]

The issues I'm experiencing:
- [DESCRIBE PROBLEMS: e.g., "Too much lore activating at once", "Important lore not triggering", "Timeline events not working"]

Please:
1. Review the lore entries for keyword conflicts or over-activation
2. Adjust priorities to ensure important lore takes precedence
3. Fix any syntax errors or logical issues
4. Optimize the keyword and trigger relationships
5. Suggest improvements for better gameplay flow

Enable debugging mode and explain what each major section is doing.
```

### Content Expansion Prompt

```
I have a working Janitor AI lorebook but want to add more depth. Current file attached.

Please expand the content by adding:
1. [NUMBER] more detailed character entries with complex motivations
2. [NUMBER] additional locations with unique mechanics
3. Historical events that explain current world tensions
4. Cultural details that make each faction feel distinct
5. Magical artifacts/items with interesting trade-offs
6. Political intrigue and relationship webs between factions

Keep the same technical structure but make the world feel richer and more detailed.
```

### Migration Prompt (For Existing Simple Lorebooks)

```
I have a simple lorebook (just basic keyword→text entries) and want to upgrade it to use this complex template system.

My current simple lorebook entries:
[PASTE YOUR EXISTING SIMPLE ENTRIES]

My template file: [ATTACH Complex_Lorebook_Template.js]

Please:
1. Convert my simple entries into the complex template format
2. Add appropriate priorities, categories, and triggers
3. Create logical connections between related lore entries
4. Add filters where certain lore should only appear in specific contexts
5. Suggest timeline events and world reactions based on my content
6. Maintain all my original lore content while making it more dynamic

Explain what improvements the new system will provide over my old simple lorebook.
```

### Quick Fix Prompt

```
I'm getting errors with my Janitor AI lorebook script. Here's the file:

[ATTACH YOUR FILE]

Error message: [PASTE ANY ERROR MESSAGES]

Please:
1. Fix any JavaScript syntax errors
2. Check for missing commas, brackets, or quotes
3. Verify all lore entries have proper structure
4. Test that the getStat() function works with my stat format
5. Ensure the activation engine can run without errors

Return the corrected file and explain what was wrong.
```

### Specific Theme Prompts

For different genres, you can use these specialized prompts:

**Sci-Fi Setting**:
```
Convert this template for a sci-fi setting with: space empires, alien races, technology levels, starship combat, and political intrigue across star systems. My stats are: Fleet Size, Technology, Influence, Resources, Alien Relations.
```

**Fantasy Setting**:
```
Adapt this template for a fantasy realm with: kingdoms, magic schools, mythical creatures, ancient prophecies, and divine intervention. My stats are: Magic Power, Kingdom Strength, Divine Favor, Artifact Count, Reputation.
```

**Modern/Urban Fantasy**:
```
Modify this template for modern urban fantasy with: secret societies, supernatural creatures hiding among humans, government agencies, and magical politics. My stats are: Network Size, Supernatural Power, Government Heat, Resource Access, Cover Identity.
```

**Post-Apocalyptic**:
```
Adapt this for a post-apocalyptic world with: survivor settlements, mutant creatures, resource scarcity, faction warfare, and rebuilding civilization. My stats are: Settlement Size, Resources, Military Strength, Technology Recovery, Survivor Morale.
```

## Advanced Features

### Probability-Based Activation
Add `probability: 0.5` to entries for 50% random activation, useful for:
- Varying world responses
- Optional flavor text
- Unpredictable encounters

### Complex Filtering
```javascript
filters: {
    requiresAny: ['magic', 'arcane'],      // Need at least one
    requiresAll: ['ally', 'trusted'],     // Need both
    notWith: ['enemy', 'hostile']         // Exclude if present
}
```

### Stat-Based Scaling
```javascript
if (power >= 50 && power < 75) {
    // Medium power events
} else if (power >= 75) {
    // High power events
}
```

### Memory and State
The system remembers previous activations and can build ongoing narratives based on player choices and world reactions.

## Troubleshooting

### Common Issues

**Too Much Lore Activating**
- Increase `minMessages` values for complex lore
- Make keywords more specific
- Use filters to prevent unwanted combinations
- **Quick Fix**: Disable `CASCADING_TRIGGERS` temporarily

**Important Lore Not Triggering**
- Check keyword spelling and variations
- Verify filters aren't too restrictive
- Ensure priority is high enough (8-11 for important lore)
- **Debug**: Enable `DEBUG_MODE: true` to see which entries activate

**Timeline Events Not Working**
- Verify stat name matches your character card exactly
- Check that getStat() regex matches your formatting
- Enable debugging to see if stats are being parsed
- **Toggle Check**: Ensure both `TIMELINE_EVENTS: true` and `STAT_TRACKING: true`

**Cascading Not Working**
- Ensure trigger words appear in target entry keywords
- Check that both entries can activate (message count, filters)
- Verify trigger words are spelled correctly
- **Toggle Check**: Ensure `CASCADING_TRIGGERS: true`

**Features Suddenly Stopped Working**
- Check if you accidentally changed a toggle to `false`
- Verify no syntax errors were introduced during editing
- Ensure the FEATURES object syntax is correct
- **Reset Method**: Copy the original FEATURES configuration from the template

**Script Not Loading at All**
- Check for JavaScript syntax errors (missing commas, brackets)
- Verify the FEATURES object has correct syntax
- Ensure no essential code sections were accidentally deleted
- **Recovery**: Restore from backup or re-download the template

### Debugging Mode

**New Easy Method**: Set `DEBUG_MODE: true` in the FEATURES configuration at the top of the script.

This will show:
- Which lore entries are activating and their categories
- Current stat values being parsed (if stat tracking is enabled)
- Triggered keywords from cascading activation (if cascading is enabled)

**Old Method**: Uncomment the debugging line at the end of the script:
```javascript
context.character.scenario += ' [DEBUG: Activated ' + activatedEntries.length + ' entries: ' + activatedEntries.map(e => e.category).join(', ') + ']';
```

**Debug Output Examples**:
- `[DEBUG: Activated 3 entries: nation_example, org_mages, race_elf]`
- `[DEBUG STATS: Day=15, Power=45]`
- `[DEBUG TRIGGERS: magic, politics, power]`

Use this information to identify why certain lore isn't triggering or why too much is activating at once.

### Performance Tips

- Keep total lore entries under 100 for best performance
- Use specific keywords rather than common words
- Set appropriate `minMessages` to prevent early overwhelm
- Group related lore with similar priorities

---

## Version History

**v2.0 - Toggle System Update**
- Added FEATURES toggle configuration for easy component control
- Added comprehensive safe removal instructions
- Enhanced debugging with toggle-controlled debug mode
- Added detailed troubleshooting for toggle-related issues
- Improved beginner-friendliness with graduated complexity options

**v1.0 - Original Template**
- Full-featured complex lorebook system
- All components enabled by default
- Manual code editing required for customization

---

**Created for the Janitor AI Scripts community. Feel free to modify, share, and improve upon this system.**

**Much of this is drafted based upon my understanding of the system, but I lack the time necessary for extensive testing.**
