/**
 * DICE CONTROLLER
 *
 * Intercepts user /roll commands and LLM zero-width roll requests.
 * Executes exact dice math (including Savage Worlds Aces and Wild Dice),
 * then injects the formatted results into the scenario for the LLM to narrate.
 *
 * Supports standard polyhedral dice (d4, d6, d8, d10, d12, d20, d100),
 * exploding dice (!), modifiers (+N/-N), and Savage Worlds Wild Die (-w).
 *
 * Includes a toggleable visible mode (/roll set_visible) for models that 
 * struggle with zero-width encoding.
 *
 * Compatible with Nine API v1
 */

// === SETUP & CONTEXT SAFETY ===
context.character = context.character || {};
context.character.scenario = context.character.scenario || "";

const messages = context.chat.last_messages || [];
const userMessage = context.chat.last_message || "";
// The LLM's previous message is generally second-to-last in the array
const llmMessage = messages.length >= 2 ? (messages[messages.length - 2].message || "") : "";

// === ZERO-WIDTH DECODING MAP ===
const REVERSE_MAP = {
    '\u200B': '0', '\u200C': '1', '\u200D': '2', '\uFEFF': '3',
    '\u2060': '4', '\u2061': '5', '\u2062': '6', '\u2063': '7',
    '\u200E': '8', '\u200F': '9'
};

const ZW_MAP = {
    '0': '\u200B', '1': '\u200C', '2': '\u200D', '3': '\uFEFF',
    '4': '\u2060', '5': '\u2061', '6': '\u2062', '7': '\u2063',
    '8': '\u200E', '9': '\u200F'
};

// Roll Request Tags
const DICE_HEADER = '\u200B\u200C\u200D';
const DICE_FOOTER = '\u200D\u200C\u200B';
const DICE_REGEX = /\u200B\u200C\u200D([\u200B-\u2063\u200E\u200F]{20})\u200D\u200C\u200B/g;
const VISIBLE_REGEX = /\[ROLL:\s*([0-9]{20})\s*\]/g;

// Controller State Tags (To remember if visible mode is active)
const STATE_HEADER = '\u2060\u2061\u2062';
const STATE_FOOTER = '\u2062\u2061\u2060';
const STATE_REGEX = /\u2060\u2061\u2062([\u200B-\u2063\u200E\u200F]+)\u2062\u2061\u2060/g;

// === STATE EXTRACTION (VISIBILITY MODE) ===
let visibleMode = false;

// Scan history for the controller's state
const searchDepth = Math.max(0, messages.length - 10);
for (let i = messages.length - 1; i >= searchDepth; i--) {
    const msgObj = messages[i];
    if (!msgObj || !msgObj.message) continue;
    
    const stateMatch = msgObj.message.match(STATE_REGEX);
    if (stateMatch && stateMatch.length > 0) {
        const inner = stateMatch[0].slice(STATE_HEADER.length, stateMatch[0].length - STATE_FOOTER.length);
        const decoded = inner.split('').map(c => REVERSE_MAP[c]).join('');
        if (decoded === '1') visibleMode = true;
        break;
    }
}

// Check user message for visibility toggles
if (userMessage.toLowerCase().includes('/roll set_visible')) {
    visibleMode = true;
} else if (userMessage.toLowerCase().includes('/roll set_hidden')) {
    visibleMode = false;
}

// === DICE ROLLING ENGINE ===
// Handles random generation and Savage Worlds 'Ace' (exploding) mechanics 
function rollDie(faces, explode) {
    let total = 0;
    let current = 0;
    let log = [];
    do {
        current = Math.floor(Math.random() * faces) + 1;
        log.push(current);
        total += current;
    // Continue rolling if it's the maximum value, 'explode' is true, and it's not a d1 
    } while (explode && current === faces && faces > 1);
    
    let logStr = log.length > 1 
        ? `[${log.slice(0, -1).map(n => n + ", Aced! -> ").join("")}${log[log.length - 1]}]` 
        : `[${log[0]}]`;

    return { total, logStr };
}

