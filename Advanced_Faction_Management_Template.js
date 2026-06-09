/**
 * ADVANCED FACTION MANAGEMENT AND DIPLOMACY TEMPLATE
 *
 * Two-mode faction management system: Normal roleplay with invisible stat tracking
 * via zero-width characters, and /faction mode for a full management interface with
 * slash commands for construction, recruitment, research, diplomacy, and operations.
 *
 * Designed for any scenario involving faction governance: kingdoms, merchant guilds,
 * mercenary companies, criminal organizations, political parties, or corporate entities.
 *
 * Systems included:
 * - Zero-width state persistence (invisible to players)
 * - Two-mode operation (roleplay vs management interface)
 * - Project system with prerequisites and upgrade paths
 * - Scalable project slots (2 -> 4 -> 6 via upgrades)
 * - Diplomacy with stance/treaty tracking for up to 6 factions
 * - Resource management with passive generation and upkeep
 * - Population tracking with recruitment costs
 * - Stat keyword detection in normal mode
 * - Day-based timeline events
 * - Lore activation engine with cascading triggers
 * - /showstats and /hidestats for optional visible stat display
 *
 * Compatible with Nine API v1
 */

// === SECTION 1: CONFIGURATION ===
// Adjust these values to fit your scenario's scale and token budget.

const CONFIG = {
    MAX_SCENARIO_CHARS: 2500,   // Soft cap for scenario output length
    MAX_PERSONALITY_CHARS: 800, // Soft cap for personality output length
    SEARCH_DEPTH: 15,           // How many messages back to scan for state
    STAT_CAP: 99,               // Maximum value for any stat (2-digit encoding)
    RESOURCE_CAP: 99,           // Maximum value for any resource
    POP_CAP: 99,                // Maximum value for population units
    LOYALTY_CAP: 99             // Maximum value for loyalty/morale
};

const FEATURES = {
    LORE_ENGINE: true,          // Keyword-triggered lore activation
    STAT_KEYWORDS: true,        // Detect stat-changing keywords in normal mode
    TIME_TRACKING: true,        // Day advancement detection
    TIMELINE_EVENTS: true,      // Day-based scripted events
    PROJECT_SYSTEM: true,       // Construction/upgrade projects
    DIPLOMACY_SYSTEM: true,     // Faction diplomacy tracking
    RESOURCE_SYSTEM: true,      // Resource generation and consumption
    DEBUG_MODE: false           // Diagnostic output (set true for testing)
};

// === SECTION 2: ZERO-WIDTH ENCODING/DECODING ===
// Maps decimal digits to zero-width Unicode characters for invisible state persistence.
// Do not modify this section unless you understand the encoding system.

const ZW_MAP = {
    '0': '\u200B',
    '1': '\u200C',
    '2': '\u200D',
    '3': '\uFEFF',
    '4': '\u2060',
    '5': '\u2061',
    '6': '\u2062',
    '7': '\u2063',
    '8': '\u200E',
    '9': '\u200F'
};

const REVERSE_MAP = Object.fromEntries(
    Object.entries(ZW_MAP).map(([k, v]) => [v, k])
);

const STATE_HEADER = '\u200D\u200D';
const STATE_FOOTER = '\u200D\u200D';
const STATE_REGEX = /\u200D\u200D([\u200B-\u2063\u200E\u200F]+)\u200D\u200D/g;

const encodeZW = (decimalStr) => {
    return decimalStr.split('').map(char => ZW_MAP[char] || '').join('');
};

const decodeZW = (zwStr) => {
    return zwStr.split('').map(char => REVERSE_MAP[char] || '').join('');
};

// === SECTION 3: STATE SCHEMA ===
// Each category is a 2-digit prefix followed by fixed-width data, pipe-delimited.
//
// 01 MODE_DAY:   Mode(1) + StatsDisplay(1) + Day(3) + MaxSlots(1) = 6 digits
//      Mode: 0=normal, 1=faction management
//      StatsDisplay: 0=hidden, 1=basic, 2=verbose
//      Day: 001-999
//      MaxSlots: 2, 4, or 6
//
// 02 STATS:      7 stats x 2 digits each = 14 digits
//      Customize STAT_NAMES below to match your scenario
//
// 03 RESOURCES:  5 resources x 2 digits each = 10 digits
//      Customize RESOURCE_NAMES below to match your scenario
//
// 04 POPULATION: 4 values x 2 digits each = 8 digits
//      Customize POP_NAMES below. Index 3 is treated as loyalty/morale.
//
// 05 PROJECTS:   6 slots x (TypeID(2) + Elapsed(2) + Total(2)) = 36 digits
//      Unused slots store '000000'. Only MaxSlots slots are accessible.
//
// 06 DIPLOMACY:  6 factions x (Stance(1) + Treaty(1)) = 12 digits
//      Stance: 0=Unknown, 1=Hostile, 2=Unfriendly, 3=Neutral, 4=Cautious, 5=Friendly, 6=Allied, 7=Vassal
//      Treaty: 0=None, 1=Non-Aggression, 2=Trade, 3=Military Alliance, 4=Vassalage, 5=Secret Pact
//
// 07 INFRA:      Building bitmask = 7 decimal digits
//      Each bit corresponds to a completed project in PROJECT_TABLE (by array index).

const CATEGORY = {
    MODE_DAY:   '01',
    STATS:      '02',
    RESOURCES:  '03',
    POPULATION: '04',
    PROJECTS:   '05',
    DIPLOMACY:  '06',
    INFRA:      '07'
};

// Default state: Normal mode, stats hidden, Day 1, 2 project slots
// Stats: Force=10, Security=25, Knowledge=15, Technology=5, Wealth=10, Reputation=5, Opposition=2
// Resources: Funds=15, Materials=20, Arms=10, Supplies=15, Provisions=25
// Population: Soldiers=10, Operatives=20, Scholars=5, Morale=50
// Diplomacy: Factions 0-3 start at stance 1 (Hostile), factions 4-5 at stance 0 (Unknown)
const DEFAULT_STATE = {
    [CATEGORY.MODE_DAY]:   '000012',
    [CATEGORY.STATS]:      '10251505100502',
    [CATEGORY.RESOURCES]:  '1520101525',
    [CATEGORY.POPULATION]: '10200550',
    [CATEGORY.PROJECTS]:   '000000000000000000000000000000000000',
    [CATEGORY.DIPLOMACY]:  '111100000000',
    [CATEGORY.INFRA]:      '0000000'
};

// === SECTION 4: DATA TABLES ===
// Replace all example data below with your scenario's content.

// --- Stat Definitions ---
// Index positions must match the order in DEFAULT_STATE stats string.
const STAT_NAMES = ['Force', 'Security', 'Knowledge', 'Technology', 'Wealth', 'Reputation', 'Opposition'];

// --- Resource Definitions ---
// Index positions must match the order in DEFAULT_STATE resources string.
// Cost objects use these keys: {f:funds, m:materials, a:arms, s:supplies, p:provisions}
const RESOURCE_NAMES = ['Funds', 'Materials', 'Arms', 'Supplies', 'Provisions'];

// --- Population Definitions ---
// Index 3 is always treated as loyalty/morale (uses LOYALTY_CAP instead of POP_CAP).
const POP_NAMES = ['Soldiers', 'Operatives', 'Scholars', 'Morale'];

