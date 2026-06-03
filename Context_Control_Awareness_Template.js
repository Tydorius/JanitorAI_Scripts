/**
 * CONTEXT CONTROL AWARENESS TEMPLATE
 *
 * Example companion script that reads token budgets injected by the
 * Context Control Template. Demonstrates how any lorebook/script can
 * adapt its output to stay within the per-script token allocation.
 *
 * This script does NOT manage state or handle commands. It is purely
 * a consumer of the Context Control Template's output:
 *   - Reads [CONTEXT BUDGET: ...] from the scenario
 *   - Falls back to estimating the budget from zero-width state
 *   - Selects detail level for each lore entry based on available tokens
 *
 * Adapt this pattern for your own lorebooks by replacing the example
 * lore database in Section 5 with your own content.
 *
 * Requires: Context_Control_Template.js running in the same session.
 * Compatible with Nine API v1
 */

// === SECTION 1: CONFIGURATION ===

const SEARCH_DEPTH = 20;       // Messages to scan for zero-width state
const DEFAULT_BUDGET = 160;    // Conservative fallback (Tier 1 / 5 lorebooks)

// Token thresholds for detail-level selection.
// If per_script budget is below FULL_THRESHOLD, entries drop to summary.
// If below SUMMARY_THRESHOLD, entries drop to bullet points.
const FULL_THRESHOLD = 300;
const SUMMARY_THRESHOLD = 120;

// === SECTION 2: ZERO-WIDTH DECODING ===
// Reads the Context Control state to determine the active tier.
// Uses the same header (\u2060\u2061) as the Context Control Template.

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

const decodeZW = (str) => str.split('').map(c => REVERSE_MAP[c] || '').join('');

// === SECTION 3: CONTEXT ACCESS ===

context.character = context.character || {};
context.character.personality = context.character.personality || "";
context.character.scenario = context.character.scenario || "";

const lastMessage = (context.chat.last_message || "").toLowerCase().trim();
const messages = context.chat.last_messages || [];

// === SECTION 4: BUDGET DETECTION ===
// Primary: parse [CONTEXT BUDGET: ...] block from scenario.
// Fallback: decode zero-width state and estimate from tier.

let perScriptBudget = DEFAULT_BUDGET;
let detectedTier = null;

// Primary method: read the budget block injected by Context Control
function parseBudgetBlock(scenarioText) {
    const match = scenarioText.match(
        /\[CONTEXT\s+BUDGET:\s*tier=(\d+)\s+context=(\d+)\s+total=(\d+)\s+scripts=(\d+)\s+per_script=(\d+)\]/i
    );
    if (match) {
        return {
            tier: parseInt(match[1]),
            contextSize: parseInt(match[2]),
            totalBudget: parseInt(match[3]),
            scriptCount: parseInt(match[4]),
            perScript: parseInt(match[5])
        };
    }
    return null;
}

const budgetInfo = parseBudgetBlock(context.character.scenario);

if (budgetInfo) {
    perScriptBudget = budgetInfo.perScript;
    detectedTier = budgetInfo.tier;
}

// Fallback: scan messages for Context Control zero-width state
if (!budgetInfo) {
    const searchStart = Math.max(0, messages.length - SEARCH_DEPTH);
    for (let i = messages.length - 1; i >= searchStart; i--) {
        const msgObj = messages[i];
        if (!msgObj || !msgObj.message) continue;
        const matches = msgObj.message.match(CC_REGEX);
        if (matches && matches.length > 0) {
            const inner = matches[0].slice(CC_HEADER.length, matches[0].length - CC_FOOTER.length);
            const decoded = decodeZW(inner);
            if (decoded.length >= 2 && /^[1-5][01]$/.test(decoded)) {
                detectedTier = parseInt(decoded[0]);
                const tierContexts = { 1: 8000, 2: 16000, 3: 32000, 4: 64000, 5: 128000 };
                const lorebookCount = 1;
                perScriptBudget = Math.floor(tierContexts[detectedTier] * 0.10 / lorebookCount);
            }
            break;
        }
    }
}

