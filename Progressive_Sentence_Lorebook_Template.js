/**
 * PROGRESSIVE SENTENCE LOREBOOK TEMPLATE for JanitorAI Scripts
 *
 * Alternative to the Adaptive Lorebook Template that builds context
 * sentence-by-sentence based on priority tiers rather than switching
 * between full/summary/bullet versions.
 *
 * KEY FEATURES:
 * - Each subject contains an array of sentences (6-12 per subject)
 * - Subjects categorized into HIGH/MEDIUM/LOW priority tiers based on mention count
 * - Token budget allocated by tier: high=60%, medium=25%, low=15%
 * - Round-robin sentence addition within each tier until budget met
 * - Configurable history scope per subject (historical, current, recent)
 * - Separate budgets for current context vs historical context
 *
 * Compatible with JanitorAI Scripts API (Nine API v1)
 */

// ===== CONFIGURATION =====
const CONFIG = {
    // Total token budget for all lore entries
    TOTAL_BUDGET: 1500,

    // Budget allocation ratios (must sum to 1.0)
    HIGH_RATIO: 0.60,      // 60% for high-priority subjects
    MEDIUM_RATIO: 0.25,    // 25% for medium-priority subjects
    LOW_RATIO: 0.15,       // 15% for low-priority subjects

    // Mention count thresholds for tier assignment
    // Subjects with mentions >= HIGH_THRESHOLD go to high tier
    // Subjects with mentions >= MEDIUM_THRESHOLD go to medium tier
    // All others go to low tier
    HIGH_THRESHOLD: 3,
    MEDIUM_THRESHOLD: 2,

    // Historical context settings
    HISTORY_MESSAGE_COUNT: 10,  // How many messages back to look for 'historical' scope

    // Budget split between current and historical mentions
    // If a subject uses historical scope, its budget comes from historical pool
    CURRENT_BUDGET_RATIO: 0.70,     // 70% of tier budget for current-scope subjects
    HISTORICAL_BUDGET_RATIO: 0.30,  // 30% of tier budget for historical-scope subjects

    // === DYNAMIC TIER SETTINGS ===
    // When enabled, unused budget from higher tiers flows down to lower tiers
    DYNAMIC_BUDGETS: true,

    // When enabled, subjects can be promoted to higher tiers if those tiers are empty
    // This gives important subjects more budget when they're the only ones activated
    PROMOTION_ENABLED: true,

    // Promotion thresholds - minimum importance to be eligible for promotion
    // Subjects below this importance won't be promoted even if higher tiers are empty
    PROMOTION_MIN_IMPORTANCE: 5.0,

    // How to redistribute unused budget (only when DYNAMIC_BUDGETS is true)
    // 'cascade': Unused high flows to medium, unused medium flows to low
    // 'proportional': Unused budget distributed proportionally to remaining tiers
    // 'low_priority': All unused budget goes to low tier (maximize coverage)
    REDISTRIBUTION_MODE: 'cascade',

    // Debug mode
    DEBUG: false
};

// ===== HISTORY SCOPE TYPES =====
// Each subject can specify which messages to consider for activation
const HISTORY_SCOPE = {
    CURRENT_USER_ONLY: 'current_user',      // Only the user's most recent message
    CURRENT_EXCHANGE: 'current_exchange',   // User's message + AI's last response
    HISTORICAL: 'historical'                 // Last N messages (configured above)
};

// ===== CORE SYSTEM ACCESS =====
const lastMessage = context.chat.last_message ? context.chat.last_message.toLowerCase() : '';
const lastMessages = context.chat.last_messages || [];
const messageCount = context.chat.message_count || 0;

// ===== UTILITY FUNCTIONS =====

/**
 * Estimate token count from text (approximately 4 characters per token)
 */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Count keyword mentions in a given text
 */
function countMentions(keywords, text) {
    let count = 0;
    keywords.forEach(keyword => {
        const regex = new RegExp(keyword.toLowerCase(), 'gi');
        const matches = text.match(regex);
        if (matches) count += matches.length;
    });
    return count;
}

/**
 * Get the appropriate text to search based on history scope
 */