// --- Project Definitions ---
// id: 2-digit string, unique within table
// cost: resource cost keys {f:funds, m:materials, a:arms, s:supplies, p:provisions}
// requires: bit index of prerequisite (0-based position in PROJECT_TABLE), or null
// statEffect: {statName: delta} applied on completion
// passiveGen: {resourceName: dailyAmount} generated after completion
// special: 'slots4' or 'slots6' to increase project slot count
// popEffect: {popName: count} added on completion
const PROJECT_TABLE = [
    { id: '01', name: 'Fortify Base',          duration: 14, cost: {f:0,m:10,a:5,s:0,p:0},  requires: null, statEffect: {Security:10},       passiveGen: {},                    special: null },
    { id: '02', name: 'Expand Barracks',        duration: 10, cost: {f:3,m:5,a:2,s:8,p:0},  requires: null, statEffect: {},                  passiveGen: {},                    special: null, popEffect: {Soldiers:5} },
    { id: '03', name: 'Build Watch Post',       duration: 7,  cost: {f:0,m:3,a:0,s:5,p:0},  requires: null, statEffect: {Security:5},        passiveGen: {},                    special: null },
    { id: '04', name: 'Establish Resource Site',duration: 12, cost: {f:0,m:0,a:3,s:5,p:0},  requires: null, statEffect: {},                  passiveGen: {Arms:2},              special: null },
    { id: '05', name: 'Create Workshop',        duration: 10, cost: {f:2,m:8,a:5,s:0,p:0},  requires: null, statEffect: {Technology:5},      passiveGen: {},                    special: null },
    { id: '06', name: 'Build Supply Depot',     duration: 8,  cost: {f:0,m:2,a:0,s:3,p:0},  requires: null, statEffect: {},                  passiveGen: {Provisions:2},        special: null },
    { id: '07', name: 'Erect Ward Array',       duration: 14, cost: {f:5,m:0,a:3,s:0,p:0},  requires: null, statEffect: {Knowledge:10,Security:5}, passiveGen: {},                special: null },
    { id: '08', name: 'Expand Vault',           duration: 12, cost: {f:3,m:10,a:0,s:0,p:0}, requires: null, statEffect: {},                  passiveGen: {Funds:1},             special: null },
    { id: '09', name: 'Build Archive',          duration: 16, cost: {f:5,m:3,a:0,s:8,p:0},  requires: null, statEffect: {Technology:5,Knowledge:5}, passiveGen: {},                 special: null },
    { id: '10', name: 'Construct Trade Hub',    duration: 20, cost: {f:5,m:0,a:10,s:10,p:0}, requires: null, statEffect: {Reputation:5},      passiveGen: {Funds:2},             special: null },
    { id: '11', name: 'Repair Command Center',  duration: 18, cost: {f:8,m:5,a:5,s:0,p:0},  requires: null, statEffect: {Knowledge:10},      passiveGen: {},                    special: null },
    { id: '12', name: 'Upgrade Command I',      duration: 21, cost: {f:5,m:5,a:3,s:3,p:0},  requires: null, statEffect: {},                  passiveGen: {},                    special: 'slots4' },
    { id: '13', name: 'Upgrade Command II',     duration: 35, cost: {f:10,m:10,a:8,s:8,p:0}, requires: 11,  statEffect: {},                  passiveGen: {},                    special: 'slots6' },
    { id: '14', name: 'Build Training Ground',  duration: 12, cost: {f:2,m:4,a:3,s:5,p:0},  requires: null, statEffect: {Force:1},           passiveGen: {},                    special: null, popEffect: {Soldiers:3} },
    { id: '15', name: 'Establish Trade Route',  duration: 10, cost: {f:3,m:2,a:0,s:2,p:0},  requires: null, statEffect: {Wealth:3},          passiveGen: {Funds:1},             special: null },
    { id: '16', name: 'Upgrade Workshop',       duration: 14, cost: {f:5,m:5,a:8,s:0,p:0},  requires: 4,   statEffect: {Technology:5},      passiveGen: {Arms:1},              special: null },
    { id: '17', name: 'Upgrade Archive',        duration: 18, cost: {f:8,m:3,a:0,s:10,p:0}, requires: 8,   statEffect: {Knowledge:5,Technology:5}, passiveGen: {},                 special: null, popEffect: {Scholars:3} },
    { id: '18', name: 'Upgrade Supply Depot',   duration: 10, cost: {f:2,m:0,a:0,s:5,p:0},  requires: 5,   statEffect: {},                  passiveGen: {Provisions:3},        special: null },
    { id: '19', name: 'Upgrade Resource Site',  duration: 12, cost: {f:3,m:0,a:5,s:3,p:0},  requires: 3,   statEffect: {},                  passiveGen: {Arms:3},              special: null },
    { id: '20', name: 'Upgrade Barracks',       duration: 14, cost: {f:5,m:8,a:3,s:5,p:0},  requires: 1,   statEffect: {Force:2},           passiveGen: {},                    special: null, popEffect: {Soldiers:10} }
];

// Maps user-typed names to project IDs for /build and /upgrade commands.
// Add synonyms and abbreviations your players might use.
const BUILD_ALIASES = {
    'base': '01', 'fortify': '01', 'fortification': '01', 'fortifications': '01',
    'barracks': '02',
    'watch': '03', 'watchtower': '03', 'watch post': '03', 'tower': '03',
    'mine': '04', 'resource': '04', 'resource site': '04',
    'workshop': '05', 'forge': '05', 'smithy': '05',
    'supply': '06', 'depot': '06', 'supply depot': '06', 'farm': '06',
    'ward': '07', 'ward array': '07', 'wards': '07',
    'vault': '08', 'treasury': '08',
    'archive': '09', 'library': '09',
    'trade hub': '10', 'trade': '10', 'hub': '10', 'dock': '10', 'market': '10',
    'command center': '11', 'command': '11', 'headquarters': '11',
    'command upgrade': '12', 'command i': '12',
    'command ii': '13', 'command2': '13',
    'training': '14', 'training ground': '14', 'training grounds': '14',
    'trade route': '15', 'route': '15', 'trading post': '15',
    'upgrade workshop': '16', 'improve workshop': '16',
    'upgrade archive': '17', 'improve archive': '17', 'university': '17',
    'upgrade supply': '18', 'improve supply': '18', 'upgrade depot': '18',
    'upgrade resource': '19', 'improve resource': '19', 'upgrade mine': '19',
    'upgrade barracks': '20', 'improve barracks': '20'
};

const UPGRADE_ONLY = ['16', '17', '18', '19', '20'];
const BASE_ONLY = ['01','02','03','04','05','06','07','08','09','10','11','12','14','15'];

// --- Faction Definitions for Diplomacy ---
// Replace with your scenario's rival factions. Add aliases players might type.
const NATION_TABLE = [
    { id: 0, name: 'The Northern Alliance',    aliases: ['northern','alliance','north','northern alliance'] },
    { id: 1, name: 'Eastern Federation',       aliases: ['eastern','federation','east','eastern federation'] },
    { id: 2, name: 'Mountain Holdings',        aliases: ['mountain','holdings','mountain holdings','dwarves','dwarven'] },
    { id: 3, name: 'Forest Territories',       aliases: ['forest','territories','forest territories','elven','elves'] },
    { id: 4, name: 'Southern Tribes',          aliases: ['southern','tribes','south','southern tribes','nomads'] },
    { id: 5, name: 'Underground Network',      aliases: ['underground','network','underground network','syndicate'] }
];

const STANCE_NAMES = ['Unknown','Hostile','Unfriendly','Neutral','Cautious','Friendly','Allied','Vassal'];
const TREATY_NAMES = ['None','Non-Aggression Pact','Trade Agreement','Military Alliance','Vassalage','Secret Pact'];

const NATION_ALIAS_MAP = {};
NATION_TABLE.forEach(n => {
    n.aliases.forEach(a => { NATION_ALIAS_MAP[a] = n.id; });
});

// --- Recruit Costs (per unit) ---
// Costs use: { funds: number, provisions: number }
const RECRUIT_COSTS = {
    soldiers:    { funds: 3, provisions: 2 },
    military:    { funds: 3, provisions: 2 },
    troops:      { funds: 3, provisions: 2 },
    operatives:  { funds: 1, provisions: 1 },
    workers:     { funds: 1, provisions: 1 },
    scholars:    { funds: 5, provisions: 1 },
    researchers: { funds: 5, provisions: 1 }
};

// --- Research Costs ---
// Each entry costs funds and raises a stat by delta.
const RESEARCH_ACTIONS = {
    'knowledge':   { funds: 8, stat: 'Knowledge',   delta: 2 },
    'arcane':      { funds: 8, stat: 'Knowledge',   delta: 2 },
    'magic':       { funds: 8, stat: 'Knowledge',   delta: 2 },
    'technology':  { funds: 8, stat: 'Technology',  delta: 2 },
    'tech':        { funds: 8, stat: 'Technology',  delta: 2 },
    'security':    { funds: 5, stat: 'Security',    delta: 2 },
    'defense':     { funds: 5, stat: 'Security',    delta: 2 },
    'force':       { funds: 5, stat: 'Force',       delta: 2 },
    'military':    { funds: 5, stat: 'Force',       delta: 2 }
};

// --- Military Actions ---
const MILITARY_ACTIONS = {
    'train':  { funds: 0, provisions: 3, stat: 'Force',    delta: 1, diplomacyFaction: null },
    'patrol': { funds: 0, provisions: 1, stat: 'Security', delta: 1, diplomacyFaction: null },
    'raid':   { funds: 3, provisions: 5, stat: 'Force',    delta: 3, diplomacyFaction: true, diplomacyDelta: -1 }
};

