JanitorAI Script Development

This skill provides guidelines for developing Scripts (enhanced lorebooks) for the JanitorAI platform.

---

## Platform Overview

JanitorAI Scripts are JavaScript code embedded in character cards as special lorebook entries. They execute every time the AI generates a response, reading chat state and dynamically modifying character context to create responsive, stateful roleplay scenarios.

Scripts are NOT traditional applications. They are middleware that runs within JanitorAI's system, reading from the chat context and appending to the character context. Scripts do not persist, and are run fresh with each messaage submission. Scripts can not be guaranteed to execute in a specific order. Scripts do not have a built-in mechanism for transferring data and variables between themselves or for making information persist over time. As such, various mechanisms must be used to ensure data persistence.

Even with these mechanisms, data persistence relies on the LLM's obedience because it must include the correct data in its output.

## Execution Environment

Scripts run in JanitorAI's sandboxed JavaScript environment. The environment supports ES6+ natively.

The `"use worker";` directive at the top of a Script file enables the full ES6+ worker context, which lifts legacy execution limits on loops and enables modern JavaScript features. If a Script uses heavy iteration or complex logic, add this directive as the first line:

```javascript
"use worker";
```

Scripts execute **once per AI response generation**. They are stateless between executions. Any state that needs to persist must be encoded into the AI's output (via zero-width characters, visible flags, or stat blocks) and parsed back on the next execution.

## Core API

### Context Object (Required in every Script)

The `context` object is the sole interface between the Script and JanitorAI.

### Read-Only Properties (Chat State)

```javascript
const lastMessage = context.chat.last_message;        // String: raw text of the most recent message
const messageCount = context.chat.message_count;       // Number: total messages in the chat
const messages = context.chat.last_messages || [];     // Array: recent message objects, each has .message property
const userName = context.chat.user_name;               // String: current user's name
const conversationId = context.chat.conversation_id;   // String: conversation identifier
const messageCreatedAt = context.chat.message_created_at; // Timestamp of message creation
```

### Read-Only Properties (Character State)

```javascript
const charName = context.character.name;               // String: character's name
const charDescription = context.character.description; // String: character description
const charFirstMessage = context.character.first_message; // String: first message
```

### Write Properties (Append-Only)

These are the ONLY fields that affect the AI's behavior. All others the Script can read but modifications are NOT passed to the model.

```javascript
context.character.personality += ", additional trait";           // Behavioral modifiers
context.character.scenario += " Additional world context.";      // World/narrative information
context.character.example_dialogs += "\n<START>\n{{user}}: ..."; // Example conversations
```

**CRITICAL**: `personality`, `example_dialogs`, and `scenario` are typically **append-only**. Direct assignment (`=`) overwrites the character's foundational prompt, causing catastrophic output failure. Always use `+=` unless you are working in a specific situation where you MUST overwrite the original logic.

**CRITICAL**: Only `personality`, `scenario`, and `example_dialogs` are passed to the LLM. All other context properties are available to the Script but modifications are ignored by the model.

### Context Guards

Always guard against undefined context properties to prevent silent crashes:

```javascript
context.character = context.character || {};
context.character.personality = context.character.personality || "";
context.character.scenario = context.character.scenario || "";
```

## JavaScript Feature Support

### Available (Confirmed Working)

All of these are used in production Scripts across the Tydorius/JanitorAI_Scripts repository:

**Variables and Scope**
- `const`, `let`, `var`
- Template literals: `` `Hello ${name}` ``
- Destructuring assignments
- `for...of` loops

**String Methods**
- `toLowerCase()`, `toUpperCase()`, `trim()`
- `indexOf()`, `includes()`, `startsWith()`, `endsWith()`
- `match()`, `replace()`, `replaceAll()`, `search()`
- `split()`, `slice()`, `substring()`, `substr()`
- `padStart()`, `padEnd()`, `repeat()`

**Array Methods**
- `.forEach()`, `.map()`, `.filter()`, `.reduce()`, `.reduceRight()`
- `.some()`, `.every()`, `.find()`, `.findIndex()`
- `.includes()`, `.indexOf()`, `.lastIndexOf()`
- `.push()`, `.pop()`, `.shift()`, `.unshift()`
- `.splice()`, `.slice()`, `.concat()`, `.join()`
- `.sort()`, `.reverse()`, `.flat()`, `.flatMap()`
- `Array.isArray()`, `Array.from()`
- Spread operator: `[...arr]`

**Object Methods**
- `Object.keys()`, `Object.values()`, `Object.entries()`
- `Object.fromEntries()`, `Object.assign()`, `Object.create()`
- `Object.hasOwnProperty()`