function getSearchText(scope) {
    switch (scope) {
        case HISTORY_SCOPE.CURRENT_USER_ONLY:
            // Only the most recent user message
            return lastMessage;

        case HISTORY_SCOPE.CURRENT_EXCHANGE:
            // Recent user message + last AI response
            // last_messages array contains recent messages
            // Combines the last 2 messages (user + AI typically)
            if (lastMessages.length >= 2) {
                return lastMessages.slice(-2).join(' ').toLowerCase();
            }
            return lastMessage;

        case HISTORY_SCOPE.HISTORICAL:
            // Last N messages from history
            const historyCount = Math.min(CONFIG.HISTORY_MESSAGE_COUNT, lastMessages.length);
            if (historyCount > 0) {
                return lastMessages.slice(-historyCount).join(' ').toLowerCase();
            }
            return lastMessage;

        default:
            return lastMessage;
    }
}

/**
 * Calculate the maximum potential token usage for a set of subjects
 * (if all their sentences were added)
 */
function calculatePotentialTokens(subjects) {
    let total = 0;
    subjects.forEach(item => {
        item.subject.sentences.forEach(sentence => {
            total += estimateTokens(sentence.text);
        });
    });
    return total;
}

/**
 * Calculate tokens needed to give each subject at least N sentences
 */
function calculateMinimumTokens(subjects, sentencesPerSubject) {
    let total = 0;
    subjects.forEach(item => {
        const sentenceCount = Math.min(sentencesPerSubject, item.subject.sentences.length);
        for (let i = 0; i < sentenceCount; i++) {
            total += estimateTokens(item.subject.sentences[i].text);
        }
    });
    return total;
}

// ===== SUBJECT DATABASE =====
// Each subject contains:
// - id: Unique identifier
// - keywords: Array of trigger words/phrases
// - importance: Base importance value for tiebreaking (higher = more important)
// - historyScope: Which messages to consider (CURRENT_USER_ONLY, CURRENT_EXCHANGE, HISTORICAL)
// - sentences: Array of sentences ordered from most to least important
//   - Each sentence object has: text, target ('personality' or 'scenario')