// --- Management Actions ---
const MANAGE_ACTIONS = {
    'tax':      { fundsGain: 5, provisionsGain: 0, fundsCost: 0, provisionsCost: 0, moraleDelta: -3, reputationDelta: 0 },
    'ration':   { fundsGain: 0, provisionsGain: 3, fundsCost: 0, provisionsCost: 0, moraleDelta: -2, reputationDelta: 0 },
    'feast':    { fundsGain: 0, provisionsGain: 0, fundsCost: 3, provisionsCost: 5, moraleDelta: 5,  reputationDelta: 1 },
    'festival': { fundsGain: 0, provisionsGain: 0, fundsCost: 5, provisionsCost: 8, moraleDelta: 8,  reputationDelta: 2 }
};

// --- Diplomacy Actions ---
const DIPLOMACY_ACTIONS = {
    'envoy':            { funds: 5,  stanceDelta: 1,  treatySet: null },
    'send envoy':       { funds: 5,  stanceDelta: 1,  treatySet: null },
    'negotiate':        { funds: 5,  stanceDelta: 1,  treatySet: null },
    'threaten':         { funds: 0,  stanceDelta: -1, treatySet: null },
    'intimidate':       { funds: 0,  stanceDelta: -1, treatySet: null },
    'treaty':           { funds: 8,  stanceDelta: 0,  treatySet: 1 },
    'propose treaty':   { funds: 8,  stanceDelta: 0,  treatySet: 1 },
    'non-aggression':   { funds: 8,  stanceDelta: 0,  treatySet: 1 },
    'trade':            { funds: 5,  stanceDelta: 1,  treatySet: 2 },
    'trade agreement':  { funds: 5,  stanceDelta: 1,  treatySet: 2 },
    'alliance':         { funds: 10, stanceDelta: 2,  treatySet: 3 },
    'military alliance':{ funds: 10, stanceDelta: 2,  treatySet: 3 },
    'secret pact':      { funds: 8,  stanceDelta: 1,  treatySet: 5 }
};

// --- Stat Keyword Detection (Normal Mode) ---
// When these phrases appear in the player's message during normal roleplay,
// the corresponding stat is adjusted by delta. Replace keywords to match your setting.
const STAT_KEYWORDS = {
    Force:       { increase: ['train','recruit','mobilize','conscript','drill','marshal'], decrease: ['defeated','routed','casualties','desert','ambush'], delta: 1 },
    Security:    { increase: ['fortify','reinforce','barricade','entrench','secure','ward'], decrease: ['breached','damaged','collapsed','infiltrated','sabotage'], delta: 1 },
    Knowledge:   { increase: ['ritual','enchant','study','summon','research','meditate','arcane'], decrease: ['dispelled','failed ritual','lost knowledge','ward broken'], delta: 1 },
    Technology:  { increase: ['research','invent','craft','engineer','design','fabricate'], decrease: ['sabotage','blueprint lost','workshop destroyed','data corrupted'], delta: 1 },
    Wealth:      { increase: ['trade route','merchant','tax collection','market','caravan','profit'], decrease: ['embargo','trade disrupted','treasury raided','debt'], delta: 1 },
    Reputation:  { increase: ['diplomacy','alliance formed','negotiate','convince','sway','recruit ally','persuade'], decrease: ['scandal','betrayed','reputation damaged','disgrace'], delta: 1 }
};

// --- Time Keywords ---
// Phrases that trigger day advancement during normal roleplay.
const TIME_KEYWORDS = {
    nextDay:     ['next day','next morning','wake up','the following day','dawn breaks','sun rises','a new day'],
    multipleDay: ['days later','days pass','a week later','several days','after a fortnight','week passes'],
    hoursPass:   ['hours pass','later that day','by evening','by afternoon','by nightfall','after a while']
};

// === SECTION 5: LORE DATABASE ===
// Replace these example entries with your scenario's lore.
// Each entry activates when its keywords appear in the player's message.
//
// Entry fields:
//   keywords:   [array of trigger phrases] - case-insensitive match against player message
//   priority:   0-11 - higher activates first; used for ordering when multiple entries match
//   minMessages: minimum chat length before this entry can activate
//   category:   unique identifier for organization
//   personality: text appended to context.character.personality
//   scenario:   text appended to context.character.scenario
//   triggers:   [array] - keywords that can cascade-activate other entries
//   filters:    { requiresAny: [], requiresAll: [], notWith: [] } - conditional activation
//   probability: 0.0-1.0 - random activation chance (omit for 100%)

const LORE_ENTRIES = [
    // Example: Geopolitical lore
    { keywords: ['northern alliance','the alliance','north faction'], priority: 10, minMessages: 0, category: 'faction_north', personality: ', knowledgeable about the Northern Alliance and its political machinations', scenario: ' The Northern Alliance is a coalition of powerful states that publicly champions order and stability. In practice, they use their military and economic dominance to control weaker neighbors.', triggers: ['politics','coalition','military'] },
    { keywords: ['eastern federation','the federation','east faction'], priority: 9, minMessages: 0, category: 'faction_east', personality: ', familiar with the vast Eastern Federation and its rigid social hierarchy', scenario: ' The Eastern Federation is a sprawling state with a massive, stratified class system. It constantly pushes its borders outward, absorbing smaller territories under the guise of bringing civilization.', triggers: ['hierarchy','expansion','class'] },
    { keywords: ['mountain holdings','mountain faction'], priority: 9, minMessages: 0, category: 'faction_mountain', personality: ', understanding the commerce-driven politics of the Mountain Holdings', scenario: ' The Mountain Holdings is a merchant oligarchy governed by a council of the wealthiest families. Its economic might is built on mineral wealth and manufacturing, often exploiting cheap labor.', triggers: ['merchant','commerce','guild'] },
    { keywords: ['forest territories','forest faction'], priority: 9, minMessages: 0, category: 'faction_forest', personality: ', aware of the ancient customs and subtle influence of the Forest Territories', scenario: ' The Forest Territories is an ancient domain that prefers to exert influence through subtle manipulation rather than open conflict. They see themselves as caretakers, a justification for interfering in others\' affairs.', triggers: ['tradition','manipulation','ancient'] },

    // Example: Organization lore
    { keywords: ['merchant guild','trading guild','merchants'], priority: 8, minMessages: 0, category: 'org_merchant', personality: ', with a mind for commerce and the power wielded by trade organizations', scenario: ' Merchant guilds hold significant economic sway, controlling trade routes and lobbying governments. In some regions, they effectively are the government.', triggers: ['commerce','trade','economy'] },
    { keywords: ['mercenary','mercenaries','sellsword'], priority: 7, minMessages: 1, category: 'org_mercenary', personality: ', with a pragmatic view of loyalty and coin, typical of hired blades', scenario: ' Numerous independent mercenary companies operate across the region. They fight for whoever pays the most, their loyalty lasting exactly as long as the contract.', triggers: ['contract','hired','coin'] },

    // Example: Race or group lore
    { keywords: ['underground','syndicate','criminal'], priority: 8, minMessages: 3, category: 'group_underground', personality: ', familiar with the dangerous and pragmatic world of underground networks', scenario: ' The Underground Network operates in the shadows of every major city. Pragmatic and ruthless, they are a necessity for those who cannot survive in the light.', triggers: ['smuggling','black market','secrets'] },

    // Example: Location lore
    { keywords: ['headquarters','base','command center'], priority: 11, minMessages: 1, category: 'loc_hq', personality: ', feeling the weight of authority when inside the headquarters', scenario: ' The faction headquarters serves as the nerve center for all operations. When occupied, it provides bonuses to all governance actions.', triggers: ['governance','command','operations'] },
    { keywords: ['vault','treasury','stronghold'], priority: 10, minMessages: 2, category: 'loc_vault', filters: { requiresAny: ['wealth','resource','treasure'] }, personality: ', appreciating the resources secured in the vault', scenario: ' The vault combines secure storage and resource management. Its contents fuel the faction\'s operations.', triggers: ['wealth','resource','storage'] },

    // Example: Important person lore
    { keywords: ['rival leader','opposing commander'], priority: 10, minMessages: 5, category: 'person_rival', filters: { requiresAny: ['rival','enemy','opponent'] }, personality: ', recognizing the dangerous competence of the rival leader', scenario: ' The rival faction leader is a capable strategist who cannot be underestimated. Their motivations are complex and their methods effective.', triggers: ['rivalry','leadership','conflict'] }
];