**Functions**
- Arrow functions: `(x) => x + 1`
- Default parameters: `function foo(x = 10)`
- Rest parameters: `function foo(...args)`

**Math and Numbers**
- `Math.random()`, `Math.floor()`, `Math.ceil()`, `Math.round()`
- `Math.max()`, `Math.min()`, `Math.abs()`
- `parseInt()`, `parseFloat()`, `Number()`
- `isNaN()`, `isFinite()`

**Regular Expressions**
- Full regex support with flags (`g`, `i`, `m`, `s`)
- Named capture groups, lookaheads
- `new RegExp(pattern, flags)` for dynamic patterns

**Data Handling**
- `JSON.stringify()`, `JSON.parse()`
- `typeof`, `instanceof`
- `try/catch/finally`

**Unicode**
- Zero-width characters for steganographic state persistence
- Full Unicode escape sequences (`\u200B`, etc.)
- String manipulation of multi-byte characters

**Debugging**
- `console.log()` outputs to the debug panel

### Restricted (Not Available)

These are blocked or unavailable in the sandbox:

- **Modules**: No `import`, `export`, `require` - all code runs in a single scope
- **Async**: No `async`, `await`, `Promise`, or callbacks
- **Timers**: No `setTimeout`, `setInterval`, `requestAnimationFrame`
- **Network**: No `fetch`, `XMLHttpRequest`, `WebSocket`
- **DOM**: No `document`, `window`, `navigator`, or browser APIs
- **Storage**: No `localStorage`, `sessionStorage`, `IndexedDB`
- **File System**: No `fs`, `readFile`, or file access
- **Eval**: No `eval()`, `new Function()`
- **Classes**: `class` syntax may work but is not recommended; use object literals and constructor functions instead

## Standard Patterns

### Stat Parsing

Extract numerical values from AI responses using regex. The character card MUST output stats in a consistent format.

```javascript
function getStat(statName, lastResponse) {
    const regex = new RegExp(`\\*\\*${statName}:\\*\\*\\s*(\\d+)\\s*%?`, 'i');
    const match = lastResponse.match(regex);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return null;
}

// Usage
const day = getStat('Day', lastResponse);
const power = getStat('Power', lastResponse);
```

**Character card must format stats as**: `**StatName:** 50%` or `**StatName:** 50`

### Keyword Detection

Standard pattern for checking if any keyword appears in a message:

```javascript
const keywords = ['magic', 'arcane', 'spell'];
const found = keywords.some(kw => lastMessage.toLowerCase().includes(kw));
```

For boundary-safe matching (prevents "classic" matching "class"):

```javascript
function hasWord(text, word) {
    const regex = new RegExp('(?:^|\\s)' + word + '(?=\\s|$)', 'i');
    return regex.test(text);
}
```

For suffix wildcards (matching "welcome", "welcomed", "welcoming"):

```javascript
function hasStem(text, stem) {
    const regex = new RegExp('(?:^|\\s)' + stem + '[a-z]*?(?=\\s|$)', 'i');
    return regex.test(text);
}
```

### Multi-Message Window

Scan recent messages for context beyond just the last message:

```javascript
const messages = context.chat.last_messages || [];
const WINDOW_DEPTH = 5;
const startIdx = Math.max(0, messages.length - WINDOW_DEPTH);
let windowText = '';
for (let i = startIdx; i < messages.length; i++) {
    const msg = messages[i];
    const text = (msg && msg.message) ? msg.message : String(msg || '');
    windowText += ' ' + text;
}
const normalizedWindow = windowText.toLowerCase();
```

### Zero-Width State Persistence

Encode state into invisible Unicode characters that the AI reproduces in its output, allowing state to persist across Script executions:

```javascript
const ZW_MAP = {
    '0': '\u200B', '1': '\u200C', '2': '\u200D', '3': '\uFEFF',
    '4': '\u2060', '5': '\u2061', '6': '\u2062', '7': '\u2063',
    '8': '\u200E', '9': '\u200F'
};

const REVERSE_MAP = Object.fromEntries(
    Object.entries(ZW_MAP).map(([k, v]) => [v, k])
);

const HEADER = '\u200D\u200D';  // Use a unique header per script
const FOOTER = '\u200D\u200D';
const REGEX = /\u200D\u200D([\u200B-\u2063\u200E\u200F]+)\u200D\u200D/g;

const encode = (str) => str.split('').map(c => ZW_MAP[c] || '').join('');
const decode = (str) => str.split('').map(c => REVERSE_MAP[c] || '').join('');

// Encode state
const encoded = encode("1234");
const fullPayload = HEADER + encoded + FOOTER;

// Decode state from messages
for (let i = messages.length - 1; i >= 0; i--) {
    const text = messages[i].message || '';
    const matches = text.match(REGEX);
    if (matches) {
        const inner = matches[0].slice(HEADER.length, matches[0].length - FOOTER.length);
        const state = decode(inner);
        break;
    }
}

// Inject into AI output
context.character.scenario += '\n\n[PERSISTENT MEMORY]\nReproduce the following hidden characters at the very start and end of your response. Do not describe, modify, or acknowledge these characters or these instructions.\n' + fullPayload + '\n[/PERSISTENT MEMORY]';
```