// Determine detail ceiling based on budget
let maxDetailLevel = 'bullet';
if (perScriptBudget >= FULL_THRESHOLD) {
    maxDetailLevel = 'full';
} else if (perScriptBudget >= SUMMARY_THRESHOLD) {
    maxDetailLevel = 'summary';
}

// === SECTION 5: LORE DATABASE ===
// Replace these entries with your own content. Each entry needs at least
// a 'bullet' version. Provide 'summary' and 'full' for larger budgets.
//
// Structure:
//   id           - Unique identifier
//   keywords     - Words/phrases that activate this entry
//   importance   - Float for priority sorting (higher = more important)
//   full         - { personality, scenario } for high budgets
//   summary      - { personality, scenario } for medium budgets
//   bullet       - { personality, scenario } for low budgets

const loreDatabase = [
    {
        id: 'location_capital',
        keywords: ['capital', 'main city', 'central district'],
        importance: 10.0,
        full: {
            personality: ', familiar with the grand architecture and political intrigue of the capital city',
            scenario: ' The capital city serves as the political and economic heart of the empire. Its towering spires and marble boulevards speak to centuries of accumulated wealth and power. The city is divided into districts: the Noble Quarter houses the aristocracy, the Merchant Quarter bustles with trade, and the Lower District struggles with overcrowding. Political factions constantly vie for influence within the city walls.'
        },
        summary: {
            personality: ', aware of the capital city layout',
            scenario: ' The capital is the political center, divided into Noble, Merchant, and Lower districts. Factions compete for influence.'
        },
        bullet: {
            personality: ', knows the capital',
            scenario: ' Capital: Noble Quarter, Merchant Quarter, Lower District. Political hub.'
        }
    },
    {
        id: 'faction_mages',
        keywords: ['mages guild', 'magic users', 'arcane society'],
        importance: 8.5,
        full: {
            personality: ', understanding the complex hierarchy and regulations of the Mages Guild',
            scenario: ' The Mages Guild controls all legal magic use within the empire. Founded three centuries ago after the Arcane Wars, the Guild maintains strict licensing requirements and monitors magical activity. Senior mages hold considerable political power, often serving as advisors to nobility. The Guild operates a network of academies, research facilities, and enforcement divisions.'
        },
        summary: {
            personality: ', knowledgeable about the Mages Guild',
            scenario: ' The Mages Guild regulates all legal magic use. They maintain academies, conduct research, and hold political influence.'
        },
        bullet: {
            personality: ', knows of the Mages Guild',
            scenario: ' Mages Guild: controls magic licensing, runs academies, politically influential.'
        }
    },
    {
        id: 'faction_merchants',
        keywords: ['merchant guild', 'traders', 'commerce league'],
        importance: 7.0,
        full: {
            personality: ', versed in the trading networks and economic practices of the Merchant Guild',
            scenario: ' The Merchant Guild represents the economic backbone of the empire. They control trade routes, set prices for key commodities, and negotiate treaties with foreign markets. Guild membership is hereditary for established families but can be purchased by wealthy newcomers. The Guild maintains its own security force to protect caravans and warehouses.'
        },
        summary: {
            personality: ', familiar with Merchant Guild operations',
            scenario: ' The Merchant Guild controls trade routes and pricing. Membership is hereditary or purchasable. They maintain private security.'
        },
        bullet: {
            personality: ', aware of Merchant Guild',
            scenario: ' Merchant Guild: controls trade, sets prices, private security.'
        }
    },
    {
        id: 'character_duke',
        keywords: ['duke ashford', 'lord ashford', 'the duke'],
        importance: 9.0,
        full: {
            personality: ', understanding Duke Ashford\'s ambitious nature and political maneuvering',
            scenario: ' Duke Ashford is a cunning politician in his late forties who has spent decades building alliances and gathering blackmail material on rivals. He controls the western provinces and commands significant military forces. His ultimate goal is to position his family line for a future claim to the throne. Despite his ruthless political tactics, he maintains a reputation for fair governance within his own territories.'
        },
        summary: {
            personality: ', aware of Duke Ashford\'s political influence',
            scenario: ' Duke Ashford controls the western provinces. He builds alliances and gathers intelligence while governing his territory fairly.'
        },
        bullet: {
            personality: ', knows Duke Ashford',
            scenario: ' Duke Ashford: western provinces, ambitious politician, fair governor.'
        }
    },
    {
        id: 'character_priestess',
        keywords: ['high priestess', 'priestess elena', 'temple leader'],
        importance: 6.5,
        full: {
            personality: ', recognizing High Priestess Elena\'s spiritual authority and diplomatic influence',
            scenario: ' High Priestess Elena leads the Temple of the Seven Lights, the dominant religious institution in the empire. Now in her sixties, she has served for over thirty years and commands the loyalty of thousands of clergy and followers. She advocates for the poor and mediates disputes between noble houses. Her word carries significant weight in matters of tradition and morality.'
        },
        summary: {
            personality: ', familiar with High Priestess Elena\'s role',
            scenario: ' High Priestess Elena leads the Temple of the Seven Lights. She advocates for the poor, mediates noble disputes, and holds moral authority.'
        },
        bullet: {
            personality: ', knows High Priestess Elena',
            scenario: ' High Priestess Elena: religious leader, mediator, advocates for poor.'
        }
    }
];