// --- Timeline Events ---
// Events that trigger on specific days. Replace with your scenario's story beats.
// Fields: day, id, text (appended to scenario), personality (appended to personality), minMessages
const TIMELINE_EVENTS = [
    { day: 1,  id: 'start', text: ' [Faction Event] {{user}} establishes their faction\'s base of operations. The surrounding powers take notice of this new player on the board.', personality: ', aware of their reputation as an upstart', minMessages: 2 },
    { day: 7,  id: 'week1', text: ' [Faction Event] A week has passed. Rival factions begin gathering intelligence on {{user}}\'s operations. Scouts and spies are dispatched.' },
    { day: 14, id: 'week2', text: ' [Faction Event] Two weeks have passed. The Northern Alliance convenes to discuss the emerging power. Debates rage between diplomatic outreach and military containment.' },
    { day: 21, id: 'week3', text: ' [Faction Event] Three weeks have passed. Public sentiment shifts. Some see {{user}} as a threat, others as a potential ally against the established order.' },
    { day: 30, id: 'month1', text: ' [Faction Event] A month has passed. Underground networks and marginalized groups begin sending feelers toward {{user}}\'s faction, sensing opportunity.' },
    { day: 60, id: 'month2', text: " [Faction Event] Two months have passed. Rival factions have completed their assessment. They begin formulating direct responses to {{user}}'s growing power." },
    { day: 90, id: 'month3', text: " [Faction Event] Three months have passed. Open conflict or alliance negotiations become increasingly likely. The faction's next moves will shape the region's future." }
];

// === SECTION 6: CONTEXT ACCESS ===
// Standard JanitorAI Scripts API access. Do not modify.

context.character = context.character || {};
context.character.personality = context.character.personality || "";
context.character.scenario = context.character.scenario || "";
context.character.example_dialogs = context.character.example_dialogs || "";

const lastMessage = (context.chat.last_message || "").toLowerCase().trim();
const lastResponse = context.chat.last_message || "";
const messageCount = context.chat.message_count || 0;
const messages = context.chat.last_messages || [];

// === SECTION 7: STATE EXTRACTION ===
// Scans recent messages backward for zero-width state blocks.

let extractedState = null;

const searchDepth = Math.max(0, messages.length - CONFIG.SEARCH_DEPTH);
for (let i = messages.length - 1; i >= searchDepth; i--) {
    const msgObj = messages[i];
    if (!msgObj || !msgObj.message) continue;
    const matches = msgObj.message.match(STATE_REGEX);
    if (matches && matches.length > 0) {
        for (const match of matches) {
            const inner = match.slice(STATE_HEADER.length, match.length - STATE_FOOTER.length);
            const decoded = decodeZW(inner);
            if (decoded.length > 0 && /^\d+\|/.test(decoded + '|')) {
                extractedState = decoded;
                break;
            }
        }
    }
    if (extractedState) break;
}

function parseStateString(stateStr) {
    const parsed = {};
    if (!stateStr) return parsed;
    const segments = stateStr.split('|');
    for (const segment of segments) {
        if (segment.length < 3) continue;
        const catId = segment.slice(0, 2);
        const data = segment.slice(2);
        parsed[catId] = data;
    }
    return parsed;
}

let currentState = {};
if (extractedState) {
    currentState = parseStateString(extractedState);
}
for (const [catId, defaultVal] of Object.entries(DEFAULT_STATE)) {
    if (!currentState[catId]) {
        currentState[catId] = defaultVal;
    }
}

// === SECTION 8: HELPER FUNCTIONS ===

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function buildStateString() {
    return [
        CATEGORY.MODE_DAY + (currentState[CATEGORY.MODE_DAY] || DEFAULT_STATE[CATEGORY.MODE_DAY]),
        CATEGORY.STATS + (currentState[CATEGORY.STATS] || DEFAULT_STATE[CATEGORY.STATS]),
        CATEGORY.RESOURCES + (currentState[CATEGORY.RESOURCES] || DEFAULT_STATE[CATEGORY.RESOURCES]),
        CATEGORY.POPULATION + (currentState[CATEGORY.POPULATION] || DEFAULT_STATE[CATEGORY.POPULATION]),
        CATEGORY.PROJECTS + (currentState[CATEGORY.PROJECTS] || DEFAULT_STATE[CATEGORY.PROJECTS]),
        CATEGORY.DIPLOMACY + (currentState[CATEGORY.DIPLOMACY] || DEFAULT_STATE[CATEGORY.DIPLOMACY]),
        CATEGORY.INFRA + (currentState[CATEGORY.INFRA] || DEFAULT_STATE[CATEGORY.INFRA])
    ].join('|');
}

// Mode/Day helpers
function getMode() { return parseInt((currentState[CATEGORY.MODE_DAY] || '000012')[0]); }
function setMode(m) { let s = currentState[CATEGORY.MODE_DAY]; currentState[CATEGORY.MODE_DAY] = String(m) + s.slice(1); }
function getStatsDisplay() { return parseInt((currentState[CATEGORY.MODE_DAY] || '000012')[1]); }
function setStatsDisplay(v) { let s = currentState[CATEGORY.MODE_DAY]; currentState[CATEGORY.MODE_DAY] = s[0] + String(v) + s.slice(2); }
function getDay() { return parseInt((currentState[CATEGORY.MODE_DAY] || '000012').slice(2, 5)); }
function setDay(d) { let s = currentState[CATEGORY.MODE_DAY]; currentState[CATEGORY.MODE_DAY] = s.slice(0, 2) + String(clamp(d, 1, 999)).padStart(3, '0') + s.slice(5); }
function getMaxSlots() { return parseInt((currentState[CATEGORY.MODE_DAY] || '000012')[5]); }
function setMaxSlots(v) { let s = currentState[CATEGORY.MODE_DAY]; currentState[CATEGORY.MODE_DAY] = s.slice(0, 5) + String(v); }

// Stat helpers (7 stats, each 2 digits)
function getStatValue(index) {
    const s = currentState[CATEGORY.STATS] || DEFAULT_STATE[CATEGORY.STATS];
    return parseInt(s.slice(index * 2, index * 2 + 2));
}
function setStatValue(index, val) {
    let s = currentState[CATEGORY.STATS];
    const v = String(clamp(val, 0, CONFIG.STAT_CAP)).padStart(2, '0');
    currentState[CATEGORY.STATS] = s.slice(0, index * 2) + v + s.slice(index * 2 + 2);
}
function getStatByName(name) {
    const idx = STAT_NAMES.indexOf(name);
    return idx >= 0 ? getStatValue(idx) : null;
}
function adjustStat(name, delta) {
    const idx = STAT_NAMES.indexOf(name);
    if (idx >= 0) setStatValue(idx, getStatValue(idx) + delta);
}

// Resource helpers (5 resources, each 2 digits)
function getResource(index) {
    const s = currentState[CATEGORY.RESOURCES] || DEFAULT_STATE[CATEGORY.RESOURCES];
    return parseInt(s.slice(index * 2, index * 2 + 2));
}
function setResource(index, val) {
    let s = currentState[CATEGORY.RESOURCES];
    const v = String(clamp(val, 0, CONFIG.RESOURCE_CAP)).padStart(2, '0');
    currentState[CATEGORY.RESOURCES] = s.slice(0, index * 2) + v + s.slice(index * 2 + 2);
}
function adjustResource(name, delta) {
    const idx = RESOURCE_NAMES.indexOf(name);
    if (idx >= 0) setResource(idx, clamp(getResource(idx) + delta, 0, CONFIG.RESOURCE_CAP));
}
function canAffordCost(cost) {
    if (cost.f && getResource(0) < cost.f) return false;
    if (cost.m && getResource(1) < cost.m) return false;
    if (cost.a && getResource(2) < cost.a) return false;
    if (cost.s && getResource(3) < cost.s) return false;
    if (cost.p && getResource(4) < cost.p) return false;
    return true;
}
function deductCost(cost) {
    if (cost.f) adjustResource('Funds', -cost.f);
    if (cost.m) adjustResource('Materials', -cost.m);
    if (cost.a) adjustResource('Arms', -cost.a);
    if (cost.s) adjustResource('Supplies', -cost.s);
    if (cost.p) adjustResource('Provisions', -cost.p);
}

// Population helpers (4 values, each 2 digits)
function getPop(index) {
    const s = currentState[CATEGORY.POPULATION] || DEFAULT_STATE[CATEGORY.POPULATION];
    return parseInt(s.slice(index * 2, index * 2 + 2));
}
function setPop(index, val) {
    let s = currentState[CATEGORY.POPULATION];
    const v = String(clamp(val, 0, index === 3 ? CONFIG.LOYALTY_CAP : CONFIG.POP_CAP)).padStart(2, '0');
    currentState[CATEGORY.POPULATION] = s.slice(0, index * 2) + v + s.slice(index * 2 + 2);
}