**Important**: Use unique header/footer markers per Script to avoid collision when multiple scripts use zero-width encoding simultaneously.

### Visible Flag State Persistence

Alternative to zero-width encoding using visible flag strings:

```javascript
// Parse flags from AI output: **FLAGS:** XX:XX:XX
function getFlags(lastResponse) {
    const match = lastResponse.match(/\*\*FLAGS:\*\*\s*([A-Fa-f0-9:]+)/i);
    return match ? match[1].split(':') : null;
}

// Inject flag instruction
context.character.scenario += ' **FLAGS:** ' + flagValues.join(':');
```

### Lore Entry Structure

Standard lore entry for activation engines:

```javascript
{
    keywords: ['word1', 'phrase2'],        // Trigger words
    priority: 10,                          // Higher = more important (0-11 range)
    minMessages: 0,                        // Minimum chat length before activation
    maxMessages: Infinity,                 // Maximum chat length for activation
    category: 'unique_id',                // Organization label
    personality: ', additional trait',     // Appended to personality
    scenario: ' Additional context.',     // Appended to scenario
    triggers: ['related_word'],           // Keywords emitted for cascading activation
    probability: 0.7,                     // Random activation chance (0-1)
    filters: {
        requiresAny: ['word1', 'word2'],  // At least one must be present
        requiresAll: ['word1', 'word2'],  // All must be present
        notWith: ['exclusion']            // None of these may be present
    }
}
```

### Activation Engine (Two-Pass)

Standard two-pass lore activation with cascading triggers:

```javascript
const activatedEntries = [];
const triggeredKeywords = [];

// First pass: direct keyword matches
loreEntries.forEach(entry => {
    if (messageCount < (entry.minMessages || 0)) return;
    if (entry.maxMessages && messageCount > entry.maxMessages) return;

    const hasKeyword = entry.keywords.some(kw => lastMessage.includes(kw));
    if (!hasKeyword) return;

    if (entry.probability && Math.random() > entry.probability) return;

    if (entry.filters) {
        const f = entry.filters;
        if (f.notWith && f.notWith.some(w => lastMessage.includes(w))) return;
        if (f.requiresAny && !f.requiresAny.some(w => lastMessage.includes(w))) return;
        if (f.requiresAll && !f.requiresAll.every(w => lastMessage.includes(w))) return;
    }

    activatedEntries.push(entry);
    if (entry.triggers) {
        entry.triggers.forEach(t => triggeredKeywords.push(t));
    }
});

// Second pass: cascading activation from triggered keywords
if (triggeredKeywords.length > 0) {
    loreEntries.forEach(entry => {
        if (activatedEntries.includes(entry)) return;
        const isTriggered = entry.keywords.some(kw =>
            triggeredKeywords.some(t => kw.includes(t) || t.includes(kw))
        );
        if (isTriggered) {
            // Apply same filter/probability checks as first pass
            activatedEntries.push(entry);
        }
    });
}

// Apply sorted by priority
activatedEntries
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .forEach(entry => {
        if (entry.personality) context.character.personality += entry.personality;
        if (entry.scenario) context.character.scenario += entry.scenario;
    });
```

### Token Estimation

Approximate token count from text length:

```javascript
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}
```

### Mention Counting

Count how many times keywords appear in text for relevance scoring:

```javascript
function countMentions(keywords, text) {
    let count = 0;
    keywords.forEach(keyword => {
        const regex = new RegExp(keyword.toLowerCase(), 'gi');
        const matches = text.match(regex);
        if (matches) count += matches.length;
    });
    return count;
}
```

### Drop-In/Drop-Out Multi-Character

Dynamically include/exclude character context based on mentions:

