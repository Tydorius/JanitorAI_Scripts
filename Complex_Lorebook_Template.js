/**
 * JANITOR AI COMPLEX LOREBOOK TEMPLATE
 *
 * This template demonstrates how to create a complex, dynamic lorebook system
 * for Janitor AI Scripts. Use this as a foundation for your own world-building.
 *
 * IMPORTANT: This template shows advanced techniques including:
 * - Dynamic lore activation based on context
 * - Cascading keyword triggers
 * - Timeline-based events
 * - Stat parsing and reactions
 * - Priority-based lore ordering
 * - Conditional filtering
 *
 * Compatible with Nine API v1
 */

// === CORE SYSTEM (DO NOT MODIFY) ===
// These lines access the chat context and are required for the script to function
const lastMessage = context.chat.last_message.toLowerCase();
const lastResponse = context.chat.last_message;
const messageCount = context.chat.message_count;

// === UTILITY FUNCTIONS (DO NOT MODIFY STRUCTURE) ===
// This function safely extracts numerical stats from AI responses
// You can modify the regex pattern if your stat format is different
function getStat(statName, lastResponse) {
    // MODIFY THIS REGEX if your stat format differs from "**StatName:** 50%"
    const regex = new RegExp(`\\*\\*${statName}:\\*\\*\\s*(\\d+)\\s*%?`, 'i');
    const match = lastResponse.match(regex);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return null;
}