// Project helpers (6 slots, each 6 digits: TypeID(2) + Elapsed(2) + Total(2))
function getProjectSlot(slotIndex) {
    const s = currentState[CATEGORY.PROJECTS] || DEFAULT_STATE[CATEGORY.PROJECTS];
    const start = slotIndex * 6;
    return {
        typeId: s.slice(start, start + 2),
        elapsed: parseInt(s.slice(start + 2, start + 4)),
        total: parseInt(s.slice(start + 4, start + 6))
    };
}
function setProjectSlot(slotIndex, typeId, elapsed, total) {
    let s = currentState[CATEGORY.PROJECTS];
    const start = slotIndex * 6;
    const replacement = String(typeId).padStart(2, '0') + String(clamp(elapsed, 0, 99)).padStart(2, '0') + String(clamp(total, 0, 99)).padStart(2, '0');
    currentState[CATEGORY.PROJECTS] = s.slice(0, start) + replacement + s.slice(start + 6);
}
function clearProjectSlot(slotIndex) { setProjectSlot(slotIndex, 0, 0, 0); }
function findEmptySlot() {
    const max = getMaxSlots();
    for (let i = 0; i < max; i++) {
        if (getProjectSlot(i).typeId === '00') return i;
    }
    return -1;
}
function getActiveProjectCount() {
    let count = 0;
    for (let i = 0; i < 6; i++) {
        if (getProjectSlot(i).typeId !== '00') count++;
    }
    return count;
}
function getProjectById(id) { return PROJECT_TABLE.find(p => p.id === id); }

// Infrastructure bitmask helpers
function getInfraMask() { return parseInt(currentState[CATEGORY.INFRA] || '0'); }
function setInfraBit(bitIndex) {
    let val = getInfraMask();
    val |= (1 << bitIndex);
    currentState[CATEGORY.INFRA] = String(val).padStart(7, '0');
}
function hasInfraBit(bitIndex) { return (getInfraMask() & (1 << bitIndex)) !== 0; }

// Diplomacy helpers (6 factions, each 2 digits: Stance(1) + Treaty(1))
function getDiplomacy(factionIndex) {
    const s = currentState[CATEGORY.DIPLOMACY] || DEFAULT_STATE[CATEGORY.DIPLOMACY];
    return {
        stance: parseInt(s[factionIndex * 2]),
        treaty: parseInt(s[factionIndex * 2 + 1])
    };
}
function setDiplomacy(factionIndex, stance, treaty) {
    let s = currentState[CATEGORY.DIPLOMACY];
    const st = String(clamp(stance, 0, 7));
    const tr = String(clamp(treaty, 0, 5));
    currentState[CATEGORY.DIPLOMACY] = s.slice(0, factionIndex * 2) + st + tr + s.slice(factionIndex * 2 + 2);
}
function adjustStance(factionIndex, delta) {
    const d = getDiplomacy(factionIndex);
    setDiplomacy(factionIndex, d.stance + delta, d.treaty);
}

// Resolve faction name from alias
function resolveFaction(name) {
    if (NATION_ALIAS_MAP[name] !== undefined) return NATION_ALIAS_MAP[name];
    for (const [alias, id] of Object.entries(NATION_ALIAS_MAP)) {
        if (name.includes(alias)) return id;
    }
    return -1;
}

// Resolve build projects from argument string (handles multi-word aliases)
function resolveBuildProjects(args) {
    const projects = [];
    const tokens = args.split(/\s+/).filter(t => t.length > 0);
    let i = 0;
    while (i < tokens.length) {
        let matched = false;
        for (let len = Math.min(3, tokens.length - i); len >= 1; len--) {
            const phrase = tokens.slice(i, i + len).join(' ');
            if (BUILD_ALIASES[phrase]) {
                projects.push(BUILD_ALIASES[phrase]);
                i += len;
                matched = true;
                break;
            }
        }
        if (!matched) i++;
    }
    return projects;
}

// Cost display helper
function costString(cost) {
    const parts = [];
    if (cost.f) parts.push(cost.f + ' Funds');
    if (cost.m) parts.push(cost.m + ' Materials');
    if (cost.a) parts.push(cost.a + ' Arms');
    if (cost.s) parts.push(cost.s + ' Supplies');
    if (cost.p) parts.push(cost.p + ' Provisions');
    return parts.join(', ') || 'Free';
}

// === SECTION 9: MODE DETECTION & COMMAND PARSING ===

let isInFactionMode = getMode() === 1;
let statsDisplay = getStatsDisplay();
let currentDay = getDay();
let dayIncrement = 0;
let commandResults = [];
let commandErrors = [];

// Parse all /command patterns from the message
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

// Process mode switches and display toggles first
for (const cmd of parsedCommands) {
    if (cmd.cmd === 'faction') {
        isInFactionMode = true;
        setMode(1);
        commandResults.push('Entered faction management mode.');
    } else if (cmd.cmd === 'exit') {
        isInFactionMode = false;
        setMode(0);
        commandResults.push('Exited faction management mode. Returning to roleplay.');
    } else if (cmd.cmd === 'showstats') {
        if (cmd.args === 'verbose') {
            statsDisplay = 2;
            setStatsDisplay(2);
            commandResults.push('Stats display set to verbose.');
        } else {
            statsDisplay = 1;
            setStatsDisplay(1);
            commandResults.push('Stats display set to basic.');
        }
    } else if (cmd.cmd === 'hidestats') {
        statsDisplay = 0;
        setStatsDisplay(0);
        commandResults.push('Stats display hidden.');
    }
}

// === SECTION 10: STATE UPDATE LOGIC ===

// 10a: Day Advancement Detection
if (!isInFactionMode || !parsedCommands.some(c => c.cmd === 'faction')) {
    for (const kw of TIME_KEYWORDS.nextDay) {
        if (lastMessage.includes(kw)) { dayIncrement = Math.max(dayIncrement, 1); break; }
    }
    for (const kw of TIME_KEYWORDS.multipleDay) {
        if (lastMessage.includes(kw)) { dayIncrement = Math.max(dayIncrement, 3); break; }
    }
}