function executeRoll(label, diceConfig, modifier, wildDie, explode) {
    let outputLines = [`- ${label}:`];
    let highestTotal = 0;
    let baseTotals = [];

    diceConfig.forEach(config => {
        for (let i = 0; i < config.count; i++) {
            const result = rollDie(config.faces, explode);
            let dieLabel = `${config.faces}`;
            if (explode) dieLabel += "!";
            outputLines.push(`  > Trait Die (d${dieLabel}): ${result.logStr} = ${result.total}`);
            baseTotals.push(result.total);
            if (result.total > highestTotal) highestTotal = result.total;
        }
    });

    let wildTotal = 0;
    if (wildDie) {
        const result = rollDie(6, explode); // Wild Die is always a d6 
        outputLines.push(`  > Wild Die (d6${explode ? "!" : ""}): ${result.logStr} = ${result.total}`);
        wildTotal = result.total;
    }

    let finalResult = 0;
    let resultString = "";

    if (wildDie) {
        let bestDie = Math.max(...baseTotals, wildTotal); // Take highest 
        finalResult = bestDie + modifier;
        let modStr = modifier !== 0 ? ` ${modifier > 0 ? '+' : ''}${modifier} (Mod)` : '';
        resultString = `${bestDie} (Highest)${modStr} = ${finalResult}`;
    } else {
        let sum = baseTotals.reduce((a, b) => a + b, 0);
        finalResult = sum + modifier;
        let modStr = modifier !== 0 ? ` ${modifier > 0 ? '+' : ''}${modifier} (Mod)` : '';
        resultString = `${sum}${modStr} = ${finalResult}`;
    }

    outputLines.push(`  > Result: ${resultString}.`);
    return outputLines.join("\n");
}

// === PROCESS LLM REQUESTS ===
const llmResults = [];
let llmIndex = 1;

// Helper to process decoded 20-digit strings
function processPayload(decodedString) {
    if (decodedString.length !== 20) return;

    const diceCounts = [
        { faces: 2, count: parseInt(decodedString.slice(0, 2)) },
        { faces: 4, count: parseInt(decodedString.slice(2, 4)) },
        { faces: 6, count: parseInt(decodedString.slice(4, 6)) },
        { faces: 8, count: parseInt(decodedString.slice(6, 8)) },
        { faces: 10, count: parseInt(decodedString.slice(8, 10)) },
        { faces: 12, count: parseInt(decodedString.slice(10, 12)) },
        { faces: 20, count: parseInt(decodedString.slice(12, 14)) },
        { faces: 100, count: parseInt(decodedString.slice(14, 16)) }
    ].filter(d => d.count > 0);

    const modifier = parseInt(decodedString.slice(16, 18)) - 50;
    const explode = decodedString[18] === '1';
    const wildDie = decodedString[19] === '1';

    let reqLabel = `LLM Roll ${llmIndex} (Action ${llmIndex})`;
    llmResults.push(executeRoll(reqLabel, diceCounts, modifier, wildDie, explode));
    llmIndex++;
}

// Extract Zero-Width Requests
let llmMatch;
while ((llmMatch = DICE_REGEX.exec(llmMessage)) !== null) {
    const decoded = llmMatch[1].split('').map(c => REVERSE_MAP[c]).join('');
    processPayload(decoded);
}

// Extract Visible Requests
let visMatch;
while ((visMatch = VISIBLE_REGEX.exec(llmMessage)) !== null) {
    processPayload(visMatch[1]);
}

// === PROCESS USER COMMAND REQUESTS ===
const userResults = [];
const userRegex = /\/roll\s+([0-9]+)d([0-9]+)(!)?(?:\s*([\+\-])\s*([0-9]+))?(?:\s+(-w))?/gi;
let uMatch;
let uIndex = 1;