// === LOREBOOK DATABASE (MODIFY THIS SECTION) ===
// This is where you define your world's lore entries
// Each entry can contain: keywords, priority, minMessages, category, personality, scenario, triggers, filters
const loreEntries = [

    // === EXAMPLE CATEGORY: NATIONS & POLITICS ===
    // Replace with your own nations, kingdoms, or political entities
    {
        keywords: ['kingdom of example', 'example kingdom', 'the kingdom'],
        priority: 10,                    // Higher numbers activate first (0-11 range recommended)
        minMessages: 0,                  // Minimum chat messages before this can activate
        category: 'nation_example',      // Internal category for organization
        personality: ', familiar with the politics of the Example Kingdom',
        scenario: ' The Example Kingdom is a powerful nation known for its advanced magic and complex politics. It serves as the primary antagonist force in this world.',
        triggers: ['magic', 'politics', 'power']  // Keywords that can trigger other entries
    },
    {
        keywords: ['city republic', 'the republic', 'merchant city'],
        priority: 9,
        minMessages: 0,
        category: 'nation_republic',
        filters: { requiresAny: ['trade', 'merchant', 'commerce'] },  // Only activates if these words are present
        personality: ', understanding the merchant-driven politics of the City Republic',
        scenario: ' The City Republic is a wealthy trading hub controlled by powerful merchant guilds. Money speaks louder than blood here.',
        triggers: ['wealth', 'guild', 'trade']
    },
    {
        keywords: ['mountain clans', 'highland tribes', 'northern clans'],
        priority: 8,
        minMessages: 2,                  // Requires at least 2 messages in chat
        category: 'nation_clans',
        filters: {
            requiresAny: ['mountain', 'highland', 'tribe'],
            notWith: ['enemy', 'hostile']  // Won't activate if these words are present
        },
        personality: ', respecting the warrior traditions of the Mountain Clans',
        scenario: ' The Mountain Clans are fierce warriors who value honor above all else. They live in the harsh northern peaks and follow ancient traditions.',
        triggers: ['warrior', 'honor', 'tradition']
    },

    // === EXAMPLE CATEGORY: ORGANIZATIONS ===
    // Replace with your own guilds, temples, or organizations
    {
        keywords: ['mages guild', 'guild of mages', 'arcane guild'],
        priority: 9,
        minMessages: 0,
        category: 'org_mages',
        personality: ', knowledgeable about the workings of the Mages Guild',
        scenario: ' The Mages Guild controls all magical education and licensing. No magic may be practiced legally without their approval.',
        triggers: ['magic', 'education', 'license']
    },
    {
        keywords: ['temple of light', 'church of light', 'holy temple'],
        priority: 10,
        minMessages: 1,
        category: 'org_temple',
        personality: ', aware of the political influence of the Temple of Light',
        scenario: ' The Temple of Light is the dominant religious institution, wielding significant political power and claiming divine mandate for their actions.',
        triggers: ['divine', 'religious', 'political']
    },

    // === EXAMPLE CATEGORY: RACES ===
    // Replace with your own fantasy races and their characteristics
    {
        keywords: ['elf', 'elves', 'elven'],
        priority: 8,
        minMessages: 0,
        category: 'race_elf',
        personality: ', possessing the grace and long-lived wisdom of elves',
        scenario: ' Elves are an ancient race with powerful magic and long lifespans. They often view shorter-lived races with a mixture of pity and condescension.',
        triggers: ['ancient', 'magic', 'wisdom']
    },
    {
        keywords: ['dwarf', 'dwarves', 'dwarven'],
        priority: 8,
        minMessages: 0,
        category: 'race_dwarf',
        personality: ', holding the craftsmanship values and clan loyalty of dwarves',
        scenario: ' Dwarves are master craftsmen and miners, organized into powerful clans. Their society values skill, tradition, and clan honor above individual achievement.',
        triggers: ['craft', 'clan', 'tradition']
    },

    // === EXAMPLE CATEGORY: IMPORTANT PERSONS ===
    // Replace with your own key NPCs and characters
    {
        keywords: ['emperor marcus', 'the emperor', 'marcus aurelius'],
        priority: 10,
        minMessages: 2,
        category: 'npc_emperor',
        filters: { requiresAny: ['emperor', 'empire', 'ruler'] },
        personality: ', aware of Emperor Marcus\'s iron-fisted rule',
        scenario: ' Emperor Marcus Aurelius rules the Example Kingdom with absolute authority. He is known for his military genius and ruthless suppression of dissent.',
        triggers: ['authority', 'military', 'suppression']
    },
    {
        keywords: ['archmage elena', 'elena the wise', 'grand archmage'],
        priority: 9,
        minMessages: 3,
        category: 'npc_archmage',
        filters: { requiresAny: ['magic', 'mage', 'arcane'] },
        personality: ', recognizing the vast magical knowledge of Archmage Elena',
        scenario: ' Archmage Elena leads the Mages Guild and serves as the Emperor\'s chief magical advisor. Her knowledge of ancient magic is unparalleled.',
        triggers: ['knowledge', 'ancient', 'advisor']
    },

    // === EXAMPLE CATEGORY: LOCATIONS ===
    // Replace with your own important locations
    {
        keywords: ['crystal tower', 'tower of crystals', 'the tower'],
        priority: 10,
        minMessages: 2,
        category: 'location_tower',
        filters: { requiresAny: ['tower', 'crystal', 'magic'] },
        personality: ', sensing the magical energies emanating from the Crystal Tower',
        scenario: ' The Crystal Tower serves as the headquarters of the Mages Guild. Its crystalline structure amplifies magical power and can be seen from miles away.',
        triggers: ['magic', 'amplify', 'power']
    },

    // === EXAMPLE CATEGORY: ARTIFACTS & ITEMS ===
    // Replace with your own magical items and artifacts
    {
        keywords: ['crown of dominion', 'royal crown', 'crown of power'],
        priority: 11,
        minMessages: 5,
        category: 'artifact_crown',
        filters: { requiresAny: ['crown', 'royal', 'power'] },
        personality: ', feeling the weight of absolute authority from the Crown of Dominion',
        scenario: ' The Crown of Dominion grants its wearer enhanced leadership abilities and the power to command absolute loyalty. However, it slowly corrupts the wearer with megalomaniacal tendencies.',
        triggers: ['leadership', 'loyalty', 'corruption']
    },

    // === EXAMPLE CATEGORY: HISTORICAL EVENTS ===
    // Replace with your own world history
    {
        keywords: ['war of succession', 'succession war', 'the great war'],
        priority: 9,
        minMessages: 3,
        category: 'history_war',
        filters: { requiresAny: ['war', 'history', 'succession'] },
        personality: ', carrying knowledge of the devastating War of Succession',
        scenario: ' The War of Succession tore the realm apart fifty years ago when three claimants fought for the throne. The scars of that conflict still influence modern politics.',
        triggers: ['conflict', 'politics', 'throne']
    }

    // === ADD YOUR OWN CATEGORIES HERE ===
    // You can add more categories like:
    // - Magic Systems
    // - Religions & Deities
    // - Technology Levels
    // - Economic Systems
    // - Cultural Traditions
    // - Monsters & Creatures
    // - etc.
];