const subjectDatabase = [
    // === EXAMPLE: LOCATION - THE CAPITAL ===
    {
        id: 'location_capital',
        keywords: ['capital', 'main city', 'central district', 'throne city'],
        importance: 10.0,
        historyScope: HISTORY_SCOPE.CURRENT_USER_ONLY, // Only care about current message
        sentences: [
            { text: ' The capital city serves as the political and economic heart of the empire.', target: 'scenario' },
            { text: ', familiar with the grand architecture and political intrigue of the capital', target: 'personality' },
            { text: ' Its towering spires and marble boulevards speak to centuries of accumulated wealth.', target: 'scenario' },
            { text: ' The city is divided into distinct districts: Noble Quarter, Merchant Quarter, and Lower District.', target: 'scenario' },
            { text: ' Political factions constantly vie for influence within the city walls.', target: 'scenario' },
            { text: ' The royal palace dominates the skyline from its position on the central hill.', target: 'scenario' },
            { text: ', understanding the complex social hierarchies that govern capital society', target: 'personality' },
            { text: ' Underground markets operate in the shadows, trading in secrets and forbidden goods.', target: 'scenario' }
        ]
    },

    // === EXAMPLE: FACTION - MAGES GUILD ===
    {
        id: 'faction_mages',
        keywords: ['mages guild', 'magic users', 'arcane society', 'wizards'],
        importance: 8.5,
        historyScope: HISTORY_SCOPE.CURRENT_EXCHANGE, // Consider user message + AI response
        sentences: [
            { text: ' The Mages Guild controls all legal magic use within the empire.', target: 'scenario' },
            { text: ', knowledgeable about the workings and regulations of the Mages Guild', target: 'personality' },
            { text: ' Founded three centuries ago after the Arcane Wars, the Guild maintains strict licensing.', target: 'scenario' },
            { text: ' Senior mages hold considerable political power, serving as advisors to nobility.', target: 'scenario' },
            { text: ' The Guild operates academies, research facilities, and enforcement divisions.', target: 'scenario' },
            { text: ' Unlicensed magic use is punishable by imprisonment or worse.', target: 'scenario' },
            { text: ', aware of the internal politics and rivalries within the Mages Guild', target: 'personality' },
            { text: ' The Archmage answers only to the Emperor and holds the third-highest position in the realm.', target: 'scenario' }
        ]
    },

    // === EXAMPLE: FACTION - MERCHANT GUILD ===
    {
        id: 'faction_merchants',
        keywords: ['merchant guild', 'traders', 'commerce league', 'trade'],
        importance: 7.0,
        historyScope: HISTORY_SCOPE.HISTORICAL, // Keep in context over multiple messages
        sentences: [
            { text: ' The Merchant Guild represents the economic backbone of the empire.', target: 'scenario' },
            { text: ', versed in the trading networks and economic practices of the realm', target: 'personality' },
            { text: ' They control trade routes and set prices for key commodities.', target: 'scenario' },
            { text: ' Guild membership is hereditary for established families but purchasable by the wealthy.', target: 'scenario' },
            { text: ' The Guild maintains private security forces to protect their interests.', target: 'scenario' },
            { text: ' Their influence extends into politics through strategic loans to nobility.', target: 'scenario' },
            { text: ', understanding that money often speaks louder than titles in this world', target: 'personality' }
        ]
    },

    // === EXAMPLE: CHARACTER - DUKE ASHFORD ===
    {
        id: 'character_duke',
        keywords: ['duke ashford', 'lord ashford', 'the duke', 'western lord'],
        importance: 9.0,
        historyScope: HISTORY_SCOPE.CURRENT_EXCHANGE,
        sentences: [
            { text: ' Duke Ashford is a cunning politician who controls the western provinces.', target: 'scenario' },
            { text: ', understanding Duke Ashford\'s ambitious nature and political maneuvering', target: 'personality' },
            { text: ' He has spent decades building alliances and gathering leverage on rivals.', target: 'scenario' },
            { text: ' His ultimate goal is to position his family line for a claim to the throne.', target: 'scenario' },
            { text: ' Despite ruthless political tactics, he maintains fair governance in his territories.', target: 'scenario' },
            { text: ' He commands significant military forces fiercely loyal to House Ashford.', target: 'scenario' },
            { text: ', recognizing the Duke as both a potential ally and dangerous adversary', target: 'personality' },
            { text: ' His spy network is said to rival even the crown\'s intelligence apparatus.', target: 'scenario' },
            { text: ' The Duke\'s wife died mysteriously, and rumors persist about his involvement.', target: 'scenario' }
        ]
    },

    // === EXAMPLE: CHARACTER - HIGH PRIESTESS ===
    {
        id: 'character_priestess',
        keywords: ['high priestess', 'priestess elena', 'temple leader', 'holy mother'],
        importance: 6.5,
        historyScope: HISTORY_SCOPE.HISTORICAL, // Religious figure - keep in context
        sentences: [
            { text: ' High Priestess Elena leads the Temple of the Seven Lights.', target: 'scenario' },
            { text: ', recognizing High Priestess Elena\'s spiritual authority', target: 'personality' },
            { text: ' She has served for over thirty years and commands the loyalty of thousands.', target: 'scenario' },
            { text: ' She advocates for the poor and mediates disputes between noble houses.', target: 'scenario' },
            { text: ' Her word carries significant weight in matters of tradition and morality.', target: 'scenario' },
            { text: ' She carefully avoids direct involvement in political power struggles.', target: 'scenario' },
            { text: ', aware that the Priestess holds influence without seeking temporal power', target: 'personality' }
        ]
    },

    // === EXAMPLE: HISTORICAL EVENT - THE GREAT WAR ===
    {
        id: 'history_war',
        keywords: ['great war', 'border conflict', 'northern campaign', 'the war'],
        importance: 5.0,
        historyScope: HISTORY_SCOPE.CURRENT_USER_ONLY, // Only mention when directly referenced
        sentences: [
            { text: ' The Great War ended fifteen years ago after a decade of brutal conflict.', target: 'scenario' },
            { text: ', versed in the history and consequences of the Great War', target: 'personality' },
            { text: ' It concluded with a costly victory that left the treasury depleted.', target: 'scenario' },
            { text: ' Veterans still struggle with their experiences, and border tensions remain high.', target: 'scenario' },
            { text: ' The war reshaped political alliances and elevated certain military families.', target: 'scenario' },
            { text: ' Many believe another conflict with the northern kingdoms is inevitable.', target: 'scenario' },
            { text: ', aware that the scars of war still shape current politics', target: 'personality' }
        ]
    }

    // === ADD YOUR OWN SUBJECTS HERE ===
    // Follow the same structure:
    // - id: unique string
    // - keywords: array of trigger words
    // - importance: float for tiebreaking
    // - historyScope: HISTORY_SCOPE.CURRENT_USER_ONLY, CURRENT_EXCHANGE, or HISTORICAL
    // - sentences: array of {text, target} objects ordered by importance
];

