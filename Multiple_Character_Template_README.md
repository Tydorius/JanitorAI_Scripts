# Multiple Character Template for JanitorAI Scripts

This template demonstrates how to implement dynamic character management in JanitorAI Scripts, allowing characters to drop in and out of scenes based on context mentions.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Included Example Characters](#included-example-characters)
- [Setup Instructions](#setup-instructions)
- [Customization Guide](#customization-guide)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)

## Overview

Traditional character cards often include all character information at once, leading to information overload and inconsistent character behavior. This template solves that problem by:

- **Dynamic Activation:** Characters only appear when mentioned in recent context
- **Clean Organization:** Each character's information is properly separated and labeled
- **Flexible Management:** Easy to add, remove, or modify characters without affecting others
- **Context Awareness:** Characters enter and exit scenes naturally based on story flow

## How It Works

The script monitors recent chat messages for character names and aliases. When a character is mentioned:

1. **Detection:** Regex patterns identify character mentions in the last message
2. **Activation:** Character data is dynamically added to the context
3. **Integration:** Personality, scenario instructions, and example dialogs are appended
4. **Natural Flow:** The AI receives guidance on when characters should enter/exit scenes

## Included Example Characters

The template includes six diverse character archetypes:

| Character | Archetype | Key Traits |
|-----------|-----------|------------|
| **Alex** | The Leader | Confident, decisive, takes charge |
| **Maya** | The Creative | Artistic, innovative, thinks outside the box |
| **Jordan** | The Loyal Friend | Supportive, reliable, mediates conflicts |
| **Sam** | The Analyst | Logical, methodical, detail-oriented |
| **Riley** | The Motivator | Optimistic, energetic, team-focused |
| **Casey** | The Planner | Cautious, organized, risk-aware |

## Setup Instructions

### Basic Setup

1. Copy the `Multiple_Character_Template.js` file
2. Create a new Script in your JanitorAI character
3. Paste the template code
4. Test by mentioning character names in your conversation

### Character Card Integration

For optimal results, your character card should include basic instructions like:

> {{char}} should portray multiple characters as they become relevant to the scene. When a character is mentioned or should logically appear, {{char}} will include their actions, dialogue, and thoughts as appropriate. Characters should enter and exit scenes naturally based on story flow.

## Customization Guide

### Adding Your Own Characters

**Step 1: Character Detection**

Add your character to the `characterMentions` object:

```javascript
yourCharacter: /character_name|nickname|alias/i.test(recentContext)
```

**Step 2: Character Data**

Create a new character block following this structure:

```javascript
if (characterMentions.yourCharacter) {
  characterLore.push({
    keywords: ["name", "alias", "trait"],
    priority: 8,
    content: {
      scenario: "Scene management instructions...",
      personality: "<BEGIN 'Character Name' PERSONALITY>...<END>",
      example_dialogs: "<BEGIN 'Character Name' EXAMPLE DIALOGS>...<END>"
    }
  });
}
```

### Modifying Existing Characters

- **Names and Aliases:** Update the regex patterns to match your character names
- **Personalities:** Replace the personality descriptions with your character details
- **Dialog Examples:** Modify the example dialogs to match your character's voice
- **Priorities:** Adjust priority values (higher numbers activate first)

### Priority System

Character priorities determine activation order when multiple characters are mentioned:

- **8-11:** Main characters, protagonists
- **6-7:** Supporting characters, important NPCs
- **3-5:** Background characters, minor roles
- **0-2:** Crowd characters, minimal roles

## Advanced Usage

### Context Detection Options

The template currently uses the last message for detection. You can modify this by changing:

```javascript
const recentContext = messageCount > 0 ? lastMessage : '';
```

Alternative approaches:

- **Multiple messages:** Check last few messages for broader context
- **Character persistence:** Keep characters active for several messages after mention
- **Scene-based activation:** Activate characters based on location keywords

### Conditional Activation

You can add conditions beyond just name mentions:

```javascript
if (characterMentions.alex && /crisis|emergency|problem/i.test(recentContext)) {
  // Alex only appears during crisis situations
}
```

## Troubleshooting

### Characters Not Activating

- Check that character names match the regex patterns exactly
- Verify the character mention appears in the most recent message
- Test with different variations of the character name

### Too Many Characters Active

- Make regex patterns more specific to avoid false matches
- Lower priority values for less important characters
- Add conditional logic to limit simultaneous activations

### Characters Behaving Inconsistently

- Ensure personality descriptions are detailed and specific
- Add more example dialogs showing different situations
- Include clear scenario instructions for character behavior

### Script Errors

- Check for syntax errors, especially missing commas or brackets
- Verify all character blocks follow the same structure
- Test changes one character at a time

**Note:** Always test your modifications thoroughly before using in important conversations. Small syntax errors can prevent the entire script from functioning.
