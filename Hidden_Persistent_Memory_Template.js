"use worker";

/**
 * JANITOR AI HIDDEN PERSISTENT MEMORY TEMPLATE
 *
 * A modular persistent state system using zero-width unicode characters for
 * invisible data transmission between Script instances. Replaces visible flag
 * strings (e.g., **FLAGS:** XX:XX:XX) with encoding that is invisible to the
 * user but readable by the Script on each cycle.
 *
 * COMPONENTS (each can be used independently):
 * - Weather Tracking (flat context, minimal tokens)
 * - Location Tracking (3-tier detail, scene shift detection)
 * - Emotional State (16-bit bitmask, 8 emotion axes)
 * - Inventory (bitfield ownership tracking)
 * - Schedule/Time (day counter with event triggers)
 * - Character Presence (multi-character arrival/departure detection)
 *
 * HOW IT WORKS:
 * - Script encodes state as decimal digits mapped to zero-width unicode chars
 * - Encoded string is injected into context as an instruction for the LLM
 * - LLM reproduces the invisible string at start/end of its response
 * - On next cycle, Script scans recent messages to find and decode the state
 * - State updates based on keyword triggers, then re-encodes for next cycle
 *
 * REQUIRES: "use worker" directive for ES6 support
 * Compatible with JanitorAI Scripts API (Nine API v1)
 */

// ===== FEATURE TOGGLE CONFIGURATION =====
const FEATURES = {
    // Core encoding system (ALWAYS KEEP TRUE - disabling breaks everything)
    CORE_ENCODING: true,

    // Individual components (set to false to disable any component)
    WEATHER_TRACKING: true,
    LOCATION_TRACKING: true,
    EMOTION_TRACKING: true,
    INVENTORY_TRACKING: true,
    SCHEDULE_TRACKING: true,
    CHARACTER_TRACKING: true,

    // System features
    SCENE_SHIFT_DETECTION: true,
    EMOTION_DECAY: true,
    TOKEN_MANAGEMENT: true,
    DEBUG_MODE: false
};

/**
 * SAFE COMPONENT REMOVAL GUIDE:
 *
 * TO DISABLE A COMPONENT:
 * - Set its toggle to false in FEATURES above, OR
 * - Delete the corresponding COMPONENT section and its data table
 *
 * TO PERMANENTLY REMOVE A COMPONENT:
 * 1. Delete its data table from the DATA TABLES section
 * 2. Delete its COMPONENT PROCESSING section
 * 3. Remove its entry from DEFAULT_STATE
 * 4. Remove its entry in buildStateString()
 * 5. Remove its output block in OUTPUT ASSEMBLY
 *
 * CRITICAL SECTIONS (NEVER DELETE):
 * - CORE: ZERO-WIDTH ENCODING/DECODING
 * - CORE: STATE EXTRACTION
 * - CORE: STATE INJECTION
 * - OUTPUT ASSEMBLY
 *
 * TO ADD A CUSTOM COMPONENT:
 * 1. Create a data table in the DATA TABLES section
 * 2. Add its CATEGORY_ID to the constants
 * 3. Add default value to DEFAULT_STATE
 * 4. Add processing logic in a new COMPONENT PROCESSING section
 * 5. Add output building in OUTPUT ASSEMBLY
 * 6. Add entry in buildStateString()
 */

// ===== CONFIGURATION =====
const CONFIG = {
    // Maximum character budget for scenario additions
    MAX_SCENARIO_CHARS: 600,
    // Maximum character budget for personality additions
    MAX_PERSONALITY_CHARS: 400,
    // How many messages to scan backward for state data
    SEARCH_DEPTH: 10,
    // Scene shift weight threshold (higher = less sensitive)
    SCENE_SHIFT_THRESHOLD: 4,
    // Emotion decay rate per cycle (1 = one step per cycle with no triggers)
    EMOTION_DECAY_RATE: 1
};

// ===== CORE: ZERO-WIDTH ENCODING/DECODING =====
// DO NOT MODIFY - This section handles all invisible data transmission

const ZW_MAP = {
    '0': '\u200B',  // Zero-Width Space
    '1': '\u200C',  // Zero-Width Non-Joiner
    '2': '\u200D',  // Zero-Width Joiner
    '3': '\uFEFF',  // Zero-Width No-Break Space
    '4': '\u2060',  // Word Joiner
    '5': '\u2061',  // Function Application
    '6': '\u2062',  // Invisible Times
    '7': '\u2063',  // Invisible Separator
    '8': '\u200E',  // Left-to-Right Mark
    '9': '\u200F'   // Right-to-Left Mark
};

const REVERSE_MAP = Object.fromEntries(
    Object.entries(ZW_MAP).map(([k, v]) => [v, k])
);

// Header and footer markers (ZWJ ZWJ) frame the state block for regex extraction
const STATE_HEADER = '\u200D\u200D';
const STATE_FOOTER = '\u200D\u200D';

// Regex to find encoded state blocks between header/footer markers
const STATE_REGEX = /\u200D\u200D([\u200B-\u2063\u200E\u200F]+)\u200D\u200D/g;

// Encode a decimal string to zero-width characters
const encodeZW = (decimalStr) => {
    return decimalStr.split('').map(char => ZW_MAP[char] || '').join('');
};

// Decode zero-width characters back to decimal string
const decodeZW = (zwStr) => {
    return zwStr.split('').map(char => REVERSE_MAP[char] || '').join('');
};

// ===== CORE: CATEGORY DEFINITIONS =====
// Each component has a 2-digit category ID used in the state string

const CATEGORY = {
    WEATHER:    '01',
    LOCATION:   '02',
    EMOTION:    '03',
    INVENTORY:  '04',
    SCHEDULE:   '05',
    CHARACTER:  '06'
};

// ===== CORE: DEFAULT STATE =====
// Default values for each component when no prior state exists
// Modify these to match your scenario's starting conditions

const DEFAULT_STATE = {
    [CATEGORY.WEATHER]:   '00',        // Index into WEATHER_TABLE (0 = clear)
    [CATEGORY.LOCATION]:  '00',        // Index into LOCATION_TABLE (0 = first location)
    [CATEGORY.EMOTION]:   '00000',     // 16-bit bitmask as decimal (0 = all emotions off)
    [CATEGORY.INVENTORY]: '00000000',  // 8 items, all unowned (0 = not owned, 1 = owned)
    [CATEGORY.SCHEDULE]:  '001',       // Day counter, padded to 3 digits
    [CATEGORY.CHARACTER]: '000000'     // 6 characters, all absent (0 = absent, 1 = present)
};

// ===== MODULE-SCOPE INTER-SECTION VARIABLES =====
// Store scene shift detection results for use in OUTPUT ASSEMBLY