// ===== ACTIVATION AND MENTION COUNTING =====

// Build activation data for each subject
const activationData = [];

subjectDatabase.forEach(subject => {
    // Get the appropriate text to search based on this subject's history scope
    const searchText = getSearchText(subject.historyScope);

    // Count mentions in the search text
    const mentions = countMentions(subject.keywords, searchText);

    if (mentions > 0) {
        activationData.push({
            subject: subject,
            mentions: mentions,
            importance: subject.importance,
            historyScope: subject.historyScope,
            sentenceIndex: 0,  // Track which sentence we're on
            addedSentences: [] // Track which sentences have been added
        });
    }
});

// Skip processing if nothing activated
if (activationData.length === 0) {
    if (CONFIG.DEBUG) {
        context.character.scenario += ' [DEBUG: No subjects activated]';
    }
    // Early exit - no subjects matched
} else {

// ===== PRIORITY TIER ASSIGNMENT =====

// Sort by mentions (desc), then importance (desc)
activationData.sort((a, b) => {
    if (b.mentions !== a.mentions) return b.mentions - a.mentions;
    return b.importance - a.importance;
});

// Initial tier assignment based on mention count thresholds
const highTier = { current: [], historical: [] };
const mediumTier = { current: [], historical: [] };
const lowTier = { current: [], historical: [] };

activationData.forEach(item => {
    // Determine which pool (current vs historical) based on scope
    const isHistorical = item.historyScope === HISTORY_SCOPE.HISTORICAL;
    const pool = isHistorical ? 'historical' : 'current';

    // Assign to tier based on mention count
    if (item.mentions >= CONFIG.HIGH_THRESHOLD) {
        highTier[pool].push(item);
    } else if (item.mentions >= CONFIG.MEDIUM_THRESHOLD) {
        mediumTier[pool].push(item);
    } else {
        lowTier[pool].push(item);
    }
});

// ===== DYNAMIC PROMOTION (Optional) =====
// If higher tiers are empty, promote eligible subjects from lower tiers

if (CONFIG.PROMOTION_ENABLED) {
    // Check each pool (current and historical) separately
    ['current', 'historical'].forEach(pool => {
        // Promote to HIGH tier if empty
        if (highTier[pool].length === 0) {
            // First try to promote from MEDIUM tier
            const eligibleFromMedium = mediumTier[pool].filter(
                item => item.importance >= CONFIG.PROMOTION_MIN_IMPORTANCE
            );
            if (eligibleFromMedium.length > 0) {
                // Promote the highest importance subject(s) from medium
                const toPromote = eligibleFromMedium[0]; // Promote top 1
                highTier[pool].push(toPromote);
                mediumTier[pool] = mediumTier[pool].filter(item => item !== toPromote);
            } else {
                // Try to promote from LOW tier if MEDIUM is also empty
                const eligibleFromLow = lowTier[pool].filter(
                    item => item.importance >= CONFIG.PROMOTION_MIN_IMPORTANCE
                );
                if (eligibleFromLow.length > 0) {
                    const toPromote = eligibleFromLow[0];
                    highTier[pool].push(toPromote);
                    lowTier[pool] = lowTier[pool].filter(item => item !== toPromote);
                }
            }
        }

        // Promote to MEDIUM tier if empty (and we have LOW subjects)
        if (mediumTier[pool].length === 0 && lowTier[pool].length > 1) {
            const eligibleFromLow = lowTier[pool].filter(
                item => item.importance >= CONFIG.PROMOTION_MIN_IMPORTANCE
            );
            if (eligibleFromLow.length > 0) {
                const toPromote = eligibleFromLow[0];
                mediumTier[pool].push(toPromote);
                lowTier[pool] = lowTier[pool].filter(item => item !== toPromote);
            }
        }
    });
}

// ===== BUDGET CALCULATION =====

// Calculate initial tier budgets
let highBudget = Math.floor(CONFIG.TOTAL_BUDGET * CONFIG.HIGH_RATIO);
let mediumBudget = Math.floor(CONFIG.TOTAL_BUDGET * CONFIG.MEDIUM_RATIO);
let lowBudget = CONFIG.TOTAL_BUDGET - highBudget - mediumBudget;

// ===== DYNAMIC BUDGET REDISTRIBUTION (Optional) =====
// Redistribute unused budget from higher tiers to lower tiers

if (CONFIG.DYNAMIC_BUDGETS) {
    // Calculate potential token needs for each tier (all subjects, all sentences)
    const highPotential = calculatePotentialTokens([...highTier.current, ...highTier.historical]);
    const mediumPotential = calculatePotentialTokens([...mediumTier.current, ...mediumTier.historical]);
    const lowPotential = calculatePotentialTokens([...lowTier.current, ...lowTier.historical]);

    // Calculate unused budget from each tier
    let highUnused = Math.max(0, highBudget - highPotential);
    let mediumUnused = Math.max(0, mediumBudget - mediumPotential);

    // Track redistribution for debug
    let redistributionLog = [];

    if (CONFIG.REDISTRIBUTION_MODE === 'cascade') {
        // CASCADE: Unused flows down one tier at a time
        // High unused -> Medium
        if (highUnused > 0) {
            mediumBudget += highUnused;
            redistributionLog.push(`HIGH->${mediumUnused > 0 ? 'MED' : 'MED'}: ${highUnused}`);
            highBudget -= highUnused;

            // Recalculate medium unused after receiving high's excess
            mediumUnused = Math.max(0, mediumBudget - mediumPotential);
        }

        // Medium unused -> Low
        if (mediumUnused > 0) {
            lowBudget += mediumUnused;
            redistributionLog.push(`MED->LOW: ${mediumUnused}`);
            mediumBudget -= mediumUnused;
        }

    } else if (CONFIG.REDISTRIBUTION_MODE === 'proportional') {
        // PROPORTIONAL: Unused distributed proportionally to remaining tiers
        const totalUnused = highUnused + mediumUnused;

        if (totalUnused > 0) {
            // Calculate weights based on how much each tier could use
            const mediumNeed = Math.max(0, mediumPotential - mediumBudget + highUnused);
            const lowNeed = Math.max(0, lowPotential - lowBudget);
            const totalNeed = mediumNeed + lowNeed;

            if (totalNeed > 0) {
                const mediumShare = Math.floor(totalUnused * (mediumNeed / totalNeed));
                const lowShare = totalUnused - mediumShare;

                mediumBudget += mediumShare;
                lowBudget += lowShare;
                highBudget -= highUnused;
                mediumBudget -= mediumUnused;

                redistributionLog.push(`PROPORTIONAL: MED+${mediumShare}, LOW+${lowShare}`);
            } else {
                // Nothing needs more budget, give it all to low for extra coverage
                lowBudget += totalUnused;
                highBudget -= highUnused;
                mediumBudget -= mediumUnused;
                redistributionLog.push(`PROPORTIONAL->LOW: ${totalUnused}`);
            }
        }

    } else if (CONFIG.REDISTRIBUTION_MODE === 'low_priority') {
        // LOW_PRIORITY: All unused goes to low tier for maximum coverage
        const totalUnused = highUnused + mediumUnused;

        if (totalUnused > 0) {
            lowBudget += totalUnused;
            highBudget -= highUnused;
            mediumBudget -= mediumUnused;
            redistributionLog.push(`ALL->LOW: ${totalUnused}`);
        }
    }

    // Store redistribution log for debug output
    if (CONFIG.DEBUG && redistributionLog.length > 0) {
        CONFIG._redistributionLog = redistributionLog;
    }
}

// Split each tier budget between current and historical pools
const budgets = {
    high: {
        current: Math.floor(highBudget * CONFIG.CURRENT_BUDGET_RATIO),
        historical: Math.floor(highBudget * CONFIG.HISTORICAL_BUDGET_RATIO)
    },
    medium: {
        current: Math.floor(mediumBudget * CONFIG.CURRENT_BUDGET_RATIO),
        historical: Math.floor(mediumBudget * CONFIG.HISTORICAL_BUDGET_RATIO)
    },
    low: {
        current: Math.floor(lowBudget * CONFIG.CURRENT_BUDGET_RATIO),
        historical: Math.floor(lowBudget * CONFIG.HISTORICAL_BUDGET_RATIO)
    }
};

// ===== SENTENCE BUILDER FUNCTION =====

/**
 * Build sentences for a tier's subjects using round-robin allocation
 * @param {Array} subjects - Array of subject activation data
 * @param {number} maxTokens - Maximum tokens to use for this tier/pool
 * @returns {Array} Array of {text, target} to apply
 */
function buildSentences(subjects, maxTokens) {
    if (subjects.length === 0 || maxTokens <= 0) return [];

    const result = [];
    let usedTokens = 0;
    let allExhausted = false;

    // Round-robin through subjects, adding one sentence at a time
    while (!allExhausted && usedTokens < maxTokens) {
        allExhausted = true;

        for (let i = 0; i < subjects.length; i++) {
            const item = subjects[i];
            const sentences = item.subject.sentences;

            // Check if this subject has more sentences to add
            if (item.sentenceIndex < sentences.length) {
                const sentence = sentences[item.sentenceIndex];
                const tokenCost = estimateTokens(sentence.text);

                // Check if we can afford this sentence
                // Allow going slightly over budget to ensure all subjects get at least one sentence
                if (usedTokens + tokenCost <= maxTokens || item.sentenceIndex === 0) {
                    result.push({
                        text: sentence.text,
                        target: sentence.target,
                        subjectId: item.subject.id
                    });
                    usedTokens += tokenCost;
                    item.sentenceIndex++;
                    item.addedSentences.push(sentence);
                    allExhausted = false;
                }
            }
        }

        // Safety check - if we made no progress this round, exit
        if (allExhausted) break;
    }

    return result;
}

// ===== BUILD OUTPUT FOR EACH TIER =====

const finalOutput = {
    personality: '',
    scenario: ''
};

// Process tiers in order: HIGH -> MEDIUM -> LOW
// Within each tier, process current pool first, then historical

// HIGH TIER
const highCurrentSentences = buildSentences(highTier.current, budgets.high.current);
const highHistoricalSentences = buildSentences(highTier.historical, budgets.high.historical);

// MEDIUM TIER
const mediumCurrentSentences = buildSentences(mediumTier.current, budgets.medium.current);
const mediumHistoricalSentences = buildSentences(mediumTier.historical, budgets.medium.historical);

// LOW TIER
const lowCurrentSentences = buildSentences(lowTier.current, budgets.low.current);
const lowHistoricalSentences = buildSentences(lowTier.historical, budgets.low.historical);

// Combine all sentences
const allSentences = [
    ...highCurrentSentences,
    ...highHistoricalSentences,
    ...mediumCurrentSentences,
    ...mediumHistoricalSentences,
    ...lowCurrentSentences,
    ...lowHistoricalSentences
];

// Apply sentences to final output
allSentences.forEach(item => {
    if (item.target === 'personality') {
        finalOutput.personality += item.text;
    } else {
        finalOutput.scenario += item.text;
    }
});

// ===== APPLY TO CONTEXT =====

if (finalOutput.personality) {
    context.character.personality += finalOutput.personality;
}

if (finalOutput.scenario) {
    context.character.scenario += finalOutput.scenario;
}

// ===== DEBUG OUTPUT =====

if (CONFIG.DEBUG) {
    const debugInfo = [];
    debugInfo.push(`[DEBUG Progressive Sentence Builder]`);
    debugInfo.push(`Total Budget: ${CONFIG.TOTAL_BUDGET} tokens`);
    debugInfo.push(`Activated Subjects: ${activationData.length}`);

    // Show tier distribution
    debugInfo.push(`High Tier: ${highTier.current.length} current, ${highTier.historical.length} historical`);
    debugInfo.push(`Medium Tier: ${mediumTier.current.length} current, ${mediumTier.historical.length} historical`);
    debugInfo.push(`Low Tier: ${lowTier.current.length} current, ${lowTier.historical.length} historical`);

    // Show dynamic tier info
    if (CONFIG.DYNAMIC_BUDGETS) {
        debugInfo.push(`Dynamic Mode: ${CONFIG.REDISTRIBUTION_MODE}`);
        debugInfo.push(`Final Budgets: H=${highBudget}, M=${mediumBudget}, L=${lowBudget}`);
        if (CONFIG._redistributionLog && CONFIG._redistributionLog.length > 0) {
            debugInfo.push(`Redistribution: ${CONFIG._redistributionLog.join(', ')}`);
        }
    }

    if (CONFIG.PROMOTION_ENABLED) {
        debugInfo.push(`Promotion: enabled (min importance: ${CONFIG.PROMOTION_MIN_IMPORTANCE})`);
    }

    debugInfo.push(`Total Sentences Added: ${allSentences.length}`);

    // Show which subjects were activated and their tier
    activationData.forEach(item => {
        let tier = 'LOW';
        if (highTier.current.includes(item) || highTier.historical.includes(item)) tier = 'HIGH';
        else if (mediumTier.current.includes(item) || mediumTier.historical.includes(item)) tier = 'MED';

        debugInfo.push(`- ${item.subject.id}: ${item.mentions} mentions, ${tier} tier, ${item.addedSentences.length} sentences`);
    });

    context.character.scenario += ' ' + debugInfo.join(' | ');
}

} // End of activation check

