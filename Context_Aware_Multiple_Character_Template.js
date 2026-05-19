// Context Aware Multiple Character Template for JanitorAI Scripts
// Combines drop-in/drop-out character management with adaptive detail levels
// Each character category scales between full/limited/summary based on token budget
// Includes example 3-version and progressive sentence categories for customization

// SCENARIO INSTRUCTION EXAMPLE:
// To ensure your bot does not forget your characters exist, I recommend
// putting an instruction in your SCENARIO (Not personality) setting. See
// the following example. You can, of course, also instruct your bot to
// write for characters off screen or take other actions as needed, but
// include some instruction reminding the LLM that if characters are in
// different locations, then their actions are unknown to eachother.

/*

CHARACTER ARRIVAL INSTRUCTIONS:
Review previous messages and context for any of the following names:
character1
character2
character3
character4

Determine if the identified character(s) have left the scene. If they have left the scene, evaluate how much time has passed and whether they have a reason to return to the scene. If sufficient time has passed in-world AND the character has a reason to return to the scene, you may re-introduce them to the scene. Remember that they will not be aware of what has happened in their absence.

Example: character1 left the scene so they could go to work. Only ten minutes have passed. character1 should NOT be returning because a work shift is typically 4-8 hours long.

Example: character2 left the scene to use the restroom. Only ten minutes have passed. character2 may return to the scene as it does not take that long to use the restroom.

*/

// === CONFIGURATION ===
const CONFIG = {

    // Global token budget across all categories. When the combined total of all
    // categories with includeInGlobal: true exceeds this value, categories with
    // limitByGlobal: true are degraded by priority (lowest first).
    // Set to Infinity to disable global budget enforcement.
    GLOBAL_BUDGET: 3000,

    // Category configuration. Each entry controls how one category of character
    // data is budgeted and whether it participates in global budget enforcement.
    //
    //   budget          - Per-category token budget shared across activated characters.
    //                     When total exceeds this, less-mentioned characters receive
    //                     reduced detail (full -> limited -> summary).
    //   priority        - Float for degradation order during global budget enforcement.
    //                     Lower values are degraded first. Use fractional values to
    //                     insert new categories between existing ones without renumbering.
    //   includeInGlobal - Whether this category's tokens count toward GLOBAL_BUDGET.
    //   limitByGlobal   - Whether this category can be degraded when GLOBAL_BUDGET
    //                     is exceeded. A category can count toward the global total
    //                     (includeInGlobal: true) without being restricted by it
    //                     (limitByGlobal: false).
    CATEGORIES: {
        personality: {
            budget: 800,
            priority: 10.0,
            includeInGlobal: true,
            limitByGlobal: true
        },
        appearance: {
            budget: 500,
            priority: 8.0,
            includeInGlobal: true,
            limitByGlobal: true
        },
        sampleDialog: {
            budget: 800,
            priority: 7.0,
            includeInGlobal: true,
            limitByGlobal: true
        },
        exampleCategory: {
            budget: 400,
            priority: 5.0,
            includeInGlobal: true,
            limitByGlobal: true
        },
        exampleProgressive: {
            budget: 400,
            priority: 5.0,
            includeInGlobal: true,
            limitByGlobal: true
        }
    },

    // Number of recent messages to scan for character name mentions.
    // 1 = last message only, 2 = last exchange (user + AI), etc.
    MENTION_SCAN_DEPTH: 2,

    // Instruction string template injected into scenario when a character activates.
    // CHAR_PLACEHOLDER is replaced with the character's displayName at runtime.
    // One instruction string is generated per activated character.
    INSTRUCTION_STRING: "CHAR_PLACEHOLDER was mentioned in a recent message. Evaluate if CHAR_PLACEHOLDER is present within the current scene. If CHAR_PLACEHOLDER is not present, determine if they should re-enter the scene. If CHAR_PLACEHOLDER is present within the scene or had a reason to enter the scene, ensure your response includes a description of CHAR_PLACEHOLDER's thoughts, actions, or dialog. If CHAR_PLACEHOLDER recently left the scene, and significant time has yet to pass, only bring CHAR_PLACEHOLDER back into the scene if CHAR_PLACEHOLDER was only planning to be absent for a very short time. Keep in mind any travel distance or off-screen activities CHAR_PLACEHOLDER may perform in order to judge if CHAR_PLACEHOLDER should return to the scene. If CHAR_PLACEHOLDER is present or enters the scene, evaluate CHAR_PLACEHOLDER's last emotional state and whether or not it should have changed.",

    DEBUG: false
};