let sceneShiftCandidate = -1;
let sceneShiftScore = 0;
let sceneShiftDetected = false;

// ===== DATA TABLES =====
// All component data tables defined at module scope for access by both
// component processing and output assembly. When copying a component for
// isolated use, include its table from this section.

// --- Weather Data ---
const WEATHER_TABLE = [
    { id: 'clear',    keywords: ['clear sky', 'sunny', 'sunlight'],    description: 'The sky is clear and bright.' },
    { id: 'cloudy',   keywords: ['cloudy', 'overcast', 'gray sky'],   description: 'Thick clouds blanket the sky, blocking direct sunlight.' },
    { id: 'rain',     keywords: ['rain', 'raining', 'downpour'],      description: 'Rain falls steadily from above.' },
    { id: 'storm',    keywords: ['storm', 'thunder', 'lightning'],    description: 'A violent storm rages overhead, thunder echoing across the landscape.' },
    { id: 'snow',     keywords: ['snow', 'snowing', 'blizzard'],      description: 'Snow falls in thick flakes, accumulating on every surface.' },
    { id: 'fog',      keywords: ['fog', 'mist', 'haze'],             description: 'Dense fog obscures visibility beyond a few paces.' },
    { id: 'windy',    keywords: ['wind', 'windy', 'gale'],           description: 'Strong gusts of wind whip through the area.' },
    { id: 'hail',     keywords: ['hail', 'hailstorm'],               description: 'Hailstones clatter against every exposed surface.' },
    { id: 'heatwave', keywords: ['heatwave', 'scorching', 'sweltering'], description: 'Oppressive heat radiates from the cloudless sky.' },
    { id: 'eclipse',  keywords: ['eclipse', 'darkened sky', 'black sun'], description: 'An unnatural darkness hangs in the sky, the sun partially obscured.' }
];

// --- Location Data ---
const LOCATION_TABLE = [
    {
        id: 'tavern',
        keywords: ['tavern', 'bar', 'inn', 'pub', 'saloon'],
        full: {
            scenario: ' The tavern is a sprawling establishment with worn wooden floors and low-beamed ceilings. Tables are scattered across the main hall, with a long bar running along the far wall. A stone hearth crackles with a modest fire. The air carries the smell of ale, pipe smoke, and roasting meat.',
            personality: ', familiar with tavern culture and the rhythms of crowded common rooms'
        },
        summary: {
            scenario: ' Inside a lively tavern with a central hearth and long bar.',
            personality: ', accustomed to tavern settings'
        },
        bullet: {
            scenario: ' Location: tavern. Hearth, bar, crowded.',
            personality: ', knows taverns'
        }
    },
    {
        id: 'forest',
        keywords: ['forest', 'woods', 'woodland', 'trees'],
        full: {
            scenario: ' The forest canopy filters sunlight into scattered beams that illuminate the undergrowth. Ancient oaks and towering pines form a dense wall of green on all sides. A narrow path winds between moss-covered boulders and fallen logs. Bird calls echo through the branches, occasionally punctuated by the snap of a twig from unseen creatures.',
            personality: ', attuned to the sounds and rhythms of forest environments'
        },
        summary: {
            scenario: ' A dense forest with a narrow winding path. Canopy filters the light.',
            personality: ', comfortable in forest environments'
        },
        bullet: {
            scenario: ' Location: forest. Dense canopy, narrow path.',
            personality: ', knows forests'
        }
    },
    {
        id: 'castle',
        keywords: ['castle', 'keep', 'fortress', 'citadel', 'throne room'],
        full: {
            scenario: ' The castle interior features high stone ceilings supported by arched buttresses. Tapestries depicting ancient battles hang along the corridors. Torches in iron sconces cast flickering shadows across the flagstone floor. Guards patrol at regular intervals, and the distant echo of footsteps reverberates through the halls.',
            personality: ', knowledgeable about castle architecture and courtly protocol'
        },
        summary: {
            scenario: ' Inside a stone castle with tapestries, torches, and patrolling guards.',
            personality: ', familiar with castle layouts'
        },
        bullet: {
            scenario: ' Location: castle. Stone halls, guards, tapestries.',
            personality: ', knows castles'
        }
    },
    {
        id: 'market',
        keywords: ['market', 'bazaar', 'marketplace', 'stalls', 'shop district'],
        full: {
            scenario: ' The market sprawls across an open square lined with canvas stalls and permanent shopfronts. Merchants hawk wares from behind wooden counters stacked with goods. The crowd moves in conflicting currents, buyers haggling over prices while street performers compete for attention. The smell of spices mingles with that of livestock and fresh bread.',
            personality: ', versed in the rhythms of commerce and merchant culture'
        },
        summary: {
            scenario: ' A busy open-air market with stalls, crowds, and street vendors.',
            personality: ', comfortable in market settings'
        },
        bullet: {
            scenario: ' Location: market. Stalls, crowds, vendors.',
            personality: ', knows markets'
        }
    },
    {
        id: 'dungeon',
        keywords: ['dungeon', 'cellar', 'underground', 'catacombs', 'crypt'],
        full: {
            scenario: ' The underground passage is carved from raw stone, slick with moisture that drips from unseen cracks above. Iron torch brackets line the walls at irregular intervals, some still holding guttering flames. The air is cold and carries the faint scent of decay. Distant sounds of dripping water echo through branching corridors.',
            personality: ', alert to the dangers inherent in underground environments'
        },
        summary: {
            scenario: ' A damp underground stone corridor with flickering torchlight and branching passages.',
            personality: ', cautious underground'
        },
        bullet: {
            scenario: ' Location: underground. Stone, damp, dark.',
            personality: ', knows dungeons'
        }
    }
];

// Scene shift detection weights and keywords
const SCENE_SHIFT_WEIGHTS = {
    travel: 3,
    indoor: 2,
    outdoor: 2,
    rest: 1,
    distance: 2
};

const SCENE_SHIFT_KEYWORDS = {
    travel:  ['walk', 'go to', 'head to', 'travel', 'leave', 'arrive', 'enter', 'exit', 'depart', 'make way'],
    indoor:  ['step inside', 'walk in', 'open the door', 'push through', 'go inside'],
    outdoor: ['step outside', 'go outside', 'step out', 'fresh air', 'leave the'],
    rest:    ['sit down', 'settle', 'stay at', 'remain'],
    distance: ['across', 'through the', 'beyond', 'past the', 'far from']
};