// ===== USAGE INSTRUCTIONS =====
/*
HOW TO USE THIS TEMPLATE:

1. CONFIGURE BUDGETS (CONFIG section):
   - TOTAL_BUDGET: Total tokens available for lore
   - HIGH/MEDIUM/LOW_RATIO: How to split budget by priority tier
   - HIGH/MEDIUM_THRESHOLD: Mention counts that determine tier placement
   - CURRENT/HISTORICAL_BUDGET_RATIO: Split within tiers for different scopes

2. SET HISTORY PREFERENCES:
   - HISTORY_MESSAGE_COUNT: How many messages back to look for HISTORICAL scope
   - Each subject can use different history scopes:
     * CURRENT_USER_ONLY: Only activates on direct current mention
     * CURRENT_EXCHANGE: Considers user message + AI response
     * HISTORICAL: Looks back N messages for sustained relevance

3. ADD YOUR SUBJECTS:
   - Each subject needs: id, keywords, importance, historyScope, sentences
   - Sentences are arrays of {text, target} objects
   - Order sentences from MOST to LEAST important (first gets added first)
   - Target can be 'personality' or 'scenario'

4. SENTENCE WRITING TIPS:
   - First 2-3 sentences: Essential facts (always included if subject activates)
   - Middle sentences: Important context and relationships
   - Last sentences: Flavor details and deep lore
   - Each sentence should be self-contained and meaningful alone

5. CHOOSING HISTORY SCOPE:
   - CURRENT_USER_ONLY: For topics that should only appear when directly mentioned
     (e.g., specific historical events, minor characters)
   - CURRENT_EXCHANGE: For topics that should persist through a conversation turn
     (e.g., important NPCs, active locations)
   - HISTORICAL: For topics that should remain in context across multiple turns
     (e.g., ongoing plotlines, major factions, persistent threats)

6. BALANCING THE SYSTEM:
   - If too much info: Lower TOTAL_BUDGET or increase thresholds
   - If not enough detail: Raise TOTAL_BUDGET or lower thresholds
   - If historical subjects dominate: Adjust CURRENT/HISTORICAL_BUDGET_RATIO
   - If important subjects get cut: Raise their importance value

7. TESTING:
   - Enable DEBUG: true to see activation information
   - Test with various keyword combinations
   - Verify sentences are added in expected order
   - Check that budget distribution feels appropriate

EXAMPLE ACTIVATION FLOW:

User message: "Tell me about the Duke and his dealings with the Mages Guild"

1. System detects:
   - "duke" mentioned 1 time (Duke Ashford subject)
   - "mages guild" mentioned 1 time (Mages Guild subject)

2. Both have 1 mention, so both go to LOW tier (if threshold is 2+)
   OR adjust thresholds so single mentions still get decent coverage

3. System alternates:
   - Add Duke sentence 1
   - Add Mages Guild sentence 1
   - Add Duke sentence 2
   - Add Mages Guild sentence 2
   - Continue until low tier budget exhausted

4. Result: Balanced coverage of both topics
*/