```javascript
const characters = [
    {
        name: 'Character A',
        keywords: ['character a', 'charlie'],
        personality: "<BEGIN 'Character A' PERSONALITY>\nCharacter A is...\n<END 'Character A' PERSONALITY>",
        scenario: "Character A was mentioned. If present in the scene, include their actions and dialog."
    }
];

characters.forEach(char => {
    const mentioned = char.keywords.some(kw => lastMessage.includes(kw));
    if (mentioned) {
        context.character.personality += char.personality;
        context.character.scenario += char.scenario;
    }
});
```

Ensure every personality statement includes the character's name to prevent LLM confusion about who the statement applies to.

## Template Reference

Each template addresses a specific use case. Select the appropriate one or combine patterns from multiple.

### Complex Lorebook Template
Full-featured dynamic lorebook with cascading activation, timeline events, stat-based reactions, priority ordering, and conditional filtering. Best for worldbuilding-heavy scenarios with many interacting lore entries.

**Feature toggles**: LOREBOOK, TIMELINE_EVENTS, STAT_TRACKING, KEYWORD_REACTIONS, CASCADING_TRIGGERS, DEBUG_MODE

### Adaptive Lorebook Template
Token-aware lorebook that scales detail between full, summary, and bullet versions based on mention frequency and token budget. Each entry has three detail levels. Best for scenarios where context window space is the primary concern.

### Progressive Sentence Template
Sentence-level context builder with priority tiers (HIGH/MEDIUM/LOW), configurable history scope per subject, and round-robin allocation within tier budgets. Each subject contains ordered sentences. Best for fine-grained control over which sentences appear and in what order.

### TimeDelay Script Template
Progressive disclosure through message count thresholds, hour-based timeline progression, canon count tracking, hidden clue embedding, and conditional story branching. Best for investigation scenarios with time-based pacing.

### Persistent Flags Template
Hex-based flag string system (`**FLAGS:** XX:XX:XX`) for tracking discrete story states. Includes anti-cheat validation and save system support. Best for scenarios needing state tracking without continuous numerical values.

### Hidden Persistent Memory Template
Zero-width unicode character encoding for invisible state persistence. Modular components: weather, location (with scene shift detection), emotional state (16-bit bitmask), inventory (bitfield), schedule/day counter, and character presence. Each component independently toggleable. Best for persistent state tracking without visible artifacts.

### Anti-Omniscience Investigation Template
Flag-gated content system that prevents LLM omniscience by locking information behind hex flag requirements, injecting anti-omniscience behavioral instructions, and eliminating meta-labels and foreshadowing. Best for mystery scenarios where spoilers ruin the experience.

### Multiple Character Template
Drop-in/drop-out character management with regex-based mention detection and context injection. Best for group scenarios.

### Context Aware Multiple Character Template
Combines multi-character management with adaptive detail levels (full/limited/summary) and progressive sentence categories. Best for multiple characters where context window space needs careful management.

### Advanced Faction Management Template
Two-mode (narrative/strategic) faction management with zero-width state persistence, project system, diplomacy, resources, population, and lore activation engine. Best for scenarios with competing organizations.

### Context Control Template
Master context management providing `/maxtokens` command for tier selection. Calculates per-script token budgets from `[Lorebook Count: N]` in the character card. Companion scripts read the injected `[CONTEXT BUDGET: ...]` block.

### Context Control Awareness Template
Companion script that reads Context Control's budget injection and adapts lore output detail accordingly.

## Character Card Integration

Scripts that parse stats from AI output require the character card to include specific instructions.

### Stat Tracking Instructions

The character card must include rules for when/how stats change and mandate a consistent output format:

```
{{char}} tracks the following stats:
- Day: Increases with significant time passage
- Power: Increases from conquests and rituals (0-100)
- Influence: Increases from diplomacy and alliances (0-100)

Every response MUST end with a status block in this exact format:
**Day:** [number]
**Power:** [number]%
**Influence:** [number]%
```

### Stat Format Requirement

The Script's `getStat()` function uses regex matching `**StatName:** number`. The character card MUST instruct the AI to output stats in exactly this format. If the format differs, modify the regex in `getStat()`.

### Threshold Awareness

Character cards should document when stats trigger events so the AI knows to respond to them:

```
{{char}} understands that:
- Power >= 75 AND Day >= 20: Magical sensors detect growing power
- Influence >= 60 AND Day >= 15: Political landscape shifts
- Power >= 80 OR Influence >= 80: Major forces mobilize in response
```

## Debugging

### Debug Mode

Most templates include a debug toggle. When enabled, activation info is injected into the scenario:

```javascript
const DEBUG_MODE = true;

if (DEBUG_MODE) {
    context.character.scenario += ' [DEBUG: Activated ' + activatedEntries.length + ' entries: ' + activatedEntries.map(e => e.category).join(', ') + ']';
}
```