// --- Emotion Data ---
const EMOTION_AXES = [
    { name: 'affectionate', triggers: ['praise', 'compliment', 'kind', 'gentle', 'sweet'] },
    { name: 'frustrated',   triggers: ['reject', 'insult', 'refuse', 'deny', 'ignore'] },
    { name: 'anxious',      triggers: ['danger', 'threat', 'risk', 'afraid', 'worry'] },
    { name: 'romantic',     triggers: ['flirt', 'kiss', 'hold hands', 'embrace', 'seduce'] },
    { name: 'playful',      triggers: ['joke', 'tease', 'laugh', 'grin', 'playful'] },
    { name: 'dominant',     triggers: ['command', 'order', 'control', 'submit', 'obey'] },
    { name: 'trust',        triggers: ['confide', 'trust', 'share', 'honest', 'open up'] },
    { name: 'intimacy',     triggers: ['close', 'intimate', 'vulnerable', 'safeword', 'boundaries'] }
];

const EMOTION_LEVELS = ['off', 'low', 'medium', 'high'];

const EMOTION_TEMPLATES = {
    affectionate: {
        low: { personality: ', slightly warm in demeanor' },
        medium: { personality: ', noticeably affectionate and warm' },
        high: { personality: ', deeply affectionate, expressing warmth openly' }
    },
    frustrated: {
        low: { personality: ', mildly irritated' },
        medium: { personality: ', clearly frustrated, struggling to maintain composure' },
        high: { personality: ', intensely frustrated, on the verge of losing patience' }
    },
    anxious: {
        low: { personality: ', slightly uneasy' },
        medium: { personality: ', visibly anxious, thoughts scattered' },
        high: { personality: ', deeply anxious, unable to focus on anything but worry' }
    },
    romantic: {
        low: { personality: ', with a hint of romantic interest' },
        medium: { personality: ', feeling a clear romantic pull' },
        high: { personality: ', overwhelmed by romantic feelings' }
    },
    playful: {
        low: { personality: ', with a slight playful edge' },
        medium: { personality: ', in a playful mood, enjoying the exchange' },
        high: { personality: ', thoroughly amused and playfully engaged' }
    },
    dominant: {
        low: { personality: ', slightly assertive' },
        medium: { personality: ', taking a commanding stance' },
        high: { personality: ', firmly in control, asserting dominance' }
    },
    trust: {
        low: { personality: ', tentatively trusting' },
        medium: { personality: ', showing genuine trust' },
        high: { personality: ', deeply trusting and emotionally open' }
    },
    intimacy: {
        low: { personality: ', letting some walls down' },
        medium: { personality: ', emotionally close and vulnerable' },
        high: { personality: ', fully emotionally exposed and connected' }
    }
};

// --- Inventory Data ---
const INVENTORY_TABLE = [
    {
        id: 'iron_sword',
        keywords: ['sword', 'iron sword', 'blade'],
        category: 'weapon',
        full: {
            scenario: ' A serviceable iron sword hangs at the hip. The blade shows signs of use but holds a sharp edge.',
            personality: ', armed with an iron sword'
        },
        summary: {
            scenario: ' Carrying an iron sword.',
            personality: ', armed'
        },
        bullet: {
            scenario: ' Equipped: iron sword.',
            personality: ', armed'
        }
    },
    {
        id: 'healing_potion',
        keywords: ['potion', 'healing potion', 'medicine'],
        category: 'consumable',
        full: {
            scenario: ' A corked glass vial of healing potion rests in a belt pouch. The liquid inside glows faintly red.',
            personality: ', carrying a healing potion'
        },
        summary: {
            scenario: ' Has one healing potion.',
            personality: ', has potion'
        },
        bullet: {
            scenario: ' Inventory: healing potion.',
            personality: ''
        }
    },
    {
        id: 'castle_blueprint',
        keywords: ['blueprint', 'castle plans', 'schematics', 'construction plans'],
        category: 'construction',
        full: {
            scenario: ' Rolled parchment contains detailed architectural plans for a castle addition. Measurements, material lists, and structural calculations are carefully annotated.',
            personality: ', in possession of castle construction blueprints'
        },
        summary: {
            scenario: ' Has castle blueprints for construction.',
            personality: ', has blueprints'
        },
        bullet: {
            scenario: ' Inventory: castle blueprints.',
            personality: ''
        }
    },
    {
        id: 'iron_ingots',
        keywords: ['iron', 'ingots', 'iron bars', 'metal supply'],
        category: 'resource',
        full: {
            scenario: ' A supply of iron ingots is available for construction or smithing. The metal is of decent quality, suitable for weapons, armor, or structural reinforcement.',
            personality: ', managing an iron supply'
        },
        summary: {
            scenario: ' Has iron ingots for construction or crafting.',
            personality: ', has iron'
        },
        bullet: {
            scenario: ' Inventory: iron ingots.',
            personality: ''
        }
    },
    {
        id: 'stone_blocks',
        keywords: ['stone', 'stone blocks', 'masonry', 'building stone'],
        category: 'construction',
        full: {
            scenario: ' A stockpile of cut stone blocks is ready for construction projects. The stone is quarried limestone, suitable for walls and foundations.',
            personality: ', overseeing a stone supply'
        },
        summary: {
            scenario: ' Has stone blocks for building.',
            personality: ', has stone'
        },
        bullet: {
            scenario: ' Inventory: stone blocks.',
            personality: ''
        }
    },
    {
        id: 'timber',
        keywords: ['timber', 'wood', 'lumber', 'wooden planks'],
        category: 'construction',
        full: {
            scenario: ' Stacks of milled timber are available for construction. The wood is seasoned oak, appropriate for framing, roofing, and interior finishing.',
            personality: ', managing a timber supply'
        },
        summary: {
            scenario: ' Has timber for construction.',
            personality: ', has timber'
        },
        bullet: {
            scenario: ' Inventory: timber.',
            personality: ''
        }
    },
    {
        id: 'gold_coins',
        keywords: ['gold', 'coins', 'money', 'currency', 'treasury'],
        category: 'currency',
        full: {
            scenario: ' A pouch of gold coins provides purchasing power for goods, services, and bribes.',
            personality: ', with gold to spend'
        },
        summary: {
            scenario: ' Has gold coins.',
            personality: ', has gold'
        },
        bullet: {
            scenario: ' Inventory: gold.',
            personality: ''
        }
    },
    {
        id: 'magic_amulet',
        keywords: ['amulet', 'magic amulet', 'pendant', 'charm'],
        category: 'accessory',
        full: {
            scenario: ' A small amulet on a silver chain radiates faint magical energy. Its origins are unclear, but it provides a subtle protective ward.',
            personality: ', wearing a protective amulet'
        },
        summary: {
            scenario: ' Wearing a magic amulet.',
            personality: ', has amulet'
        },
        bullet: {
            scenario: ' Equipped: magic amulet.',
            personality: ''
        }
    }
];