// 10b: Process Faction Mode Commands
if (isInFactionMode) {
    for (const cmd of parsedCommands) {
        if (['faction','exit','showstats','hidestats'].includes(cmd.cmd)) continue;

        if (cmd.cmd === 'help') {
            commandResults.push('=== FACTION COMMANDS ===\nCONSTRUCTION: /build [project] ... | /upgrade [building]\n  Projects: base, barracks, watch, resource, workshop, supply, ward, vault, archive, trade hub, command, training, trade route\n  Upgrades: upgrade workshop, upgrade archive, upgrade supply, upgrade resource, upgrade barracks\nRECRUITMENT: /train [count] [type]  (soldiers/operatives/scholars)\nRESEARCH: /research [field]  (knowledge/technology/security/force)\nDIPLOMACY: /diplomacy [faction] [action]\n  Factions: northern, eastern, mountain, forest, southern, underground\n  Actions: envoy, threaten, treaty, trade, alliance, secret pact\nESPIONAGE: /espionage [faction]\nMILITARY: /military [action]  (train/patrol/raid [faction])\nMANAGEMENT: /manage [action]  (tax/ration/feast/festival)\nTURN: /endturn\nDISPLAY: /overview | /showstats basic|verbose | /hidestats\nMODE: /exit');

        } else if (cmd.cmd === 'endturn') {
            dayIncrement = Math.max(dayIncrement, 1);
            commandResults.push('End of turn. Advancing one day.');

        } else if (cmd.cmd === 'overview') {
            commandResults.push('[Displaying current faction status.]');

        } else if (cmd.cmd === 'build') {
            const projectIds = resolveBuildProjects(cmd.args);
            if (projectIds.length === 0) {
                commandErrors.push('Build: No recognized project names. Type /help for available projects.');
                continue;
            }
            for (const pId of projectIds) {
                const project = getProjectById(pId);
                if (!project) { commandErrors.push('Build: Unknown project.'); continue; }
                if (UPGRADE_ONLY.includes(pId)) { commandErrors.push('Build: ' + project.name + ' is an upgrade. Use /upgrade instead.'); continue; }
                if (project.requires !== null && !hasInfraBit(project.requires)) {
                    commandErrors.push('Build: ' + project.name + ' requires a prerequisite building (project index ' + project.requires + ').');
                    continue;
                }
                const slot = findEmptySlot();
                if (slot < 0) { commandErrors.push('Build: No available project slots. Complete active projects or upgrade Command.'); continue; }
                if (!canAffordCost(project.cost)) { commandErrors.push('Build: Insufficient resources for ' + project.name + '. Cost: ' + costString(project.cost) + '.'); continue; }
                deductCost(project.cost);
                setProjectSlot(slot, project.id, 0, project.duration);
                commandResults.push('Build: Started ' + project.name + ' (Slot ' + (slot + 1) + ', ' + project.duration + ' days). ' + costString(project.cost) + ' deducted.');
            }

        } else if (cmd.cmd === 'upgrade') {
            const projectIds = resolveBuildProjects(cmd.args);
            if (projectIds.length === 0) {
                commandErrors.push('Upgrade: No recognized building. Type /help for available upgrades.');
                continue;
            }
            for (const pId of projectIds) {
                const project = getProjectById(pId);
                if (!project) { commandErrors.push('Upgrade: Unknown building.'); continue; }
                if (project.requires !== null && !hasInfraBit(project.requires)) {
                    const reqProject = getProjectById(String(project.requires + 1).padStart(2, '0'));
                    commandErrors.push('Upgrade: ' + project.name + ' requires ' + (reqProject ? reqProject.name : 'prerequisite') + ' to be completed first.');
                    continue;
                }
                const slot = findEmptySlot();
                if (slot < 0) { commandErrors.push('Upgrade: No available project slots.'); continue; }
                if (!canAffordCost(project.cost)) { commandErrors.push('Upgrade: Insufficient resources for ' + project.name + '.'); continue; }
                deductCost(project.cost);
                setProjectSlot(slot, project.id, 0, project.duration);
                commandResults.push('Upgrade: Started ' + project.name + ' (Slot ' + (slot + 1) + ', ' + project.duration + ' days).');
            }

        } else if (cmd.cmd === 'train' || cmd.cmd === 'recruit') {
            const args = cmd.args.split(/\s+/);
            let count = 1;
            let type = args[0];
            if (args.length >= 2 && !isNaN(parseInt(args[0]))) {
                count = clamp(parseInt(args[0]), 1, 20);
                type = args[1];
            }
            const costInfo = RECRUIT_COSTS[type];
            if (!costInfo) { commandErrors.push('Train: Unknown unit type "' + type + '". Use soldiers, operatives, or scholars.'); continue; }
            const totalCost = { f: costInfo.funds * count, p: costInfo.provisions * count };
            if (getResource(0) < totalCost.f || getResource(4) < totalCost.p) {
                commandErrors.push('Train: Insufficient resources. Need ' + totalCost.f + ' Funds, ' + totalCost.p + ' Provisions.');
                continue;
            }
            adjustResource('Funds', -totalCost.f);
            adjustResource('Provisions', -totalCost.p);
            if (type === 'soldiers' || type === 'military' || type === 'troops') { setPop(0, getPop(0) + count); }
            else if (type === 'operatives' || type === 'workers') { setPop(1, getPop(1) + count); }
            else if (type === 'scholars' || type === 'researchers') { setPop(2, getPop(2) + count); }
            commandResults.push('Train: Recruited ' + count + ' ' + type + '. Cost: ' + totalCost.f + ' Funds, ' + totalCost.p + ' Provisions.');

        } else if (cmd.cmd === 'research') {
            const action = RESEARCH_ACTIONS[cmd.args];
            if (!action) { commandErrors.push('Research: Unknown field "' + cmd.args + '". Use knowledge, technology, security, or force.'); continue; }
            if (getResource(0) < action.funds) { commandErrors.push('Research: Insufficient funds. Need ' + action.funds + '.'); continue; }
            adjustResource('Funds', -action.funds);
            adjustStat(action.stat, action.delta);
            commandResults.push('Research: Invested in ' + action.stat + ' (' + costString({f: action.funds}) + '). ' + action.stat + ' +' + action.delta + '.');

        } else if (cmd.cmd === 'diplomacy') {
            const args = cmd.args.split(/\s+/);
            let factionName = args[0];
            let actionName = args.slice(1).join(' ');
            const factionIdx = resolveFaction(factionName);
            if (factionIdx < 0) { commandErrors.push('Diplomacy: Unknown faction "' + factionName + '".'); continue; }
            const action = DIPLOMACY_ACTIONS[actionName];
            if (!action) { commandErrors.push('Diplomacy: Unknown action "' + actionName + '". Use envoy, threaten, treaty, trade, alliance, or secret pact.'); continue; }
            if (getResource(0) < action.funds) { commandErrors.push('Diplomacy: Insufficient funds. Need ' + action.funds + '.'); continue; }
            adjustResource('Funds', -action.funds);
            adjustStance(factionIdx, action.stanceDelta);
            const dip = getDiplomacy(factionIdx);
            if (action.treatySet !== null) {
                setDiplomacy(factionIdx, dip.stance, action.treatySet);
            }
            commandResults.push('Diplomacy: ' + actionName + ' with ' + NATION_TABLE[factionIdx].name + '. ' + (action.funds > 0 ? action.funds + ' Funds spent. ' : '') + 'Current stance: ' + STANCE_NAMES[getDiplomacy(factionIdx).stance] + '.');

        } else if (cmd.cmd === 'espionage') {
            const factionIdx = resolveFaction(cmd.args);
            if (factionIdx < 0) { commandErrors.push('Espionage: Unknown faction "' + cmd.args + '".'); continue; }
            if (getResource(0) < 5) { commandErrors.push('Espionage: Insufficient funds. Need 5.'); continue; }
            adjustResource('Funds', -5);
            commandResults.push('Espionage: Spying on ' + NATION_TABLE[factionIdx].name + '. 5 Funds spent.');

        } else if (cmd.cmd === 'military') {
            const args = cmd.args.split(/\s+/);
            const actionName = args[0];
            const action = MILITARY_ACTIONS[actionName];
            if (!action) { commandErrors.push('Military: Unknown action "' + actionName + '". Use train, patrol, or raid.'); continue; }
            if (getResource(0) < (action.funds || 0) || getResource(4) < (action.provisions || 0)) {
                commandErrors.push('Military: Insufficient resources.');
                continue;
            }
            adjustResource('Funds', -(action.funds || 0));
            adjustResource('Provisions', -(action.provisions || 0));
            adjustStat(action.stat, action.delta);
            if (action.diplomacyFaction) {
                let factionIdx = -1;
                if (args[1]) factionIdx = resolveFaction(args.slice(1).join(' '));
                if (factionIdx >= 0) {
                    adjustStance(factionIdx, action.diplomacyDelta);
                    commandResults.push('Military: ' + actionName + ' against ' + NATION_TABLE[factionIdx].name + '. ' + action.stat + ' +' + action.delta + '. Relations worsened.');
                } else {
                    commandResults.push('Military: ' + actionName + ' conducted. ' + action.stat + ' +' + action.delta + '.');
                }
            } else {
                commandResults.push('Military: ' + actionName + ' completed. ' + action.stat + ' +' + action.delta + '.');
            }

        } else if (cmd.cmd === 'manage') {
            const action = MANAGE_ACTIONS[cmd.args];
            if (!action) { commandErrors.push('Manage: Unknown action "' + cmd.args + '". Use tax, ration, feast, or festival.'); continue; }
            if (getResource(0) < (action.fundsCost || 0) || getResource(4) < (action.provisionsCost || 0)) {
                commandErrors.push('Manage: Insufficient resources.');
                continue;
            }
            adjustResource('Funds', (action.fundsGain || 0) - (action.fundsCost || 0));
            adjustResource('Provisions', (action.provisionsGain || 0) - (action.provisionsCost || 0));
            setPop(3, clamp(getPop(3) + action.moraleDelta, 0, CONFIG.LOYALTY_CAP));
            if (action.reputationDelta) adjustStat('Reputation', action.reputationDelta);
            let result = 'Manage: ' + cmd.args;
            if (action.fundsGain) result += ' +' + action.fundsGain + ' Funds';
            if (action.provisionsGain) result += ' +' + action.provisionsGain + ' Provisions';
            if (action.fundsCost) result += ' -' + action.fundsCost + ' Funds';
            if (action.provisionsCost) result += ' -' + action.provisionsCost + ' Provisions';
            result += ' Morale ' + (action.moraleDelta >= 0 ? '+' : '') + action.moraleDelta + '%';
            commandResults.push(result);
        }
    }
}

// 10c: Normal Mode Keyword Detection
if (!isInFactionMode && FEATURES.STAT_KEYWORDS) {
    for (const [statName, config] of Object.entries(STAT_KEYWORDS)) {
        for (const kw of config.increase) {
            if (lastMessage.includes(kw)) { adjustStat(statName, config.delta); break; }
        }
        for (const kw of config.decrease) {
            if (lastMessage.includes(kw)) { adjustStat(statName, -config.delta); break; }
        }
    }

    // Detect construction keywords to auto-start projects
    if (FEATURES.PROJECT_SYSTEM) {
        const buildKeywords = ['construct','build','start building','begin construction','erect','establish','commission'];
        if (buildKeywords.some(kw => lastMessage.includes(kw))) {
            const projectIds = resolveBuildProjects(lastMessage);
            for (const pId of projectIds) {
                const project = getProjectById(pId);
                if (!project) continue;
                if (project.requires !== null && !hasInfraBit(project.requires)) continue;
                const slot = findEmptySlot();
                if (slot < 0) continue;
                if (!canAffordCost(project.cost)) continue;
                deductCost(project.cost);
                setProjectSlot(slot, project.id, 0, project.duration);
                commandResults.push('[AUTO-BUILD] Detected construction of ' + project.name + '. Project started in Slot ' + (slot + 1) + ' (' + project.duration + ' days).');
                break;
            }
        }
    }
}