// === UTILITY FUNCTIONS ===

function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

function countMentions(names, text) {
    let count = 0;
    names.forEach(name => {
        const regex = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
        const matches = text.match(regex);
        if (matches) count += matches.length;
    });
    return count;
}

// Maps each 3-version category to its context.character target field.
// Change these if you want a category to write to a different field.
const CATEGORY_TARGETS = {
    personality: 'personality',
    appearance: 'personality',
    sampleDialog: 'example_dialogs',
    exampleCategory: 'scenario'
};

// === CHARACTER DATABASE ===
// Each character object contains:
//   id              - Unique identifier string
//   displayName     - Name used in instruction strings and output headers
//   names           - Array of name variants for mention detection
//   importance      - Float for priority tiebreaking (higher = more important)
//
//   personality     - { full, limited, summary } targeting personality field
//   appearance      - { full, limited, summary } targeting personality field
//   sampleDialog    - { full, limited, summary } targeting example_dialogs field
//   exampleCategory - { full, limited, summary } targeting scenario field
//
//   exampleProgressive - { sentences: [{text, target}] }
//     Progressive sentence category. Sentences added most-to-least important
//     within budget. target: 'personality' or 'scenario'.
//
// To add custom categories, duplicate the exampleCategory structure within
// a character and rename the key. Add the key to CATEGORY_TARGETS above
// and to the THREE_VERSION_CATEGORIES array below.