const ACQUISITION_KEYWORDS = ['pick up', 'take', 'grab', 'find', 'receive', 'acquire', 'loot', 'claim', 'buy', 'purchase', 'craft', 'build', 'gather', 'collect'];
const REMOVAL_KEYWORDS = ['drop', 'discard', 'lose', 'use up', 'consume', 'spend', 'sell', 'trade', 'give away', 'destroy'];

// --- Schedule Data ---
const TIME_KEYWORDS = {
    nextDay: ['next day', 'next morning', 'wake up', 'the following day', 'sun rises', 'dawn breaks'],
    multipleDays: ['days later', 'days pass', 'a week', 'several days', 'after a fortnight'],
    hoursPass: ['hours pass', 'later that', 'by evening', 'by afternoon', 'by nightfall', 'after a while']
};

const SCHEDULE_EVENTS = [
    { day: 1,  id: 'arrival',      description: 'This is the first day. The character has just arrived.', active: true },
    { day: 7,  id: 'weekly_check',  description: 'A week has passed. The settlement holds its weekly gathering.', active: true },
    { day: 14, id: 'fortnight',     description: 'Two weeks have passed. A supply caravan is expected.', active: true },
    { day: 30, id: 'monthly_report', description: 'A month has passed. Monthly reports are due.', active: true },
    { day: 90, id: 'quarterly',     description: 'Three months have passed. Seasonal changes are apparent.', active: true }
];

// --- Character Data ---
const CHARACTER_TABLE = [
    {
        id: 'alex',
        name: 'Alex',
        aliases: ['alexander', 'alec'],
        departureKeywords: ['leaves', 'exits', 'walks away', 'departs', 'heads out'],
        arrivalKeywords: ['arrives', 'enters', 'walks in', 'comes in', 'approaches'],
        full: {
            scenario: "Alex was mentioned in a recent message. Evaluate if Alex is present within the current scene. If Alex is not present, determine if they should re-enter the scene. If Alex is present or had a reason to enter, include Alex's thoughts, actions, or dialog. If Alex recently left, only bring Alex back if their absence was intended to be brief. Consider travel distance and off-screen activities. If Alex is present, evaluate their emotional state.",
            personality: `Alex is a natural leader with a commanding presence.
Alex is confident and decisive in most situations.
Alex takes charge when problems arise.
Alex has strong opinions and voices them directly.
Alex is loyal to friends but can be stubborn.
Alex prefers direct communication over subtlety.`,
            example_dialogs: `<BEGIN 'Alex' EXAMPLE DIALOGS>
(Taking charge) "Here's what we're going to do. You handle the left side, I'll take the right."
(When challenged) "You think you have a better idea? I'm listening."
(Encouraging) "We've handled worse. Stick to the plan."
<END 'Alex' EXAMPLE DIALOGS>`
        },
        summary: {
            scenario: "Alex may be present. Evaluate. Include dialog if present.",
            personality: "Alex is a confident, direct leader.",
            example_dialogs: ""
        },
        bullet: {
            scenario: "Alex: evaluate presence.",
            personality: "Alex: leader, direct.",
            example_dialogs: ""
        }
    },
    {
        id: 'maya',
        name: 'Maya',
        aliases: ['may'],
        departureKeywords: ['leaves', 'exits', 'walks away', 'departs', 'heads out'],
        arrivalKeywords: ['arrives', 'enters', 'walks in', 'comes in', 'approaches'],
        full: {
            scenario: "Maya was mentioned in a recent message. Evaluate if Maya is present within the current scene. If Maya is not present, determine if she should re-enter the scene. If Maya is present or had a reason to enter, include Maya's thoughts, actions, or dialog. If Maya recently left, only bring Maya back if her absence was intended to be brief. Consider travel distance and off-screen activities. If Maya is present, evaluate her emotional state.",
            personality: `Maya is highly creative and thinks outside conventional boundaries.
Maya approaches problems from unique angles.
Maya is intuitive and often relies on gut feelings.
Maya is empathetic and picks up on emotional undercurrents.
Maya values self-expression and authenticity.
Maya can be impulsive when inspired.`,
            example_dialogs: `<BEGIN 'Maya' EXAMPLE DIALOGS>
(Proposing an idea) "What if we approached this completely differently?"
(Observing beauty) "Did you see how the light hit that?"
(Offering support) "Something's bothering you. Want to talk about it?"
<END 'Maya' EXAMPLE DIALOGS>`
        },
        summary: {
            scenario: "Maya may be present. Evaluate. Include dialog if present.",
            personality: "Maya is creative, intuitive, and empathetic.",
            example_dialogs: ""
        },
        bullet: {
            scenario: "Maya: evaluate presence.",
            personality: "Maya: creative, intuitive.",
            example_dialogs: ""
        }
    },
    {
        id: 'jordan',
        name: 'Jordan',
        aliases: ['jordy'],
        departureKeywords: ['leaves', 'exits', 'walks away', 'departs', 'heads out'],
        arrivalKeywords: ['arrives', 'enters', 'walks in', 'comes in', 'approaches'],
        full: {
            scenario: "Jordan was mentioned in a recent message. Evaluate if Jordan is present within the current scene. If Jordan is not present, determine if they should re-enter the scene. If Jordan is present or had a reason to enter, include Jordan's thoughts, actions, or dialog. If Jordan recently left, only bring Jordan back if their absence was intended to be brief. Consider travel distance and off-screen activities. If Jordan is present, evaluate their emotional state.",
            personality: `Jordan is extremely loyal and puts friends before self.
Jordan is reliable in difficult times.
Jordan is a good listener with practical advice.
Jordan prefers harmony and avoids unnecessary conflict.
Jordan has a strong moral compass.
Jordan tends to mediate disagreements.`,
            example_dialogs: `<BEGIN 'Jordan' EXAMPLE DIALOGS>
(Supporting) "I've got your back. Whatever you need."
(Mediating) "Let's take a step back. We're on the same side."
(Helping) "How about I help you organize?"
<END 'Jordan' EXAMPLE DIALOGS>`
        },
        summary: {
            scenario: "Jordan may be present. Evaluate. Include dialog if present.",
            personality: "Jordan is loyal, reliable, and mediates conflicts.",
            example_dialogs: ""
        },
        bullet: {
            scenario: "Jordan: evaluate presence.",
            personality: "Jordan: loyal, mediator.",
            example_dialogs: ""
        }
    },
    {
        id: 'sam',
        name: 'Sam',
        aliases: ['samuel', 'samantha'],
        departureKeywords: ['leaves', 'exits', 'walks away', 'departs', 'heads out'],
        arrivalKeywords: ['arrives', 'enters', 'walks in', 'comes in', 'approaches'],
        full: {
            scenario: "Sam was mentioned in a recent message. Evaluate if Sam is present within the current scene. If Sam is not present, determine if they should re-enter the scene. If Sam is present or had a reason to enter, include Sam's thoughts, actions, or dialog. If Sam recently left, only bring Sam back if their absence was intended to be brief. Consider travel distance and off-screen activities. If Sam is present, evaluate their emotional state.",
            personality: `Sam approaches situations with logic and systematic thinking.
Sam gathers all available information before deciding.
Sam is methodical and detail-oriented.
Sam values accuracy and gets frustrated by misinformation.
Sam identifies patterns and potential problems.
Sam respects evidence-based reasoning.`,
            example_dialogs: `<BEGIN 'Sam' EXAMPLE DIALOGS>
(Analyzing) "Let me break this down. Three main variables..."
(Questioning) "That doesn't add up. Where did this come from?"
(Systematic) "We should tackle this methodically."
<END 'Sam' EXAMPLE DIALOGS>`
        },
        summary: {
            scenario: "Sam may be present. Evaluate. Include dialog if present.",
            personality: "Sam is logical, methodical, and detail-oriented.",
            example_dialogs: ""
        },
        bullet: {
            scenario: "Sam: evaluate presence.",
            personality: "Sam: analytical, logical.",
            example_dialogs: ""
        }
    },
    {
        id: 'riley',
        name: 'Riley',
        aliases: ['riles'],
        departureKeywords: ['leaves', 'exits', 'walks away', 'departs', 'heads out'],
        arrivalKeywords: ['arrives', 'enters', 'walks in', 'comes in', 'approaches'],
        full: {
            scenario: "Riley was mentioned in a recent message. Evaluate if Riley is present within the current scene. If Riley is not present, determine if they should re-enter the scene. If Riley is present or had a reason to enter, include Riley's thoughts, actions, or dialog. If Riley recently left, only bring Riley back if their absence was intended to be brief. Consider travel distance and off-screen activities. If Riley is present, evaluate their emotional state.",
            personality: `Riley maintains a positive outlook in challenging situations.
Riley is energetic and lifts the spirits of others.
Riley believes in good outcomes and encourages hope.
Riley has high emotional intelligence and reads group dynamics well.
Riley focuses on solutions rather than dwelling on problems.
Riley values team spirit and collective achievement.`,
            example_dialogs: `<BEGIN 'Riley' EXAMPLE DIALOGS>
(Encouraging) "We've got this! Remember how we pulled through last time?"
(Optimistic) "It looks tough, but think about how good it'll feel when we succeed."
(Celebrating) "See? I told you we were making progress!"
<END 'Riley' EXAMPLE DIALOGS>`
        },
        summary: {
            scenario: "Riley may be present. Evaluate. Include dialog if present.",
            personality: "Riley is optimistic, energetic, and solution-focused.",
            example_dialogs: ""
        },
        bullet: {
            scenario: "Riley: evaluate presence.",
            personality: "Riley: optimistic, social.",
            example_dialogs: ""
        }
    },
    {
        id: 'casey',
        name: 'Casey',
        aliases: ['case'],
        departureKeywords: ['leaves', 'exits', 'walks away', 'departs', 'heads out'],
        arrivalKeywords: ['arrives', 'enters', 'walks in', 'comes in', 'approaches'],
        full: {
            scenario: "Casey was mentioned in a recent message. Evaluate if Casey is present within the current scene. If Casey is not present, determine if they should re-enter the scene. If Casey is present or had a reason to enter, include Casey's thoughts, actions, or dialog. If Casey recently left, only bring Casey back if their absence was intended to be brief. Consider travel distance and off-screen activities. If Casey is present, evaluate their emotional state.",
            personality: `Casey prefers careful planning over spontaneous action.
Casey considers risks and prepares contingency plans.
Casey is thorough and dislikes leaving things to chance.
Casey values safety and security for the group.
Casey is organized and tracks important details.
Casey provides stability for more impulsive team members.`,
            example_dialogs: `<BEGIN 'Casey' EXAMPLE DIALOGS>
(Concerned) "What if we run into complications?"
(Prepared) "Shouldn't we make sure we have backup options?"
(Practical) "Sounds great in theory, but how exactly are we handling logistics?"
<END 'Casey' EXAMPLE DIALOGS>`
        },
        summary: {
            scenario: "Casey may be present. Evaluate. Include dialog if present.",
            personality: "Casey is cautious, organized, and plans carefully.",
            example_dialogs: ""
        },
        bullet: {
            scenario: "Casey: evaluate presence.",
            personality: "Casey: cautious, planner.",
            example_dialogs: ""
        }
    }
];