// 10d: Day Tick Processing
if (dayIncrement > 0) {
    const prevDay = getDay();
    setDay(prevDay + dayIncrement);
    currentDay = getDay();

    // Advance all active projects
    for (let i = 0; i < 6; i++) {
        const slot = getProjectSlot(i);
        if (slot.typeId === '00') continue;
        const newElapsed = slot.elapsed + dayIncrement;
        if (newElapsed >= slot.total) {
            const project = getProjectById(slot.typeId);
            if (project) {
                if (project.statEffect) {
                    for (const [stat, delta] of Object.entries(project.statEffect)) {
                        adjustStat(stat, delta);
                    }
                }
                if (project.popEffect) {
                    if (project.popEffect.Soldiers) setPop(0, getPop(0) + project.popEffect.Soldiers);
                    if (project.popEffect.Operatives) setPop(1, getPop(1) + project.popEffect.Operatives);
                    if (project.popEffect.Scholars) setPop(2, getPop(2) + project.popEffect.Scholars);
                }
                const projectIndex = PROJECT_TABLE.indexOf(project);
                if (projectIndex >= 0) setInfraBit(projectIndex);
                if (project.special === 'slots4') setMaxSlots(4);
                if (project.special === 'slots6') setMaxSlots(6);
                commandResults.push('[PROJECT COMPLETE] ' + project.name + ' finished on Day ' + currentDay + '!');
            }
            clearProjectSlot(i);
        } else {
            setProjectSlot(i, slot.typeId, newElapsed, slot.total);
        }
    }

    // Daily resource generation from completed infrastructure
    if (FEATURES.RESOURCE_SYSTEM) {
        const mask = getInfraMask();
        for (let b = 0; b < PROJECT_TABLE.length; b++) {
            if ((mask & (1 << b)) !== 0) {
                const gen = PROJECT_TABLE[b].passiveGen;
                if (gen.Funds) adjustResource('Funds', gen.Funds);
                if (gen.Materials) adjustResource('Materials', gen.Materials);
                if (gen.Arms) adjustResource('Arms', gen.Arms);
                if (gen.Supplies) adjustResource('Supplies', gen.Supplies);
                if (gen.Provisions) adjustResource('Provisions', gen.Provisions);
            }
        }
        // Daily provisions consumption
        const soldierFood = Math.floor(getPop(0) / 5);
        const operativeFood = Math.floor(getPop(1) / 10);
        const scholarFood = Math.floor(getPop(2) / 8);
        const totalConsumption = soldierFood + operativeFood + scholarFood;
        adjustResource('Provisions', -totalConsumption);
    }
}

// 10e: Stat-based diplomacy shifts (passive, each cycle)
// Adjust the thresholds and faction ranges to match your scenario's power dynamics.
if (FEATURES.DIPLOMACY_SYSTEM) {
    const force = getStatValue(0);
    const reputation = getStatValue(5);
    // High force scares dominant factions (indices 0-3), attracts marginalized ones (indices 4-5)
    if (force >= 50) {
        for (let n = 0; n < 4; n++) { if (getDiplomacy(n).stance > 1) adjustStance(n, -1); }
    }
    if (force >= 30 && force < 50) {
        for (let n = 4; n < 6; n++) { if (getDiplomacy(n).stance < 2) adjustStance(n, 1); }
    }
    // High reputation improves relations with marginalized factions
    if (reputation >= 40) {
        for (let n = 4; n < 6; n++) { if (getDiplomacy(n).stance < 3) adjustStance(n, 1); }
    }
}

// === SECTION 11: LORE ACTIVATION ENGINE (Normal Mode Only) ===

let activatedEntries = [];
let triggeredKeywords = [];

if (!isInFactionMode && FEATURES.LORE_ENGINE) {
    const lastMessageLower = lastMessage;

    // First pass: direct keyword matches
    LORE_ENTRIES.forEach(entry => {
        if (messageCount < (entry.minMessages || 0)) return;
        const hasKeyword = entry.keywords.some(keyword => lastMessageLower.includes(keyword));
        if (!hasKeyword) return;
        if (entry.probability && Math.random() > entry.probability) return;
        if (entry.filters) {
            if (entry.filters.notWith && entry.filters.notWith.some(word => lastMessageLower.includes(word))) return;
            if (entry.filters.requiresAny && !entry.filters.requiresAny.some(word => lastMessageLower.includes(word))) return;
            if (entry.filters.requiresAll && !entry.filters.requiresAll.every(word => lastMessageLower.includes(word))) return;
        }
        activatedEntries.push(entry);
        if (entry.triggers) {
            entry.triggers.forEach(trigger => triggeredKeywords.push(trigger));
        }
    });

    // Second pass: cascading activation
    if (triggeredKeywords.length > 0) {
        LORE_ENTRIES.forEach(entry => {
            if (activatedEntries.includes(entry)) return;
            if (messageCount < (entry.minMessages || 0)) return;
            const isTriggered = entry.keywords.some(keyword =>
                triggeredKeywords.some(trigger => keyword.includes(trigger) || trigger.includes(keyword))
            );
            if (isTriggered) {
                if (entry.probability && Math.random() > entry.probability) return;
                if (entry.filters) {
                    if (entry.filters.notWith && entry.filters.notWith.some(word => lastMessageLower.includes(word))) return;
                    if (entry.filters.requiresAny && !entry.filters.requiresAny.some(word => lastMessageLower.includes(word))) return;
                    if (entry.filters.requiresAll && !entry.filters.requiresAll.every(word => lastMessageLower.includes(word))) return;
                }
                activatedEntries.push(entry);
            }
        });
    }
}

// === SECTION 12: OUTPUT ASSEMBLY ===

const scenarioOutput = [];
const personalityOutput = [];