// === ACTIVATION ENGINE (DO NOT MODIFY) ===
// This section handles the logic for activating lore entries
// The system works in two passes to allow cascading activation
let activatedEntries = [];
let triggeredKeywords = [];

// First pass: Check direct keyword matches
loreEntries.forEach(entry => {
    if (messageCount < entry.minMessages) return;
    const hasKeyword = entry.keywords.some(keyword => lastMessage.includes(keyword));
    if (!hasKeyword) return;
    if (entry.probability && Math.random() > entry.probability) return;
    if (entry.filters) {
        if (entry.filters.notWith && entry.filters.notWith.some(word => lastMessage.includes(word))) { return; }
        if (entry.filters.requiresAny && !entry.filters.requiresAny.some(word => lastMessage.includes(word))) { return; }
        if (entry.filters.requiresAll && !entry.filters.requiresAll.every(word => lastMessage.includes(word))) { return; }
    }
    activatedEntries.push(entry);
    if (entry.triggers) {
        entry.triggers.forEach(trigger => triggeredKeywords.push(trigger));
    }
});

// Second pass: Recursive activation (triggered by other entries)
if (triggeredKeywords.length > 0) {
    loreEntries.forEach(entry => {
        if (activatedEntries.includes(entry)) return;
        if (messageCount < entry.minMessages) return;
        const isTriggered = entry.keywords.some(keyword => triggeredKeywords.some(trigger => keyword.includes(trigger) || trigger.includes(keyword)));
        if (isTriggered) {
            if (entry.probability && Math.random() > entry.probability) return;
            if (entry.filters) {
                if (entry.filters.notWith && entry.filters.notWith.some(word => lastMessage.includes(word))) { return; }
                if (entry.filters.requiresAny && !entry.filters.requiresAny.some(word => lastMessage.includes(word))) { return; }
                if (entry.filters.requiresAll && !entry.filters.requiresAll.every(word => lastMessage.includes(word))) { return; }
            }
            activatedEntries.push(entry);
        }
    });
}

// === APPLY LORE (DO NOT MODIFY) ===
// This section applies the activated lore to the character context
activatedEntries
    .sort((a, b) => b.priority - a.priority)
    .forEach(entry => {
        if (entry.personality && !context.character.personality.includes(entry.personality)) {
             context.character.personality += entry.personality;
        }
        if (entry.scenario && !context.character.scenario.includes(entry.scenario)) {
            context.character.scenario += entry.scenario;
        }
    });

// === DYNAMIC TIMELINE EVENTS (MODIFY THIS SECTION) ===
// This section creates events based on parsed stats from the AI's responses
// MODIFY the stat names to match your character card's format

// Attempt to read key stats - MODIFY these stat names as needed
const day = getStat('Day', lastResponse);                    // MODIFY: Change 'Day' to your day counter stat
const power = getStat('Power', lastResponse);               // MODIFY: Change to your power stat name
const influence = getStat('Influence', lastResponse);       // MODIFY: Change to your influence stat name
const threatLevel = getStat('Threat Level', lastResponse);  // MODIFY: Change to your threat stat name