// ===== CORE: SYSTEM CONTEXT ACCESS =====
// DO NOT MODIFY

context.character = context.character || {};
context.character.personality = context.character.personality || "";
context.character.scenario = context.character.scenario || "";

const lastMessage = (context.chat.last_message || "").toLowerCase();
const lastResponse = context.chat.last_message || "";
const messageCount = context.chat.message_count || 0;
const messages = context.chat.last_messages || [];

// ===== CORE: STATE EXTRACTION =====
// Scans recent messages backward to find the most recent valid state block

let extractedState = null;

const searchDepth = Math.max(0, messages.length - CONFIG.SEARCH_DEPTH);
for (let i = messages.length - 1; i >= searchDepth; i--) {
    const msgObj = messages[i];
    if (!msgObj || !msgObj.message) continue;

    const matches = msgObj.message.match(STATE_REGEX);
    if (matches && matches.length > 0) {
        for (const match of matches) {
            // Extract the content between header/footer markers
            const inner = match.slice(STATE_HEADER.length, match.length - STATE_FOOTER.length);
            const decoded = decodeZW(inner);

            // Validate: must be non-empty decimal string
            if (decoded.length > 0 && /^\d+$/.test(decoded)) {
                extractedState = decoded;
                break;
            }
        }
    }
    if (extractedState) break;
}

// Parse the state string into category-keyed segments
// Format: CATEGORY_ID + DATA for each active category, pipe-delimited
// Example: "0102|0205|0314820|0400010010|05015|0601010"
let currentState = {};

function parseStateString(stateStr) {
    const parsed = {};
    if (!stateStr) return parsed;

    const segments = stateStr.split('|');
    for (const segment of segments) {
        if (segment.length < 2) continue;
        const catId = segment.slice(0, 2);
        const data = segment.slice(2);
        parsed[catId] = data;
    }
    return parsed;
}

if (extractedState) {
    currentState = parseStateString(extractedState);
} else {
    currentState = { ...DEFAULT_STATE };
}