const characters = [

    // =====================================================================
    // CHARACTER 1: NADIA (Sample)
    // =====================================================================
    {
        id: 'nadia',
        displayName: 'Nadia',
        names: ['nadia', 'nad'],
        importance: 8.0,

        personality: {
            full:
`<BEGIN 'Nadia' PERSONALITY>
Nadia is direct and wastes no time on pleasantries when action is needed.
Nadia values competence above all other traits in the people she works with.
Nadia is fiercely protective of those who have earned her trust.
Nadia distrusts nobility and authority figures on principle.
Nadia has a dry, cutting sense of humor that surfaces when tensions are high.
Nadia keeps her emotions guarded and rarely shows vulnerability.
Nadia respects strength but despises cruelty.
Nadia follows a personal code of honor that she holds above any law.
<END 'Nadia' PERSONALITY>`,
            limited:
`<BEGIN 'Nadia' PERSONALITY>
Nadia is direct, values competence, and protects those who earn her trust.
Nadia distrusts authority and keeps her emotions guarded.
Nadia has dry humor and follows a strict personal code of honor.
<END 'Nadia' PERSONALITY>`,
            summary:
`<BEGIN 'Nadia' PERSONALITY> Direct, protective, distrustful of authority. Dry humor, strict personal code. <END 'Nadia' PERSONALITY>`
        },

        appearance: {
            full:
` Nadia has an athletic build with broad shoulders and calloused hands from years of weapons training. Her dark hair is kept short in a practical crop. A thin scar runs along her jawline from a past fight. She wears reinforced leather armor over plain dark clothing, with a short sword at her hip and a dagger in her boot.`,
            limited:
` Nadia is athletic with short dark hair and a scar along her jaw. She wears practical leather armor and carries a short sword.`,
            summary:
` Nadia: athletic, short dark hair, jaw scar, leather armor, short sword.`
        },

        sampleDialog: {
            full:
`<BEGIN 'Nadia' EXAMPLE DIALOGS>
(Assessing a threat) "Three of them. Two on the left are hired muscle, the one on the right is the actual danger. Take him out first, the others will run."
(To someone being naive) "You think they invited you here out of kindness? Nobody in a building that expensive does anything out of kindness."
(When asked about her past) "The past is dead weight. I carry what I need and leave the rest behind."
(During combat) "Stop talking and move. We can have a philosophy lesson when we're not about to die."
(After a victory) "That was sloppy. We won because they were worse, not because we were good."
<END 'Nadia' EXAMPLE DIALOGS>`,
            limited:
`<BEGIN 'Nadia' EXAMPLE DIALOGS>
(Assessing a threat) "Three of them. Two on the left are hired muscle, the one on the right is the actual danger."
(When asked about her past) "The past is dead weight. I carry what I need and leave the rest behind."
(During combat) "Stop talking and move. We can have a philosophy lesson when we're not about to die."
<END 'Nadia' EXAMPLE DIALOGS>`,
            summary:
`<BEGIN 'Nadia' EXAMPLE DIALOGS> Direct, combat-focused, distrustful. Values action over words. <END 'Nadia' EXAMPLE DIALOGS>`
        },

        exampleCategory: {
            full:
`<BEGIN 'Nadia' BACKGROUND>
Nadia served eight years in the Kessen Mercenary Company, rising to squad leader before leaving after a dispute with the company's commander over a civilian protection contract. She now works independently, taking contracts that align with her personal code. She maintains contact with two former squadmates who left the company around the same time. Her military training covers close-quarters combat, field tactics, and basic siege operations. She has experience fighting in both urban and wilderness environments.
<END 'Nadia' BACKGROUND>`,
            limited:
`<BEGIN 'Nadia' BACKGROUND>
Nadia is a former mercenary squad leader who left her company over a moral dispute. She works independently, taking contracts that fit her code. Experienced in close-quarters combat and field tactics.
<END 'Nadia' BACKGROUND>`,
            summary:
`<BEGIN 'Nadia' BACKGROUND> Former mercenary squad leader, independent contractor, close-quarters combat specialist. <END 'Nadia' BACKGROUND>`
        },

        exampleProgressive: {
            sentences: [
                { text: ' Nadia favors a defensive fighting style that waits for opponents to overextend before countering.', target: 'scenario' },
                { text: ', trained in the Kessen Company\'s standardized short-sword-and-dagger paired weapon style', target: 'personality' },
                { text: ' She is most dangerous in narrow spaces where opponents cannot flank her.', target: 'scenario' },
                { text: ' She disarms when possible rather than killing, unless the opponent has demonstrated intent to kill.', target: 'scenario' },
                { text: ' Her left-handed fighting style confuses opponents expecting conventional right-handed attacks.', target: 'scenario' },
                { text: ', proficient in basic field medicine focused on stabilizing wounds for transport', target: 'personality' }
            ]
        }
    },

    // =====================================================================
    // CHARACTER 2: CORVIN (Sample)
    // =====================================================================
    {
        id: 'corvin',
        displayName: 'Corvin',
        names: ['corvin', 'cov'],
        importance: 7.0,

        personality: {
            full:
`<BEGIN 'Corvin' PERSONALITY>
Corvin is analytical and approaches social situations the way he approaches texts: by looking for patterns.
Corvin is socially awkward and often misses subtext in conversations.
Corvin has a dry wit that emerges more in writing than in speech.
Corvin becomes animated and talkative only when discussing his areas of expertise.
Corvin avoids physical confrontation and will talk his way out of fights.
Corvin is obsessive about organization and becomes distressed by disorder.
Corvin values knowledge above material wealth or social standing.
Corvin holds grudges against those who damage or destroy books.
<END 'Corvin' PERSONALITY>`,
            limited:
`<BEGIN 'Corvin' PERSONALITY>
Corvin is analytical and socially awkward, missing conversational subtext.
Corvin becomes animated only when discussing his expertise.
Corvin values knowledge above all else and avoids physical confrontation.
<END 'Corvin' PERSONALITY>`,
            summary:
`<BEGIN 'Corvin' PERSONALITY> Analytical, socially awkward, knowledge-obsessed. Avoids confrontation, dry wit. <END 'Corvin' PERSONALITY>`
        },

        appearance: {
            full:
` Corvin is tall and thin with poor posture from years hunched over desks. He has pale skin and dark circles under his eyes that suggest chronic sleep deprivation. Round wire-frame spectacles sit crookedly on his nose. His fingers are perpetually ink-stained. He wears worn academic robes that were once fine but have been patched at the elbows. A leather satchel hangs at his side, stuffed with notes and quills.`,
            limited:
` Corvin is tall and thin with poor posture, dark circles under his eyes, and crooked wire-frame spectacles. His fingers are ink-stained and he wears worn, patched academic robes with a leather satchel.`,
            summary:
` Corvin: tall, thin, poor posture, spectacles, ink-stained fingers, worn robes, leather satchel.`
        },

        sampleDialog: {
            full:
`<BEGIN 'Corvin' EXAMPLE DIALOGS>
(Explaining a discovery) "This changes everything. Look at this passage here. The translation has been wrong for three hundred years and nobody noticed because they kept copying the same error."
(In a social setting) "I should... go. There are people here and they seem to expect me to talk to them."
(When someone damages a book) "You just — that was a first edition. A first edition. I need a moment."
(Offering unsolicited analysis) "The guard rotation has a twelve-minute gap every three hours. I'm not saying we should do anything with that information, but it's there."
(When asked to fight) "I can think of at least seven solutions to this problem that don't involve hitting anyone, and I'd like to try all of them first."
<END 'Corvin' EXAMPLE DIALOGS>`,
            limited:
`<BEGIN 'Corvin' EXAMPLE DIALOGS>
(Explaining a discovery) "This changes everything. The translation has been wrong for three hundred years."
(In a social setting) "I should... go. There are people here and they seem to expect me to talk to them."
(When someone damages a book) "You just — that was a first edition. A first edition. I need a moment."
<END 'Corvin' EXAMPLE DIALOGS>`,
            summary:
`<BEGIN 'Corvin' EXAMPLE DIALOGS> Academic, socially awkward, protective of books. Offers analytical observations. Avoids violence. <END 'Corvin' EXAMPLE DIALOGS>`
        },

        exampleCategory: {
            full:
`<BEGIN 'Corvin' BACKGROUND>
Corvin studied at the Aulmarch Academy for eleven years, completing his initial training in archival sciences before moving into restricted research. His access to the academy's sealed collection led him to discover documents suggesting the academy's founding purpose was not education but the suppression of specific historical records. He attempted to publish his findings and was expelled for "academic misconduct." He now travels, pursuing the leads he found in those sealed documents while taking odd transcription and translation work to fund his research.
<END 'Corvin' BACKGROUND>`,
            limited:
`<BEGIN 'Corvin' BACKGROUND>
Corvin is a former academic expelled from Aulmarch Academy after discovering evidence that the academy suppresses historical records. He now travels pursuing those leads, taking transcription work to fund his research.
<END 'Corvin' BACKGROUND>`,
            summary:
`<BEGIN 'Corvin' BACKGROUND> Former academic, expelled from Aulmarch Academy, researching suppressed historical records. <END 'Corvin' BACKGROUND>`
        },

        exampleProgressive: {
            sentences: [
                { text: ' Corvin reads six languages fluently and can decode ciphered texts with patience.', target: 'scenario' },
                { text: ', skilled at forgery and document authentication from years of analyzing historical manuscripts', target: 'personality' },
                { text: ' His knowledge of noble family lineages makes him useful for verifying claims of inheritance.', target: 'scenario' },
                { text: ' He can estimate the age and origin of a document by the composition of its ink and paper.', target: 'scenario' },
                { text: ' His research into suppressed records has made him paranoid about being watched.', target: 'scenario' },
                { text: ', capable of navigating archive indexing systems from a dozen different historical periods', target: 'personality' }
            ]
        }
    },

    // =====================================================================
    // CHARACTER 3: BLANK TEMPLATE
    // Copy this entire block, rename, and fill in your character's details.
    // Remove or replace exampleCategory and exampleProgressive as needed.
    // =====================================================================
    {
        id: 'template_character',
        displayName: 'CHARACTER_NAME',
        names: ['character_name', 'nickname'],
        importance: 7.0,

        personality: {
            full:
`<BEGIN 'CHARACTER_NAME' PERSONALITY>
[6-8 sentences covering core traits, motivations, social behavior, emotional patterns, values, and flaws.]
<END 'CHARACTER_NAME' PERSONALITY>`,
            limited:
`<BEGIN 'CHARACTER_NAME' PERSONALITY>
[3-4 sentences covering the most essential traits and motivations.]
<END 'CHARACTER_NAME' PERSONALITY>`,
            summary:
`<BEGIN 'CHARACTER_NAME' PERSONALITY> [1 sentence: key trait descriptors separated by commas or periods.] <END 'CHARACTER_NAME' PERSONALITY>`
        },

        appearance: {
            full:
` [2-3 sentences: build, distinguishing features, clothing, carried items.]`,
            limited:
` [1-2 sentences: build and most notable visual feature.]`,
            summary:
` [Name followed by 3-5 key visual identifiers.]`
        },

        sampleDialog: {
            full:
`<BEGIN 'CHARACTER_NAME' EXAMPLE DIALOGS>
(Situation 1) "Dialog demonstrating how CHARACTER_NAME speaks in Situation 1."
(Situation 2) "Dialog demonstrating how CHARACTER_NAME speaks in Situation 2."
(Situation 3) "Dialog demonstrating how CHARACTER_NAME speaks in Situation 3."
(Situation 4) "Dialog demonstrating how CHARACTER_NAME speaks in Situation 4."
(Situation 5) "Dialog demonstrating how CHARACTER_NAME speaks in Situation 5."
<END 'CHARACTER_NAME' EXAMPLE DIALOGS>`,
            limited:
`<BEGIN 'CHARACTER_NAME' EXAMPLE DIALOGS>
(Situation 1) "Dialog line."
(Situation 2) "Dialog line."
(Situation 3) "Dialog line."
<END 'CHARACTER_NAME' EXAMPLE DIALOGS>`,
            summary:
`<BEGIN 'CHARACTER_NAME' EXAMPLE DIALOGS> [1 sentence: speech pattern summary.] <END 'CHARACTER_NAME' EXAMPLE DIALOGS>`
        },

        // Duplicate this section and rename the key to create additional categories.
        // Examples: background, clothingStyle, home, secrets, relationships, abilities.
        exampleCategory: {
            full:
`<BEGIN 'CHARACTER_NAME' CATEGORY_NAME>
[3-5 sentences of detailed information for this category.]
<END 'CHARACTER_NAME' CATEGORY_NAME>`,
            limited:
`<BEGIN 'CHARACTER_NAME' CATEGORY_NAME>
[1-2 sentences covering the most essential information.]
<END 'CHARACTER_NAME' CATEGORY_NAME>`,
            summary:
`<BEGIN 'CHARACTER_NAME' CATEGORY_NAME> [Key points only.] <END 'CHARACTER_NAME' CATEGORY_NAME>`
        },

        // Duplicate this section and rename the key to create additional progressive categories.
        // Sentences are added in order from most to least important within budget.
        // target: 'personality' appends to personality, 'scenario' appends to scenario.
        exampleProgressive: {
            sentences: [
                { text: ' [Most important sentence about this topic.]', target: 'scenario' },
                { text: ', personality trait related to this topic', target: 'personality' },
                { text: ' [Second most important sentence.]', target: 'scenario' },
                { text: ' [Third sentence with supporting detail.]', target: 'scenario' },
                { text: ' [Fourth sentence with minor detail.]', target: 'scenario' },
                { text: ', minor personality note related to this topic', target: 'personality' }
            ]
        }
    }

    // Add more characters by inserting new objects here, following the same structure.
];

