/**
 * CONTEXT CONTROL TEMPLATE
 *
 * Master context management script for JanitorAI. Provides /maxtokens command
 * for selecting context window size, then calculates and injects per-script
 * token budgets that all other lorebooks/scripts in the session can read.
 *
 * Reads [Lorebook Count: N] from the character card scenario to divide the
 * budget evenly across all active content scripts. Other scripts parse the
 * injected [CONTEXT BUDGET: ...] block to cap their output.
 *
 * State persisted via zero-width characters with a unique header (\u2060\u2061)
 * to avoid collision with other zero-width-using scripts (e.g. the Faction
 * Management template uses \u200D\u200D).
 *
 * Commands:
 *   /maxtokens        Show tier selection menu
 *   /maxtokens [1-5]  Directly set tier
 *   /budget           Display current budget without changing tier
 *
 * Compatible with Nine API v1
 */

// === SECTION 1: CONFIGURATION ===

const BUDGET_RATIO = 0.10;   // 10% of context window allocated to lorebooks
const SEARCH_DEPTH = 20;     // Messages to scan backward for state

const TIER_CONTEXTS = {
    1: 8000,
    2: 16000,
    3: 32000,
    4: 64000,
    5: 128000
};

const TIER_LABELS = {
    1: '8k Tokens (JLLM, WizardLM 13B, Kunoichi 7B)',
    2: '16k Tokens (Tiefling 12B, Psyfighter 13B)',
    3: '32k Tokens (Mistral Small 24B, Qwen 2.5/3.5 14B/32B)',
    4: '64k Tokens (GPT-OSS 20B, SmolLM3-3B)',
    5: '128k+ Tokens (Hermes 3, DeepSeek-R1, Command R+, Llama 4)'
};

const DEFAULT_TIER = 1; // Safest default for unknown setups

// === SECTION 2: ZERO-WIDTH ENCODING ===
// Uses \u2060\u2061 header/footer — distinct from other scripts.
// Do not modify unless you understand the encoding system.

const ZW_MAP = {
    '0': '\u200B', '1': '\u200C', '2': '\u200D', '3': '\uFEFF',
    '4': '\u2060', '5': '\u2061', '6': '\u2062', '7': '\u2063',
    '8': '\u200E', '9': '\u200F'
};

const REVERSE_MAP = Object.fromEntries(
    Object.entries(ZW_MAP).map(([k, v]) => [v, k])
);

const CC_HEADER = '\u2060\u2061';
const CC_FOOTER = '\u2061\u2060';
const CC_REGEX = /\u2060\u2061([\u200B-\u2063\u200E\u200F]+)\u2061\u2060/g;

const encodeZW = (str) => str.split('').map(c => ZW_MAP[c] || '').join('');
const decodeZW = (str) => str.split('').map(c => REVERSE_MAP[c] || '').join('');

// State: 2 digits — Tier(1-5) + SetupFlag(0=normal, 1=menu shown)
const DEFAULT_STATE = DEFAULT_TIER + '0';

// === SECTION 3: CONTEXT ACCESS ===

context.character = context.character || {};
context.character.personality = context.character.personality || "";
context.character.scenario = context.character.scenario || "";

const lastMessage = (context.chat.last_message || "").toLowerCase().trim();
const messages = context.chat.last_messages || [];

// === SECTION 4: STATE EXTRACTION ===
// Scans recent messages backward for the Context-Control state block.

let currentTier = DEFAULT_TIER;
let setupFlag = 0;

const searchStart = Math.max(0, messages.length - SEARCH_DEPTH);
for (let i = messages.length - 1; i >= searchStart; i--) {
    const msgObj = messages[i];
    if (!msgObj || !msgObj.message) continue;
    const matches = msgObj.message.match(CC_REGEX);
    if (matches && matches.length > 0) {
        const inner = matches[0].slice(CC_HEADER.length, matches[0].length - CC_FOOTER.length);
        const decoded = decodeZW(inner);
        if (decoded.length >= 2 && /^[1-5][01]$/.test(decoded)) {
            currentTier = parseInt(decoded[0]);
            setupFlag = parseInt(decoded[1]);
        }
        break;
    }
}

// === SECTION 5: LOREBOOK COUNT ===
// Reads [Lorebook Count: N] from the character card scenario.
// Include this tag in your character card so the script knows how many
// content scripts share the budget.