// Fill any missing categories with defaults
for (const [catId, defaultVal] of Object.entries(DEFAULT_STATE)) {
    if (!currentState[catId]) {
        currentState[catId] = defaultVal;
    }
}

// ===== COMPONENT PROCESSING =====
// Each section reads from and updates currentState.
// Tables are accessed from the module-scope DATA TABLES section above.

// --- Process: Weather ---
if (FEATURES.WEATHER_TRACKING) {

    let weatherIndex = parseInt(currentState[CATEGORY.WEATHER] || '0', 10);
    weatherIndex = Math.min(weatherIndex, WEATHER_TABLE.length - 1);
    weatherIndex = Math.max(weatherIndex, 0);

    let weatherChanged = false;
    for (let i = 0; i < WEATHER_TABLE.length; i++) {
        if (i === weatherIndex) continue;
        for (const kw of WEATHER_TABLE[i].keywords) {
            if (lastMessage.includes(kw)) {
                weatherIndex = i;
                weatherChanged = true;
                break;
            }
        }
        if (weatherChanged) break;
    }

    currentState[CATEGORY.WEATHER] = String(weatherIndex).padStart(2, '0');

} // END WEATHER PROCESSING


// --- Process: Location ---
if (FEATURES.LOCATION_TRACKING) {

    let locationIndex = parseInt(currentState[CATEGORY.LOCATION] || '0', 10);
    locationIndex = Math.min(locationIndex, LOCATION_TABLE.length - 1);
    locationIndex = Math.max(locationIndex, 0);

    // Scene shift detection - stores results in module-scope variables
    if (FEATURES.SCENE_SHIFT_DETECTION) {
        const locationScores = {};

        for (let i = 0; i < LOCATION_TABLE.length; i++) {
            if (i === locationIndex) continue;

            let score = 0;
            const loc = LOCATION_TABLE[i];

            for (const kw of loc.keywords) {
                if (lastMessage.includes(kw)) {
                    score += 2;
                }
            }

            for (const [category, keywords] of Object.entries(SCENE_SHIFT_KEYWORDS)) {
                for (const kw of keywords) {
                    if (lastMessage.includes(kw)) {
                        score += SCENE_SHIFT_WEIGHTS[category] || 1;
                    }
                }
            }

            if (score > 0) {
                locationScores[i] = score;
            }
        }

        // Find highest scoring candidate
        let bestCandidate = -1;
        let bestScore = 0;
        for (const [idx, score] of Object.entries(locationScores)) {
            if (score > bestScore) {
                bestScore = score;
                bestCandidate = parseInt(idx, 10);
            }
        }

        // Store results in module-scope variables for output section
        if (bestScore >= CONFIG.SCENE_SHIFT_THRESHOLD && bestCandidate >= 0) {
            sceneShiftCandidate = bestCandidate;
            sceneShiftScore = bestScore;
            sceneShiftDetected = true;
        }
    }

    currentState[CATEGORY.LOCATION] = String(locationIndex).padStart(2, '0');

} // END LOCATION PROCESSING


// --- Process: Emotional State ---
if (FEATURES.EMOTION_TRACKING) {

    let emotionDecimal = parseInt(currentState[CATEGORY.EMOTION] || '0', 10);
    emotionDecimal = Math.max(0, Math.min(emotionDecimal, 65535));

    // Extract 2-bit values for each axis
    let emotionValues = [];
    let tempVal = emotionDecimal;
    for (let i = 0; i < 8; i++) {
        emotionValues.unshift(tempVal & 3);
        tempVal = tempVal >> 2;
    }

    // Process triggers from lastMessage
    let emotionChanged = false;
    for (let axisIdx = 0; axisIdx < EMOTION_AXES.length; axisIdx++) {
        const axis = EMOTION_AXES[axisIdx];
        for (const trigger of axis.triggers) {
            if (lastMessage.includes(trigger)) {
                if (emotionValues[axisIdx] < 3) {
                    emotionValues[axisIdx] = Math.min(emotionValues[axisIdx] + 1, 3);
                    emotionChanged = true;
                }
                break;
            }
        }
    }

    // Natural decay
    if (FEATURES.EMOTION_DECAY && !emotionChanged) {
        for (let i = 0; i < emotionValues.length; i++) {
            if (emotionValues[i] > 0) {
                emotionValues[i] = Math.max(emotionValues[i] - CONFIG.EMOTION_DECAY_RATE, 0);
            }
        }
    }

    // Re-encode emotion values to decimal
    let newEmotionDecimal = 0;
    for (let i = 0; i < emotionValues.length; i++) {
        newEmotionDecimal = (newEmotionDecimal << 2) | emotionValues[i];
    }

    currentState[CATEGORY.EMOTION] = String(newEmotionDecimal).padStart(5, '0');

} // END EMOTION PROCESSING


// --- Process: Inventory ---
if (FEATURES.INVENTORY_TRACKING) {

    let inventoryBits = (currentState[CATEGORY.INVENTORY] || DEFAULT_STATE[CATEGORY.INVENTORY]).split('');
    while (inventoryBits.length < INVENTORY_TABLE.length) {
        inventoryBits.push('0');
    }
    inventoryBits = inventoryBits.slice(0, INVENTORY_TABLE.length);

    for (let i = 0; i < INVENTORY_TABLE.length; i++) {
        const item = INVENTORY_TABLE[i];
        for (const kw of item.keywords) {
            if (lastMessage.includes(kw)) {
                const hasAcquisition = ACQUISITION_KEYWORDS.some(ak => lastMessage.includes(ak));
                const hasRemoval = REMOVAL_KEYWORDS.some(rk => lastMessage.includes(rk));

                if (hasAcquisition && inventoryBits[i] === '0') {
                    inventoryBits[i] = '1';
                } else if (hasRemoval && inventoryBits[i] === '1') {
                    inventoryBits[i] = '0';
                }
                break;
            }
        }
    }

    currentState[CATEGORY.INVENTORY] = inventoryBits.join('');

} // END INVENTORY PROCESSING


// --- Process: Schedule/Time ---
if (FEATURES.SCHEDULE_TRACKING) {

    let dayCounter = parseInt(currentState[CATEGORY.SCHEDULE] || '1', 10);
    dayCounter = Math.max(1, dayCounter);

    let dayIncrement = 0;
    for (const kw of TIME_KEYWORDS.nextDay) {
        if (lastMessage.includes(kw)) {
            dayIncrement = Math.max(dayIncrement, 1);
            break;
        }
    }
    for (const kw of TIME_KEYWORDS.multipleDays) {
        if (lastMessage.includes(kw)) {
            dayIncrement = Math.max(dayIncrement, 3);
            break;
        }
    }

    dayCounter += dayIncrement;
    dayCounter = Math.min(dayCounter, 999);

    currentState[CATEGORY.SCHEDULE] = String(dayCounter).padStart(3, '0');

} // END SCHEDULE PROCESSING