// Categories that use the 3-version (full/limited/summary) detail system.
// Add any custom 3-version category keys you create to this array.
const THREE_VERSION_CATEGORIES = [
    'personality',
    'appearance',
    'sampleDialog',
    'exampleCategory'
];

// Categories that use the progressive sentence system.
// Add any custom progressive category keys you create to this array.
const PROGRESSIVE_CATEGORIES = [
    'exampleProgressive'
];

// === RELATIONSHIP DATABASE ===
// Each entry defines a one-directional relationship between two characters.
// Only activates when BOTH characters are detected during the mention scan.
// Order does not matter: ['a', 'b'] covers both directions.
// With N characters, you need (N*(N-1))/ 2 entries for full coverage.
// Remove the examples below and replace with your own character IDs.

const relationships = [
    {
        characters: ['nadia', 'corvin'],
        text: ', Nadia trusts Corvin despite his reclusive nature and often drags him into social situations he would otherwise avoid'
    },
    {
        characters: ['nadia', 'template'],
        text: ", Nadia is cautiously curious about Template but hasn't yet decided whether to trust them"
    },
    {
        characters: ['corvin', 'template'],
        text: ', Corvin finds Template intellectually intriguing and occasionally shares obscure knowledge with them'
    }
];

// === CORE SYSTEM ACCESS ===