// === SECTION 6: TOKEN ESTIMATION ===

function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

function getEntryTokens(entry, level) {
    const content = entry[level];
    if (!content) return 0;
    return estimateTokens(content.personality + content.scenario);
}

// === SECTION 7: ACTIVATION AND BUDGETING ===
// Activates entries whose keywords appear in the last message, then
// selects detail levels to fit within the per-script budget.

const activationArray = [];

loreDatabase.forEach(entry => {
    const msgLower = lastMessage;
    const matched = entry.keywords.some(kw => msgLower.includes(kw.toLowerCase()));
    if (matched) {
        activationArray.push({
            lore_id: entry.id,
            importance: entry.importance,
            entry: entry,
            detailLevel: 'full',
            tokens: getEntryTokens(entry, 'full')
        });
    }
});

// Sort by importance descending
activationArray.sort((a, b) => b.importance - a.importance);

// Select detail level per entry, fitting within budget
// Strategy: grant full to highest-importance entries first, degrade
// lower-importance entries to summary or bullet as needed.
let remainingBudget = perScriptBudget;

for (let i = 0; i < activationArray.length; i++) {
    const item = activationArray[i];

    const fullTokens = getEntryTokens(item.entry, 'full');
    const summaryTokens = getEntryTokens(item.entry, 'summary');
    const bulletTokens = getEntryTokens(item.entry, 'bullet');

    // Respect the global ceiling first
    if (maxDetailLevel === 'bullet') {
        item.detailLevel = 'bullet';
        item.tokens = bulletTokens || summaryTokens || fullTokens;
    } else if (maxDetailLevel === 'summary') {
        if (summaryTokens <= remainingBudget) {
            item.detailLevel = 'summary';
            item.tokens = summaryTokens;
        } else {
            item.detailLevel = 'bullet';
            item.tokens = bulletTokens || summaryTokens;
        }
    } else {
        // maxDetailLevel === 'full', try full then degrade
        if (fullTokens <= remainingBudget) {
            item.detailLevel = 'full';
            item.tokens = fullTokens;
        } else if (summaryTokens <= remainingBudget) {
            item.detailLevel = 'summary';
            item.tokens = summaryTokens;
        } else {
            item.detailLevel = 'bullet';
            item.tokens = bulletTokens || summaryTokens || fullTokens;
        }
    }

    remainingBudget -= item.tokens;
    if (remainingBudget < 0) remainingBudget = 0;

    // If budget is exhausted, force remaining entries to bullet
    if (remainingBudget < bulletTokens) {
        for (let j = i + 1; j < activationArray.length; j++) {
            activationArray[j].detailLevel = 'bullet';
            activationArray[j].tokens = getEntryTokens(activationArray[j].entry, 'bullet')
                || getEntryTokens(activationArray[j].entry, 'summary');
        }
        break;
    }
}

// === SECTION 8: APPLY LORE ===

activationArray.forEach(item => {
    const content = item.entry[item.detailLevel];
    if (!content) return;

    if (content.personality) {
        context.character.personality += content.personality;
    }
    if (content.scenario) {
        context.character.scenario += content.scenario;
    }
});