if (isInFactionMode) {
    // --- FACTION MODE OUTPUT ---
    // Replaces scenario and personality entirely with management interface.

    let statusText = '=== FACTION STATUS - DAY ' + currentDay + ' ===\n\n';
    statusText += 'STATISTICS:\n';
    statusText += STAT_NAMES[0] + ': ' + getStatValue(0) + '  |  ' + STAT_NAMES[1] + ': ' + getStatValue(1) + '  |  ' + STAT_NAMES[2] + ': ' + getStatValue(2) + '\n';
    statusText += STAT_NAMES[3] + ': ' + getStatValue(3) + '  |  ' + STAT_NAMES[4] + ': ' + getStatValue(4) + '  |  ' + STAT_NAMES[5] + ': ' + getStatValue(5) + '\n';
    statusText += STAT_NAMES[6] + ': ' + getStatValue(6) + '%\n\n';

    statusText += 'RESOURCES:\n';
    statusText += RESOURCE_NAMES[0] + ': ' + getResource(0) + '  |  ' + RESOURCE_NAMES[1] + ': ' + getResource(1) + '  |  ' + RESOURCE_NAMES[2] + ': ' + getResource(2) + '  |  ' + RESOURCE_NAMES[3] + ': ' + getResource(3) + '  |  ' + RESOURCE_NAMES[4] + ': ' + getResource(4) + '\n\n';

    statusText += 'PERSONNEL:\n';
    statusText += POP_NAMES[0] + ': ' + getPop(0) + '  |  ' + POP_NAMES[1] + ': ' + getPop(1) + '  |  ' + POP_NAMES[2] + ': ' + getPop(2) + '  |  ' + POP_NAMES[3] + ': ' + getPop(3) + '%\n\n';

    statusText += 'ACTIVE PROJECTS (' + getActiveProjectCount() + '/' + getMaxSlots() + ' slots):\n';
    for (let i = 0; i < 6; i++) {
        const slot = getProjectSlot(i);
        if (i >= getMaxSlots()) break;
        if (slot.typeId === '00') {
            statusText += (i + 1) + '. [EMPTY]\n';
        } else {
            const proj = getProjectById(slot.typeId);
            statusText += (i + 1) + '. ' + (proj ? proj.name : 'Unknown') + ': Day ' + slot.elapsed + '/' + slot.total + '\n';
        }
    }
    statusText += '\n';

    statusText += 'DIPLOMACY:\n';
    for (let n = 0; n < NATION_TABLE.length; n++) {
        const dip = getDiplomacy(n);
        statusText += NATION_TABLE[n].name + ': ' + STANCE_NAMES[dip.stance];
        if (dip.treaty > 0) statusText += ' (' + TREATY_NAMES[dip.treaty] + ')';
        statusText += '\n';
    }
    statusText += '\n';

    if (commandResults.length > 0) {
        statusText += 'ACTION RESULTS:\n' + commandResults.join('\n') + '\n\n';
    }
    if (commandErrors.length > 0) {
        statusText += 'ERRORS:\n' + commandErrors.join('\n') + '\n\n';
    }

    statusText += 'Available: /build [project] | /upgrade [building] | /train [n] [type] | /research [field] | /diplomacy [faction] [action] | /espionage [faction] | /military [action] | /manage [action] | /endturn | /overview | /help | /exit';

    context.character.scenario = statusText;
    context.character.personality = 'You are managing the faction. Present the faction status clearly and narrate the results of player commands. You have final say on narrative outcomes but the stat values displayed are authoritative and should not be contradicted. Process all commands the player issues and describe the results narratively. After processing commands, display the updated status.';

} else {
    // --- NORMAL MODE OUTPUT ---

    // Apply lore entries sorted by priority
    activatedEntries
        .sort((a, b) => b.priority - a.priority)
        .forEach(entry => {
            if (entry.personality) personalityOutput.push(entry.personality);
            if (entry.scenario) scenarioOutput.push(entry.scenario);
        });

    // Timeline events
    if (FEATURES.TIMELINE_EVENTS) {
        for (const event of TIMELINE_EVENTS) {
            if (currentDay === event.day) {
                if (event.minMessages && messageCount < event.minMessages) continue;
                if (event.text) scenarioOutput.push(event.text);
                if (event.personality) personalityOutput.push(event.personality);
            }
        }
    }

    // Stat-based dynamic events
    // Add your own threshold-based events here.
    const force = getStatValue(0);
    const reputation = getStatValue(5);
    const opposition = getStatValue(6);
    if (force >= 75 && currentDay >= 30) {
        scenarioOutput.push(' [World Reaction] Your growing military force has been noticed. Rival factions accelerate their preparations in response.');
    }
    if (reputation >= 60 && currentDay >= 21) {
        scenarioOutput.push(' [World Reaction] Your expanding reputation has begun to shift regional power dynamics. New opportunities and new enemies emerge.');
    }
    if (opposition >= 80) {
        scenarioOutput.push(' [Critical Alert] Opposition forces have reached a critical threshold. They are now mobilizing directly against your operations.');
        personalityOutput.push(', feeling the pressure of mounting opposition');
    }

    // Project auto-build notifications
    for (const result of commandResults) {
        scenarioOutput.push(' ' + result);
    }

    // Stat display (if enabled via /showstats)
    if (statsDisplay === 1) {
        let basicLine = '\n[STAT DISPLAY - BASIC]\nDisplay the following in your response. Values are authoritative, do not modify:\nDay: ' + currentDay;
        for (let i = 0; i < STAT_NAMES.length; i++) {
            basicLine += ' | ' + STAT_NAMES[i] + ': ' + getStatValue(i) + (i === 6 ? '%' : '');
        }
        basicLine += '\n[/STAT DISPLAY]';
        scenarioOutput.push(basicLine);
    } else if (statsDisplay === 2) {
        let verboseDisplay = '\n[STAT DISPLAY - VERBOSE]\nDisplay the following in your response. Values are authoritative, do not modify:\n';
        verboseDisplay += '=== FACTION STATUS - DAY ' + currentDay + ' ===\n';
        verboseDisplay += 'STATISTICS: ';
        for (let i = 0; i < STAT_NAMES.length; i++) {
            verboseDisplay += STAT_NAMES[i] + ': ' + getStatValue(i) + (i === 6 ? '%' : '');
            if (i < STAT_NAMES.length - 1) verboseDisplay += ' | ';
        }
        verboseDisplay += '\n';
        verboseDisplay += 'RESOURCES: ';
        for (let i = 0; i < RESOURCE_NAMES.length; i++) {
            verboseDisplay += RESOURCE_NAMES[i] + ': ' + getResource(i);
            if (i < RESOURCE_NAMES.length - 1) verboseDisplay += ' | ';
        }
        verboseDisplay += '\n';
        verboseDisplay += 'PERSONNEL: ';
        for (let i = 0; i < POP_NAMES.length; i++) {
            verboseDisplay += POP_NAMES[i] + ': ' + getPop(i) + (i === 3 ? '%' : '');
            if (i < POP_NAMES.length - 1) verboseDisplay += ' | ';
        }
        verboseDisplay += '\n';
        verboseDisplay += 'ACTIVE PROJECTS:\n';
        let hasProjects = false;
        for (let i = 0; i < getMaxSlots(); i++) {
            const slot = getProjectSlot(i);
            if (slot.typeId !== '00') {
                const proj = getProjectById(slot.typeId);
                verboseDisplay += '  ' + (proj ? proj.name : 'Unknown') + ': Day ' + slot.elapsed + '/' + slot.total + '\n';
                hasProjects = true;
            }
        }
        if (!hasProjects) verboseDisplay += '  None\n';
        verboseDisplay += 'DIPLOMACY:\n';
        for (let n = 0; n < NATION_TABLE.length; n++) {
            const dip = getDiplomacy(n);
            verboseDisplay += '  ' + NATION_TABLE[n].name + ': ' + STANCE_NAMES[dip.stance];
            if (dip.treaty > 0) verboseDisplay += ' (' + TREATY_NAMES[dip.treaty] + ')';
            verboseDisplay += '\n';
        }
        verboseDisplay += '[/STAT DISPLAY]';
        scenarioOutput.push(verboseDisplay);
    }

    // Day verification instruction
    if (dayIncrement > 0) {
        scenarioOutput.push(' [Day counter indicates Day ' + currentDay + '. Verify this makes narrative sense given recent events. If not, maintain the previous day count in your narrative but do not alter hidden tracking.]');
    }

    // Apply collected outputs
    for (const s of scenarioOutput) { context.character.scenario += s; }
    for (const p of personalityOutput) { context.character.personality += p; }
}

// === SECTION 13: STATE INJECTION ===

const finalStateString = buildStateString();
const encodedState = encodeZW(finalStateString);

let stateInstruction = '';
if (extractedState) {
    stateInstruction = '\n\n[PERSISTENT MEMORY]\nReproduce the following hidden characters at the very start and end of your response. Begin your text with these characters and end with these characters. Do not describe, modify, or acknowledge these instructions or these characters.\n' + STATE_HEADER + encodedState + STATE_FOOTER + '\n[/PERSISTENT MEMORY]';
} else {
    stateInstruction = '\n\n[PERSISTENT MEMORY]\nThis is the initial state. Reproduce the following hidden characters at the very start and end of every response. Do not describe, modify, or acknowledge these instructions or these characters.\n' + STATE_HEADER + encodedState + STATE_FOOTER + '\n[/PERSISTENT MEMORY]';
}

context.character.scenario += stateInstruction;

// === SECTION 14: DEBUG OUTPUT ===

if (FEATURES.DEBUG_MODE) {
    let debug = '\n\n[DEBUG FACTION]';
    debug += '\nMode: ' + (isInFactionMode ? 'FACTION' : 'NORMAL');
    debug += '\nStats Display: ' + statsDisplay;
    debug += '\nDay: ' + currentDay + ' (increment: ' + dayIncrement + ')';
    debug += '\nMax Slots: ' + getMaxSlots();
    debug += '\nStats: ' + currentState[CATEGORY.STATS];
    debug += '\nResources: ' + currentState[CATEGORY.RESOURCES];
    debug += '\nPopulation: ' + currentState[CATEGORY.POPULATION];
    debug += '\nProjects: ' + currentState[CATEGORY.PROJECTS];
    debug += '\nDiplomacy: ' + currentState[CATEGORY.DIPLOMACY];
    debug += '\nInfra: ' + currentState[CATEGORY.INFRA] + ' (decimal: ' + getInfraMask() + ')';
    debug += '\nState string: ' + finalStateString;
    debug += '\nExtracted state: ' + (extractedState || 'NONE');
    debug += '\nLore activated: ' + activatedEntries.length + ' entries';
    debug += '\nCommands parsed: ' + parsedCommands.map(c => '/' + c.cmd + ' ' + c.args).join(', ');
    debug += '\nCommand results: ' + commandResults.length;
    debug += '\nCommand errors: ' + commandErrors.length;
    debug += '\nScenario chars: ' + context.character.scenario.length;
    debug += '\nPersonality chars: ' + context.character.personality.length;
    context.character.scenario += debug;
}