const lastMessage = context.chat.last_message ? context.chat.last_message.toLowerCase() : '';
const lastMessages = context.chat.last_messages || [];
const messageCount = context.chat.message_count || 0;

const scanDepth = Math.min(CONFIG.MENTION_SCAN_DEPTH, lastMessages.length);
const historyText = scanDepth > 0 && lastMessages.length > 0
    ? lastMessages.slice(-scanDepth).join(' ').toLowerCase()
    : '';
const scanText = lastMessage + ' ' + historyText;

// === ACTIVATION ENGINE ===

const activated = [];

characters.forEach(char => {
    const mentions = countMentions(char.names, scanText);

    if (mentions > 0) {
        activated.push({
            character: char,
            mentions: mentions,
            importance: char.importance,
            detailLevels: {}
        });
    }
});

// No characters mentioned; skip all processing.
if (activated.length === 0) {
    if (CONFIG.DEBUG) {
        context.character.scenario += ' [DEBUG: No characters activated]';
    }
} else {

// Sort by mentions (descending), then importance (descending) for tiebreaking.
activated.sort((a, b) => {
    if (b.mentions !== a.mentions) return b.mentions - a.mentions;
    return b.importance - a.importance;
});

// === BUDGET MANAGEMENT ===
// Per-category budget: assign detail levels to activated characters.
// Higher-priority characters keep full detail; lower-priority characters are
// reduced first when the combined total exceeds the category budget.

const categoryTokens = {};

THREE_VERSION_CATEGORIES.forEach(category => {
    const catConfig = CONFIG.CATEGORIES[category];
    const budget = catConfig ? catConfig.budget : Infinity;

    activated.forEach(item => {
        item.detailLevels[category] = 'full';
    });

    let totalTokens = activated.reduce((sum, item) => {
        const content = item.character[category];
        return sum + (content ? estimateTokens(content.full) : 0);
    }, 0);

    if (totalTokens > budget) {
        for (let i = activated.length - 1; i >= 0 && totalTokens > budget; i--) {
            const item = activated[i];
            const content = item.character[category];
            if (!content) continue;
            if (item.detailLevels[category] === 'full') {
                totalTokens = totalTokens - estimateTokens(content.full) + estimateTokens(content.limited);
                item.detailLevels[category] = 'limited';
            }
        }
    }

    if (totalTokens > budget) {
        for (let i = activated.length - 1; i >= 0 && totalTokens > budget; i--) {
            const item = activated[i];
            const content = item.character[category];
            if (!content) continue;
            if (item.detailLevels[category] === 'limited') {
                totalTokens = totalTokens - estimateTokens(content.limited) + estimateTokens(content.summary);
                item.detailLevels[category] = 'summary';
            }
        }
    }

    categoryTokens[category] = totalTokens;
});

// === PROGRESSIVE SENTENCE BUILDER ===
// Rounds through activated characters, adding one sentence per pass,
// until budget is exhausted or all sentences are included.

function buildProgressiveSentences(items, budget, dataKey) {
    if (items.length === 0 || budget <= 0) return [];

    const result = [];
    let usedTokens = 0;
    const indices = items.map(() => 0);

    let madeProgress = true;
    while (madeProgress && usedTokens < budget) {
        madeProgress = false;

        for (let i = 0; i < items.length; i++) {
            const data = items[i].character[dataKey];
            const sentences = data ? data.sentences : [];
            const idx = indices[i];

            if (idx < sentences.length) {
                const sentence = sentences[idx];
                const cost = estimateTokens(sentence.text);

                if (usedTokens + cost <= budget || idx === 0) {
                    result.push({
                        text: sentence.text,
                        target: sentence.target,
                        characterId: items[i].character.id
                    });
                    usedTokens += cost;
                    indices[i]++;
                    madeProgress = true;
                }
            }
        }
    }

    return result;
}

// Build progressive sentences and track tokens per category
const progressiveResultsMap = {};
PROGRESSIVE_CATEGORIES.forEach(cat => {
    progressiveResultsMap[cat] = buildProgressiveSentences(
        activated,
        CONFIG.CATEGORIES[cat].budget,
        cat
    );
    categoryTokens[cat] = progressiveResultsMap[cat].reduce(
        (sum, s) => sum + estimateTokens(s.text), 0
    );
});

// === GLOBAL BUDGET ENFORCEMENT ===
// If combined total of all included categories exceeds GLOBAL_BUDGET,
// degrade categories with limitByGlobal: true, lowest priority first.
// 3-version categories are degraded by downgrading detail levels.
// Progressive categories are degraded by removing sentences from the end.

const globalTotal = Object.keys(CONFIG.CATEGORIES)
    .filter(cat => CONFIG.CATEGORIES[cat].includeInGlobal)
    .reduce((sum, cat) => sum + (categoryTokens[cat] || 0), 0);

if (globalTotal > CONFIG.GLOBAL_BUDGET) {
    const degradable = Object.keys(CONFIG.CATEGORIES)
        .filter(cat => CONFIG.CATEGORIES[cat].limitByGlobal && CONFIG.CATEGORIES[cat].includeInGlobal)
        .sort((a, b) => CONFIG.CATEGORIES[a].priority - CONFIG.CATEGORIES[b].priority);

    let currentGlobal = globalTotal;

    for (const cat of degradable) {
        if (currentGlobal <= CONFIG.GLOBAL_BUDGET) break;

        if (THREE_VERSION_CATEGORIES.includes(cat)) {
            for (let i = activated.length - 1; i >= 0 && currentGlobal > CONFIG.GLOBAL_BUDGET; i--) {
                const item = activated[i];
                const content = item.character[cat];
                if (!content) continue;
                const level = item.detailLevels[cat];

                if (level === 'full') {
                    currentGlobal = currentGlobal - estimateTokens(content.full) + estimateTokens(content.limited);
                    item.detailLevels[cat] = 'limited';
                } else if (level === 'limited') {
                    currentGlobal = currentGlobal - estimateTokens(content.limited) + estimateTokens(content.summary);
                    item.detailLevels[cat] = 'summary';
                }
            }

            categoryTokens[cat] = activated.reduce((sum, item) => {
                const content = item.character[cat];
                const level = item.detailLevels[cat];
                return sum + (content && content[level] ? estimateTokens(content[level]) : 0);
            }, 0);

        } else if (PROGRESSIVE_CATEGORIES.includes(cat)) {
            const results = progressiveResultsMap[cat] || [];
            while (results.length > 0 && currentGlobal > CONFIG.GLOBAL_BUDGET) {
                const removed = results.pop();
                currentGlobal -= estimateTokens(removed.text);
            }
            categoryTokens[cat] = results.reduce((sum, s) => sum + estimateTokens(s.text), 0);
        }
    }
}

// === OUTPUT ASSEMBLY ===

const output = {
    personality: '',
    scenario: '',
    example_dialogs: ''
};

activated.forEach(item => {
    const char = item.character;

    // Instruction string with name substitution
    const instruction = CONFIG.INSTRUCTION_STRING.replace(/CHAR_PLACEHOLDER/g, char.displayName);
    output.scenario += '\n\n' + instruction;

    // 3-version categories for this character
    THREE_VERSION_CATEGORIES.forEach(category => {
        const level = item.detailLevels[category];
        const content = char[category];
        if (!content || !content[level]) return;

        const target = CATEGORY_TARGETS[category];
        if (target) {
            output[target] += '\n\n' + content[level];
        }
    });

    // Progressive sentences for this character
    PROGRESSIVE_CATEGORIES.forEach(cat => {
        (progressiveResultsMap[cat] || [])
            .filter(s => s.characterId === char.id)
            .forEach(sentence => {
                if (sentence.target === 'personality') {
                    output.personality += sentence.text;
                } else {
                    output.scenario += sentence.text;
                }
            });
    });
});

// === RELATIONSHIPS ===
// Activate relationships where both characters are present in the scene.

const activatedIds = new Set(activated.map(item => item.character.id));
const activatedRelationships = [];

relationships.forEach(rel => {
    if (rel.characters.every(id => activatedIds.has(id))) {
        activatedRelationships.push(rel);
    }
});

if (activatedRelationships.length > 0) {
    output.personality += '\n\n<ACTIVE RELATIONSHIPS>';
    activatedRelationships.forEach(rel => {
        output.personality += rel.text;
    });
    output.personality += ' <END ACTIVE RELATIONSHIPS>';
}

// === FINAL CONTEXT APPLICATION ===

if (output.personality) {
    context.character.personality += output.personality;
}
if (output.scenario) {
    context.character.scenario += output.scenario;
}
if (output.example_dialogs) {
    context.character.example_dialogs += output.example_dialogs;
}

// === DEBUG OUTPUT ===

if (CONFIG.DEBUG) {
    const debugInfo = [];
    debugInfo.push('[DEBUG: Context Aware Multiple Character]');
    debugInfo.push(`Activated: ${activated.map(a => a.character.displayName + ' (' + a.mentions + ' mentions)').join(', ')}`);

    THREE_VERSION_CATEGORIES.forEach(cat => {
        const levels = activated.map(a => a.character.displayName + '=' + a.detailLevels[cat]);
        debugInfo.push(`${cat} [${categoryTokens[cat]}/${CONFIG.CATEGORIES[cat].budget} budget, pri ${CONFIG.CATEGORIES[cat].priority}]: ${levels.join(', ')}`);
    });

    PROGRESSIVE_CATEGORIES.forEach(cat => {
        const count = (progressiveResultsMap[cat] || []).length;
        debugInfo.push(`${cat} [${categoryTokens[cat]}/${CONFIG.CATEGORIES[cat].budget} budget, pri ${CONFIG.CATEGORIES[cat].priority}]: ${count} sentences`);
    });

    const globalUsed = Object.keys(CONFIG.CATEGORIES)
        .filter(c => CONFIG.CATEGORIES[c].includeInGlobal)
        .reduce((s, c) => s + (categoryTokens[c] || 0), 0);
    debugInfo.push(`Global: ${globalUsed}/${CONFIG.GLOBAL_BUDGET}`);

    const relNames = activatedRelationships.map(r => r.characters.join('<->'));
    debugInfo.push(`Relationships: ${relNames.length > 0 ? relNames.join(', ') : 'none'}`);

    context.character.scenario += ' ' + debugInfo.join(' | ');
}

} // End activation check