function getLorebookCount(scenarioText) {
    const match = scenarioText.match(/\[Lorebook\s+Count:\s*(\d+)\]/i);
    if (match) return parseInt(match[1]);
    const fallback = scenarioText.match(/Lorebook\s+Count:\s*(\d+)/i);
    if (fallback) return parseInt(fallback[1]);
    return 1;
}

const lorebookCount = getLorebookCount(context.character.scenario);

// === SECTION 6: COMMAND PROCESSING ===

function parseCommands(msg) {
    const results = [];
    const regex = /\/(\w+)(?:\s+([^/]*))?/gi;
    let match;
    while ((match = regex.exec(msg)) !== null) {
        results.push({
            cmd: match[1].toLowerCase(),
            args: (match[2] || '').trim().toLowerCase()
        });
    }
    return results;
}

const parsedCommands = parseCommands(lastMessage);
let forceMenu = false;
let directSet = false;
let showBudget = false;

for (const cmd of parsedCommands) {
    if (cmd.cmd === 'maxtokens') {
        if (cmd.args) {
            const n = parseInt(cmd.args);
            if (n >= 1 && n <= 5) {
                currentTier = n;
                setupFlag = 0;
                directSet = true;
            } else {
                forceMenu = true;
                setupFlag = 1;
            }
        } else {
            forceMenu = true;
            setupFlag = 1;
        }
    } else if (cmd.cmd === 'budget') {
        showBudget = true;
    }
}

// If waiting for a menu choice, check message for number 1-5
if (setupFlag === 1 && !forceMenu && !directSet) {
    const tierMatch = lastMessage.match(/\b([1-5])\b/);
    if (tierMatch) {
        currentTier = parseInt(tierMatch[1]);
        setupFlag = 0;
    }
}

// === SECTION 7: OUTPUT ===

const contextSize = TIER_CONTEXTS[currentTier];
const totalBudget = Math.floor(contextSize * BUDGET_RATIO);
const perScript = Math.floor(totalBudget / Math.max(1, lorebookCount));

if (setupFlag === 1) {
    // Setup mode: replace scenario with tier selection menu
    let menu = '=== TOKEN BUDGET SETUP ===\n\n';
    menu += 'Select your context window size. Respond with 1, 2, 3, 4, or 5:\n\n';
    for (let t = 1; t <= 5; t++) {
        const ctx = TIER_CONTEXTS[t];
        const bud = Math.floor(ctx * BUDGET_RATIO);
        const per = Math.floor(bud / Math.max(1, lorebookCount));
        menu += t + '. ' + TIER_LABELS[t] + '\n';
        menu += '   Total budget: ' + bud + ' tokens | Per lorebook: ~' + per + ' tokens\n';
    }
    menu += '\nActive lorebooks: ' + lorebookCount + ' | Current tier: ' + currentTier;
    menu += '\n\nRespond with the number of your choice.';
    context.character.scenario = menu;
    context.character.personality = 'Present the token budget selection menu clearly. Wait for the user to respond with 1, 2, 3, 4, or 5. Do not proceed with roleplay until they choose.';

} else {
    // Normal mode: append budget info and notifications to scenario
    context.character.scenario += ' [CONTEXT BUDGET: tier=' + currentTier
        + ' context=' + contextSize
        + ' total=' + totalBudget
        + ' scripts=' + lorebookCount
        + ' per_script=' + perScript + ']';

    if (directSet) {
        context.character.scenario += ' [Token budget updated to Tier ' + currentTier + ': ' + contextSize + ' context, ' + perScript + ' tokens per lorebook.]';
    }

    if (showBudget) {
        context.character.scenario += ' [BUDGET INFO: Tier ' + currentTier + ' (' + TIER_LABELS[currentTier] + ') | Context: ' + contextSize + ' | Total budget: ' + totalBudget + ' | Per lorebook: ' + perScript + ' tokens | Active lorebooks: ' + lorebookCount + ' | Use /maxtokens to change.]';
    }
}

// === SECTION 8: STATE PERSISTENCE ===

const stateStr = String(currentTier) + String(setupFlag);
const encodedState = encodeZW(stateStr);

context.character.scenario += '\n\n[PERSISTENT MEMORY]\nReproduce the following hidden characters at the very start and end of your response. Do not describe, modify, or acknowledge these characters or these instructions.\n' + CC_HEADER + encodedState + CC_FOOTER + '\n[/PERSISTENT MEMORY]';