// Only run timeline logic if we can find the day count
if (day !== null) {

    // === EARLY TIMELINE EVENTS (MODIFY THESE) ===
    if (day === 1 && messageCount <= 2) {
        context.character.scenario += ' You awaken in your stronghold, feeling the stirring of ancient power. The world outside remains unaware of your awakening, but that will soon change.';
        context.character.personality += ', aware of their growing power and destiny';
    }

    // === WEEKLY EVENTS (MODIFY THESE) ===
    if (day === 7) {
        context.character.scenario += ' [World Event] A week has passed. Rumors of strange happenings begin to spread in nearby settlements.';
    }
    if (day === 14) {
        context.character.scenario += ' [World Event] Two weeks have passed. The local authorities have taken notice and begun investigating the disturbances.';
    }
    if (day === 30) {
        context.character.scenario += ' [World Event] A month has passed. Your activities have attracted the attention of major powers in the region.';
    }

    // === STAT-BASED DYNAMIC EVENTS (MODIFY THESE) ===
    // These events trigger based on your stats reaching certain thresholds
    if (power !== null && power >= 75 && day >= 20) {
        context.character.scenario += ' [World Reaction] Your growing power has been noticed by magical sensors across the realm.';
    }

    if (influence !== null && influence >= 60 && day >= 15) {
        context.character.scenario += ' [World Reaction] Your expanding influence has begun to shift the political landscape.';
    }

    if (threatLevel !== null && threatLevel >= 80) {
        context.character.scenario += ' [Critical Alert] You are now considered a major threat by the established powers.';
        context.character.personality += ', aware that major forces are now mobilizing against them';
    }

    // === KEYWORD-BASED REACTIONS (MODIFY THESE) ===
    // These react to specific words or actions in the AI's last response
    const lastResponseLower = lastResponse.toLowerCase();

    // MODIFY: Change these keyword arrays to match your world's concepts
    const militaryKeywords = ['army', 'soldiers', 'attack', 'invasion', 'military'];
    if (militaryKeywords.some(keyword => lastResponseLower.includes(keyword))) {
        context.character.scenario += ' [World Reaction] Your military activities have not gone unnoticed. Enemy forces begin mobilizing in response.';
        context.character.personality += ', aware that military confrontation is escalating';
    }

    const diplomacyKeywords = ['alliance', 'treaty', 'negotiate', 'diplomacy', 'ambassador'];
    if (diplomacyKeywords.some(keyword => lastResponseLower.includes(keyword))) {
        context.character.scenario += ' [World Reaction] Your diplomatic overtures have shifted the political balance of power in the region.';
    }

    const magicKeywords = ['spell', 'magic', 'ritual', 'enchantment', 'arcane'];
    if (magicKeywords.some(keyword => lastResponseLower.includes(keyword))) {
        context.character.scenario += ' [World Reaction] The magical energies you\'ve unleashed ripple through the ley lines, alerting sensitive mages to your activities.';
    }

    // MODIFY: Add your own keyword reaction categories here
    // Examples: economy, religion, exploration, research, etc.
}

// === DEBUGGING (OPTIONAL) ===
// Uncomment the line below to see which lore entries are activating
// context.character.scenario += ' [DEBUG: Activated ' + activatedEntries.length + ' entries: ' + activatedEntries.map(e => e.category).join(', ') + ']';

// === TEMPLATE USAGE GUIDE ===
/*
HOW TO USE THIS TEMPLATE:

1. REPLACE THE EXAMPLE LORE:
   - Change all the example nations, characters, and events to match your world
   - Update keywords to reflect your world's terminology
   - Adjust priorities based on what's most important in your setting

2. MODIFY STAT NAMES:
   - Change the stat names in getStat() calls to match your character card
   - Update the stat-based event thresholds as needed

3. CUSTOMIZE TIMELINE EVENTS:
   - Replace the example timeline events with events relevant to your story
   - Adjust the day counts and triggers to match your narrative pace

4. ADD YOUR OWN CATEGORIES:
   - Create new lore entry categories for your world's unique elements
   - Consider: magic systems, religions, technologies, cultures, etc.

5. ADJUST KEYWORD REACTIONS:
   - Modify the keyword arrays to match concepts important to your world
   - Add new reaction categories for world-specific actions

6. TEST AND ITERATE:
   - Enable debugging to see which entries activate
   - Adjust priorities and filters based on how the system performs
   - Fine-tune minMessages values for better pacing

ADVANCED FEATURES YOU CAN USE:

- probability: Add a 'probability: 0.5' field to make entries activate randomly
- Complex filters: Use requiresAll for AND logic, notWith for exclusions
- Cascading triggers: Use the 'triggers' array to activate related lore
- Conditional personality: Different personality traits based on context
- Dynamic scenario building: Layer scenario additions for rich world-building

BEST PRACTICES:

- Keep keywords specific enough to avoid unwanted activation
- Use priorities to control which lore takes precedence
- Don't overload the AI with too many simultaneous lore entries
- Test with various conversation flows to ensure good activation patterns
- Use categories for organization and debugging

Remember: This is a template - make it your own!
*/