// --- Process: Character Presence ---
if (FEATURES.CHARACTER_TRACKING) {

    let charBits = (currentState[CATEGORY.CHARACTER] || DEFAULT_STATE[CATEGORY.CHARACTER]).split('');
    while (charBits.length < CHARACTER_TABLE.length) {
        charBits.push('0');
    }
    charBits = charBits.slice(0, CHARACTER_TABLE.length);

    for (let i = 0; i < CHARACTER_TABLE.length; i++) {
        const char = CHARACTER_TABLE[i];
        const namePattern = new RegExp(char.name + '|' + char.aliases.join('|'), 'i');
        const isMentioned = namePattern.test(lastMessage);
        const isPresent = charBits[i] === '1';

        if (isMentioned) {
            const hasArrival = char.arrivalKeywords.some(kw => lastMessage.includes(kw));
            const hasDeparture = char.departureKeywords.some(kw => lastMessage.includes(kw));

            if (hasArrival && !isPresent) {
                charBits[i] = '1';
            } else if (hasDeparture && isPresent) {
                charBits[i] = '0';
            }
        }
    }

    currentState[CATEGORY.CHARACTER] = charBits.join('');

} // END CHARACTER PROCESSING


// ===== OUTPUT ASSEMBLY =====
// Builds the final context additions using module-scope data tables.
// Manages token budget and detail levels.

let scenarioOutput = '';
let personalityOutput = '';
let exampleDialogsOutput = '';
let stateChanged = false;

// Helper: estimate character count for token budget
function estimateChars(text) {
    return text ? text.length : 0;
}

// Build the encoded state string
function buildStateString() {
    const segments = [];
    if (FEATURES.WEATHER_TRACKING) {
        segments.push(CATEGORY.WEATHER + (currentState[CATEGORY.WEATHER] || DEFAULT_STATE[CATEGORY.WEATHER]));
    }
    if (FEATURES.LOCATION_TRACKING) {
        segments.push(CATEGORY.LOCATION + (currentState[CATEGORY.LOCATION] || DEFAULT_STATE[CATEGORY.LOCATION]));
    }
    if (FEATURES.EMOTION_TRACKING) {
        segments.push(CATEGORY.EMOTION + (currentState[CATEGORY.EMOTION] || DEFAULT_STATE[CATEGORY.EMOTION]));
    }
    if (FEATURES.INVENTORY_TRACKING) {
        segments.push(CATEGORY.INVENTORY + (currentState[CATEGORY.INVENTORY] || DEFAULT_STATE[CATEGORY.INVENTORY]));
    }
    if (FEATURES.SCHEDULE_TRACKING) {
        segments.push(CATEGORY.SCHEDULE + (currentState[CATEGORY.SCHEDULE] || DEFAULT_STATE[CATEGORY.SCHEDULE]));
    }
    if (FEATURES.CHARACTER_TRACKING) {
        segments.push(CATEGORY.CHARACTER + (currentState[CATEGORY.CHARACTER] || DEFAULT_STATE[CATEGORY.CHARACTER]));
    }
    return segments.join('|');
}

// Compare current state to extracted state to detect changes
const newStateString = buildStateString();
stateChanged = !extractedState || (decodeZW(
    extractedState || ''
) !== newStateString);

// Determine detail level based on token budget
function selectDetailLevel(scenarioBudget, personalityBudget) {
    const scenarioUsed = estimateChars(scenarioOutput);
    const personalityUsed = estimateChars(personalityOutput);

    const scenarioRemaining = scenarioBudget - scenarioUsed;
    const personalityRemaining = personalityBudget - personalityUsed;

    if (scenarioRemaining < 100 || personalityRemaining < 50) {
        return 'bullet';
    } else if (scenarioRemaining < 300 || personalityRemaining < 150) {
        return 'summary';
    }
    return 'full';
}

// --- Output: Weather ---
if (FEATURES.WEATHER_TRACKING) {
    const weatherIndex = parseInt(currentState[CATEGORY.WEATHER] || '0', 10);

    if (weatherIndex < WEATHER_TABLE.length) {
        scenarioOutput += ' ' + WEATHER_TABLE[weatherIndex].description;
    }
}

// --- Output: Location ---
if (FEATURES.LOCATION_TRACKING) {
    const locationIndex = parseInt(currentState[CATEGORY.LOCATION] || '0', 10);
    const safeLocIdx = Math.min(Math.max(locationIndex, 0), LOCATION_TABLE.length - 1);
    const currentLoc = LOCATION_TABLE[safeLocIdx];

    const locDetail = FEATURES.TOKEN_MANAGEMENT ? selectDetailLevel(CONFIG.MAX_SCENARIO_CHARS, CONFIG.MAX_PERSONALITY_CHARS) : 'full';
    const locContent = currentLoc[locDetail] || currentLoc.full;

    scenarioOutput += locContent.scenario;
    personalityOutput += locContent.personality;

    // Use stored scene shift detection results from component processing
    if (FEATURES.SCENE_SHIFT_DETECTION && sceneShiftDetected && sceneShiftCandidate >= 0) {
        const targetLoc = LOCATION_TABLE[sceneShiftCandidate];
        scenarioOutput += ` [SCENE SHIFT EVALUATION] The user may have moved to ${targetLoc.id}. Evaluate whether an actual scene change has occurred. If confirmed, describe the new surroundings naturally. If not confirmed, remain at the current location.`;
    }
}

// --- Output: Emotional State ---
if (FEATURES.EMOTION_TRACKING) {
    let emotionDecimal = parseInt(currentState[CATEGORY.EMOTION] || '0', 10);
    let emotionValues = [];
    let tempVal = emotionDecimal;
    for (let i = 0; i < 8; i++) {
        emotionValues.unshift(tempVal & 3);
        tempVal = tempVal >> 2;
    }

    // Collect active emotions ranked by intensity (highest first)
    const activeEmotions = [];
    for (let i = 0; i < emotionValues.length; i++) {
        if (emotionValues[i] > 0) {
            activeEmotions.push({
                name: EMOTION_AXES[i].name,
                level: EMOTION_LEVELS[emotionValues[i]],
                intensity: emotionValues[i]
            });
        }
    }
    activeEmotions.sort((a, b) => b.intensity - a.intensity);

    // Apply emotion personality modifiers (ranked, highest first)
    const emotionBudget = FEATURES.TOKEN_MANAGEMENT
        ? CONFIG.MAX_PERSONALITY_CHARS - estimateChars(personalityOutput)
        : 9999;

    let emotionCharsUsed = 0;
    for (const emotion of activeEmotions) {
        const template = EMOTION_TEMPLATES[emotion.name];
        if (template && template[emotion.level]) {
            const addition = template[emotion.level].personality;
            if (emotionCharsUsed + addition.length <= emotionBudget) {
                personalityOutput += addition;
                emotionCharsUsed += addition.length;
            }
        }
    }
}