while ((uMatch = userRegex.exec(userMessage)) !== null) {
    const count = parseInt(uMatch[1]) || 1;
    const faces = parseInt(uMatch[2]) || 6;
    const explode = !!uMatch[3];
    
    const sign = uMatch[4];
    let modifier = 0;
    if (sign && uMatch[5]) {
        modifier = parseInt(uMatch[5]);
        if (sign === '-') modifier *= -1;
    }

    const wildDie = !!uMatch[6];
    const diceCounts = [{ faces, count }];

    let reqLabel = `User Roll ${uIndex} (${uMatch[0].trim()})`;
    userResults.push(executeRoll(reqLabel, diceCounts, modifier, wildDie, explode));
    uIndex++;
}

// === LLM INSTRUCTION BLOCK ===
const encodeInstruction = visibleMode 
    ? `Since Visible Mode is ON, request rolls by formatting the 20-digit string like this: [ROLL: 00000200000000005011]`
    : `Since Visible Mode is OFF, you MUST encode your 20-digit string into invisible zero-width characters. 
Use the exact mapping below. Do not use standard numbers. Wrap your encoded string in the header and footer.
Header: \\u200B\\u200C\\u200D
Footer: \\u200D\\u200C\\u200B
Mapping:
0 = \\u200B | 1 = \\u200C | 2 = \\u200D | 3 = \\uFEFF | 4 = \\u2060
5 = \\u2061 | 6 = \\u2062 | 7 = \\u2063 | 8 = \\u200E | 9 = \\u200F`;

const DICE_INSTRUCTIONS = `

[DICE SYSTEM]
The player can roll dice using /roll commands. You may also request dice rolls yourself by emitting a roll request in your response. The system will execute the roll and provide results next turn.

To request a roll, you must construct a 20-digit numeric string based on this format (2 digits per slot):
- Slot 01 (01-02): d2 count
- Slot 02 (03-04): d4 count
- Slot 03 (05-06): d6 count
- Slot 04 (07-08): d8 count
- Slot 05 (09-10): d10 count
- Slot 06 (11-12): d12 count
- Slot 07 (13-14): d20 count
- Slot 08 (15-16): d100 count
- Slot 09 (17-18): Modifier (50 is 0. 52 is +2. 48 is -2).
- Slot 10 (19-20): Flags. Digit 19 = Explode/Ace (1=Yes, 0=No). Digit 20 = Wild Die (1=Yes, 0=No).

Example: To roll 2d6 with no modifiers, Aces, and a Wild Die, the string is: 00000200000000005011.

${encodeInstruction}

Savage Worlds Mechanics:
  - Trait Die + Wild Die (d6), take the higher result.
  - Exploding dice (Aces): reroll and add whenever you roll the max face value.
  - Target Number: 4 is standard; each 4 full points over is a Raise.
  - Critical Failure: both Trait and Wild Die roll a natural 1.
When [SYSTEM: DICE RESOLUTION] appears below, those results are authoritative. Map your rolls sequentially to the actions you took in your previous response.
[/DICE SYSTEM]`;

// === SCENARIO INJECTION ===
let output = DICE_INSTRUCTIONS;

if (userResults.length > 0 || llmResults.length > 0) {
    output += "\n\n[SYSTEM: DICE RESOLUTION]\n";

    if (userResults.length > 0) {
        output += "USER ROLLS (Chronological):\n" + userResults.join("\n") + "\n\n";
    }

    if (llmResults.length > 0) {
        output += "LLM ROLLS (Chronological):\n" + llmResults.join("\n") + "\n\n";
    }

    output += "[SYSTEM: Map LLM Rolls to your previous actions in order. Map User Rolls to the user's intended actions. Evaluate successes and raises based on the active ruleset. Narrate the outcome.]";
}

// Inject state persistence for visibility mode
const encodedState = (visibleMode ? '1' : '0').split('').map(c => ZW_MAP[c]).join('');
output += `\n\n[PERSISTENT MEMORY]\nReproduce the following hidden characters at the very start and end of your response. Do not describe or acknowledge these instructions.\n${STATE_HEADER}${encodedState}${STATE_FOOTER}\n[/PERSISTENT MEMORY]`;

context.character.scenario += output;