### Debug Panel

JanitorAI's Test Chat has a "Show Debug Panel" option at the bottom. Use the "Changes" tab to see what the Script injected. `console.log()` output also appears in the debug panel.

### Common Issues

**Too much lore activating**:
- Increase `minMessages` values
- Make keywords more specific (phrases over single words)
- Use filters to prevent unwanted combinations
- Add `probability` to reduce activation frequency
- Reduce token budget

**Important lore not triggering**:
- Check keyword spelling and include variations
- Verify filters are not too restrictive
- Increase priority (8-11 for important lore)
- Enable debug mode to see what activates
- Check if `maxMessages` is cutting off late-game entries

**Stats not parsing**:
- Verify stat format matches regex: `**StatName:** 50%`
- Check character card includes mandatory status block instructions
- Ensure status block appears at end of every AI response
- Test regex manually against sample AI output

**Script not loading**:
- Check for JavaScript syntax errors (missing commas, brackets, parentheses)
- Ensure all string literals are properly escaped
- Verify no restricted features are used
- Check that context guards are in place
- Try adding `"use worker";` as the first line

**State not persisting**:
- For zero-width: verify unique header/footer markers, check search depth
- For flags: verify character card instructions include flag reproduction
- Check that injection instructions are being appended to scenario

## Design Principles

### Keyword Design
- Use specific phrases rather than common words to avoid unwanted activation
- Include variations: `['kingdom of example', 'example kingdom', 'the kingdom']`
- Consider what both the user AND the AI might say (both can trigger entries)
- Use Depth=1 (scan only user message) to prevent AI-triggered cascading loops

### Priority Scale
- **11**: Critical world elements (main character, central location)
- **9-10**: Important factions, key NPCs, major systems
- **6-8**: Standard lore entries, supporting characters
- **0-5**: Flavor text, minor details, random encounters

### Token Management
- Individual Script additions should stay below 600 characters
- Use adaptive detail levels (full/summary/bullet) for token-constrained models
- Sort by priority so the most important content is always included first
- Estimate tokens at ~4 characters per token

### Single Script Recommendation
- Combine related systems into a single Script to prevent race conditions
- Use commented sections for organization
- Define shared utilities once
- Lore entries can reference and trigger each other reliably within one file

### Filter Usage
- `requiresAny`: At least one word must be present (OR logic)
- `requiresAll`: All words must be present (AND logic)
- `notWith`: None of these words may be present (exclusion)

### Output Formatting
- Use bracketed prefixes for injected content: `[World Event]`, `[World Reaction]`, `[Critical Alert]`
- Keep appended strings short and atomic (1-3 sentences)
- Use imperative language for AI instructions
- Always prepend personality additions with `, ` (comma-space) since personality is a comma-separated list
- Always prepend scenario additions with ` ` (space) since scenario is prose

## External Resources

Official JanitorAI documentation:
- What are Scripts: https://help.janitorai.com/en/article/what-are-scripts-a-beginner-friendly-overview-1s89w2x/
- How to use Scripts: https://help.janitorai.com/en/article/how-to-use-scripts-your-beginner-friendly-step-by-step-guide-1bdk5hc/
- Advanced Lorebook by Icehellionx: https://help.janitorai.com/en/article/advanced-lorebook-by-icehellionx-peps4q/
- Advanced Lorebook v2 by Icehellionx: https://help.janitorai.com/en/article/advanced-lorebook-v2-by-icehellionx-twhuvo/
- Dynamic Lorebook by Icehellionx: https://help.janitorai.com/en/article/dynamic-lorebook-by-icehellionx-1ideffa/
- Emotion Engine by Icehellionx: https://help.janitorai.com/en/article/emotion-engine-by-icehellionx-1fhy8xp/
- Action & Social Reaction Engine by Icehellionx: https://help.janitorai.com/en/article/action-social-reaction-engine-by-icehellionx-lnomag/
- Likes-Dislikes-Fears Engine by Icehellionx: https://help.janitorai.com/en/article/likes-dislikes-fears-engine-by-icehellionx-19z33zi/
- Random Encounter by Icehellionx: https://help.janitorai.com/en/article/random-encounter-by-icehellionx-arucex/

Community reference for ES6+ in Scripts:
- https://www.reddit.com/r/JanitorAI_Official/comments/1nfr6gf/for_people_having_issues_with_large_scripts/

Tydorius JanitorAI Scripts:
- https://www.github.com/Tydorius/JanitorAI_Scripts/

Original skill:
https://lobehub.com/it/skills/neolaw84-janitor_ai_engine-janitor-ai-script-skill