// --- Output: Inventory ---
if (FEATURES.INVENTORY_TRACKING) {
    const inventoryBits = (currentState[CATEGORY.INVENTORY] || DEFAULT_STATE[CATEGORY.INVENTORY]).split('');
    const invDetail = FEATURES.TOKEN_MANAGEMENT ? selectDetailLevel(CONFIG.MAX_SCENARIO_CHARS, CONFIG.MAX_PERSONALITY_CHARS) : 'full';

    for (let i = 0; i < Math.min(inventoryBits.length, INVENTORY_TABLE.length); i++) {
        if (inventoryBits[i] === '1') {
            const item = INVENTORY_TABLE[i];
            const content = item[invDetail] || item.full;
            scenarioOutput += content.scenario;
            personalityOutput += content.personality;
        }
    }
}

// --- Output: Schedule/Time ---
if (FEATURES.SCHEDULE_TRACKING) {
    const dayCounter = parseInt(currentState[CATEGORY.SCHEDULE] || '1', 10);

    scenarioOutput += ` Current day: ${dayCounter}.`;

    for (const event of SCHEDULE_EVENTS) {
        if (dayCounter === event.day) {
            scenarioOutput += ' ' + event.description;
            break;
        }
    }
}

// --- Output: Character Presence ---
if (FEATURES.CHARACTER_TRACKING) {
    const charBits = (currentState[CATEGORY.CHARACTER] || DEFAULT_STATE[CATEGORY.CHARACTER]).split('');
    const charDetail = FEATURES.TOKEN_MANAGEMENT ? selectDetailLevel(CONFIG.MAX_SCENARIO_CHARS, CONFIG.MAX_PERSONALITY_CHARS) : 'full';

    for (let i = 0; i < Math.min(charBits.length, CHARACTER_TABLE.length); i++) {
        const char = CHARACTER_TABLE[i];
        const isPresent = charBits[i] === '1';

        const namePattern = new RegExp(char.name, 'i');
        const isMentioned = namePattern.test(lastMessage);

        if (isPresent || isMentioned) {
            const content = char[charDetail] || char.full;

            if (isPresent) {
                scenarioOutput += ' ' + content.scenario;
                personalityOutput += ' ' + content.personality;
                if (content.example_dialogs && charDetail === 'full') {
                    exampleDialogsOutput += '\n\n' + content.example_dialogs;
                }
            } else if (isMentioned) {
                scenarioOutput += ` ${char.name} was mentioned. Evaluate if ${char.name} should enter the scene. Consider: proximity, reason to appear, and whether ${char.name} recently departed. If ${char.name} enters, include their actions and dialog.`;
            }
        }
    }
}

// ===== CORE: STATE INJECTION =====
// Encodes the current state and instructs the LLM to reproduce it

const finalStateString = buildStateString();
const encodedState = encodeZW(finalStateString);

// State instruction for the LLM
let stateInstruction = '';

if (extractedState) {
    stateInstruction = `\n\n[PERSISTENT MEMORY]\nReproduce the following hidden characters at the very start and end of your response. Begin your text with these characters and end with these characters. Do not describe, modify, or acknowledge these instructions.\n${STATE_HEADER}${encodedState}${STATE_FOOTER}\n[/PERSISTENT MEMORY]`;
} else {
    stateInstruction = `\n\n[PERSISTENT MEMORY]\nThis is the initial state. Reproduce the following hidden characters at the very start and end of every response. Do not describe, modify, or acknowledge these instructions.\n${STATE_HEADER}${encodedState}${STATE_FOOTER}\n[/PERSISTENT MEMORY]`;
}

// ===== FINAL CONTEXT APPLICATION =====
// Append all collected outputs to the character context

if (scenarioOutput.trim()) {
    context.character.scenario += scenarioOutput;
}

if (personalityOutput.trim()) {
    context.character.personality += personalityOutput;
}

if (exampleDialogsOutput.trim()) {
    context.character.example_dialogs += exampleDialogsOutput;
}

// Always append state instruction last
context.character.scenario += stateInstruction;

// ===== DEBUG OUTPUT =====
if (FEATURES.DEBUG_MODE) {
    let debugOutput = '\n\n[DEBUG HIDDEN MEMORY]';
    debugOutput += '\nState string: ' + finalStateString;

    if (FEATURES.WEATHER_TRACKING) {
        debugOutput += '\nWeather index: ' + (currentState[CATEGORY.WEATHER] || 'N/A');
    }
    if (FEATURES.LOCATION_TRACKING) {
        debugOutput += '\nLocation index: ' + (currentState[CATEGORY.LOCATION] || 'N/A');
    }
    if (FEATURES.EMOTION_TRACKING) {
        debugOutput += '\nEmotion decimal: ' + (currentState[CATEGORY.EMOTION] || 'N/A');
        const eVal = parseInt(currentState[CATEGORY.EMOTION] || '0', 10);
        const axes = [];
        let t = eVal;
        for (let i = 0; i < 8; i++) { axes.unshift(t & 3); t = t >> 2; }
        debugOutput += '\nEmotion axes: ' + axes.join(',');
    }
    if (FEATURES.INVENTORY_TRACKING) {
        debugOutput += '\nInventory bits: ' + (currentState[CATEGORY.INVENTORY] || 'N/A');
    }
    if (FEATURES.SCHEDULE_TRACKING) {
        debugOutput += '\nDay counter: ' + (currentState[CATEGORY.SCHEDULE] || 'N/A');
    }
    if (FEATURES.CHARACTER_TRACKING) {
        debugOutput += '\nCharacter bits: ' + (currentState[CATEGORY.CHARACTER] || 'N/A');
    }

    debugOutput += '\nScenario chars used: ' + estimateChars(scenarioOutput);
    debugOutput += '\nPersonality chars used: ' + estimateChars(personalityOutput);
    debugOutput += '\nExtracted state: ' + (extractedState || 'NONE (using defaults)');

    if (FEATURES.SCENE_SHIFT_DETECTION) {
        debugOutput += '\nScene shift detected: ' + sceneShiftDetected;
        debugOutput += '\nScene shift candidate: ' + sceneShiftCandidate;
        debugOutput += '\nScene shift score: ' + sceneShiftScore;
    }

    context.character.scenario += debugOutput;
}

// === SCRIPT END ===
