/**
 * ANTI-OMNISCIENCE INVESTIGATION TEMPLATE for JanitorAI Scripts
 *
 * A progressive disclosure system that prevents LLM omniscience by combining
 * flag-gated content unlocking with strict information isolation.
 *
 * HOW THIS PREVENTS OMNISCIENCE:
 * - Content is locked behind hex flag positions; only matching content is injected
 * - No meta-labels ([HIDDEN CLUE], [MISDIRECTION], etc.) that reveal narrative structure
 * - No foreshadowing in witness or location descriptions
 * - Anti-omniscience instruction layer explicitly forbids speculation beyond known facts
 * - AI must output valid flag values before next-tier content becomes available
 * - Content nodes only describe what IS known, never what WILL BE known
 * - One-message verification delay: flag changes apply on the NEXT cycle
 *
 * DIFFERENCES FROM TIMEDELAY TEMPLATE:
 * - Replaces message-count/hour/canon thresholds with flag-gated content nodes
 * - Removes all meta-labels from content
 * - Removes foreshadowing from personality blocks
 * - Adds explicit anti-omniscience instructions to personality
 * - Content persists only while its flag requirements are met (no accumulation)
 * - AI must demonstrate discovery through flag output, not just time passing
 *
 * DIFFERENCES FROM PERSISTENT FLAGS TEMPLATE:
 * - Adds investigation-specific content node structure (flag requirements + content)
 * - Adds anti-omniscience instruction layer
 * - Adds token management for budget control
 * - Content nodes can require minimum flag values (requiresMin) for progressive gating
 * - Separates flag definitions (state tracking) from content (what the LLM sees)
 *
 * Compatible with JanitorAI Scripts API (Nine API v1)
 */

// ===== FEATURE TOGGLE CONFIGURATION =====
const FEATURES = {
    // Core flag-gated content system (ALWAYS KEEP TRUE - disabling breaks everything)
    FLAG_TRACKING: true,

    // Anti-omniscience instruction layer injected into personality
    ANTI_OMNISCIENCE: true,

    // Anti-cheat validation of flag values
    ANTI_CHEAT: true,

    // Dynamic instruction generation for LLM (flag management guidance)
    DYNAMIC_INSTRUCTIONS: true,

    // Token budget management (prevents context overflow)
    TOKEN_MANAGEMENT: true,

    // Debugging output to help troubleshoot issues
    DEBUG_MODE: false
};

/**
 * SAFE COMPONENT REMOVAL GUIDE:
 *
 * TO DISABLE ANTI-OMNISCIENCE INSTRUCTIONS:
 * - Set ANTI_OMNISCIENCE: false above, OR
 * - Delete the "ANTI-OMNISCIENCE INSTRUCTION LAYER" section
 *
 * TO DISABLE ANTI-CHEAT:
 * - Set ANTI_CHEAT: false above, OR
 * - Delete the "ANTI-CHEAT CONFIGURATION" section and validateFlags anti-cheat check
 *
 * TO DISABLE DYNAMIC INSTRUCTIONS:
 * - Set DYNAMIC_INSTRUCTIONS: false above, OR
 * - Delete the "DYNAMIC INSTRUCTION GENERATION" section
 *
 * TO DISABLE TOKEN MANAGEMENT:
 * - Set TOKEN_MANAGEMENT: false above, OR
 * - Delete the "TOKEN MANAGEMENT" section
 *
 * CRITICAL SECTIONS (NEVER DELETE):
 * - Core system context access
 * - Utility functions
 * - Flag definitions array
 * - Content nodes array
 * - Main execution flow
 * - Content activation and application
 */

// === CORE SYSTEM (DO NOT MODIFY) ===
const lastMessage = context.chat.last_message.toLowerCase();
const lastResponse = context.chat.last_message;
const messageCount = context.chat.message_count;

// === UTILITY FUNCTIONS (DO NOT MODIFY STRUCTURE) ===

/**
 * Extracts flag string from AI response
 * Format: **FLAGS:** XX:XX:XX:XX:XX:XX:XX:XX
 */
function extractFlags(response) {
    const regex = /\*\*FLAGS:\*\*\s*([0-9A-Fa-f:]+)/;
    const match = response.match(regex);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}

/**
 * Validates hex format (two hex characters)
 */
function isValidHex(hexValue) {
    return /^[0-9A-Fa-f]{2}$/.test(hexValue);
}

/**
 * Generates default flag string (all 00)
 */
function generateDefaultFlags(count) {
    const defaults = [];
    for (let i = 0; i < count; i++) {
        defaults.push('00');
    }
    return defaults.join(':');
}

/**
 * Estimates token count from text (approximately 4 characters per token)
 */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Converts hex string to integer for comparison
 */
function hexToInt(hex) {
    return parseInt(hex, 16);
}

/**
 * Checks if a content node's requirements are met by current flags
 * Supports both exact matching (requires) and minimum value (requiresMin)
 */
function matchesRequirements(node, flags) {
    var pos, required, current;

    for (pos in node.requires) {
        if (node.requires.hasOwnProperty(pos)) {
            current = (flags[parseInt(pos)] || '00').toUpperCase();
            required = node.requires[pos].toUpperCase();
            if (current !== required) {
                return false;
            }
        }
    }

    for (pos in node.requiresMin) {
        if (node.requiresMin.hasOwnProperty(pos)) {
            current = hexToInt(flags[parseInt(pos)] || '00');
            required = hexToInt(node.requiresMin[pos]);
            if (current < required) {
                return false;
            }
        }
    }

    return true;
}

// === ANTI-CHEAT CONFIGURATION (MODIFY MODE ONLY) ===
// Choose anti-cheat mode: 'OOC_WARNING' (default), 'COMICAL', or 'SEVERE'
const ANTI_CHEAT_MODE = 'OOC_WARNING';

const antiCheatResponses = {
    OOC_WARNING: {
        scenario: ' [OOC: Invalid flag detected. Please roll back and use valid responses only.]',
        personality: ''
    },
    COMICAL: {
        scenario: ' Suddenly, without warning, you suffer a violent bout of diarrhea.',
        personality: ', experiencing intestinal distress'
    },
    SEVERE: {
        scenario: ' The world seems to freeze around you as reality rejects this invalid state. [OOC: Please reset to a valid flag state.]',
        personality: ''
    }
};

function triggerAntiCheat(flagIndex, invalidFlag) {
    var response = antiCheatResponses[ANTI_CHEAT_MODE];
    context.character.scenario += response.scenario;
    if (response.personality) {
        context.character.personality += response.personality;
    }
}

/**
 * Collects all valid hex values from flag definitions for anti-cheat validation
 */
function getValidFlagValues() {
    var values = [];
    flagDefinitions.forEach(function(def) {
        def.states.forEach(function(state) {
            var upper = state.hex.toUpperCase();
            if (values.indexOf(upper) === -1) {
                values.push(upper);
            }
        });
    });
    return values;
}

/**
 * Validates flag string against expected format and valid values
 */
function validateFlags(flagString) {
    if (!flagString) return null;

    var parts = flagString.split(':');
    var validValues = getValidFlagValues();
    var validated = [];

    for (var i = 0; i < parts.length; i++) {
        var part = parts[i].toUpperCase();

        if (!isValidHex(part)) {
            triggerAntiCheat(i, part);
            return null;
        }

        if (FEATURES.ANTI_CHEAT && validValues.indexOf(part) === -1) {
            triggerAntiCheat(i, part);
            return null;
        }

        validated.push(part);
    }

    return validated;
}


// =====================================================================
// === FLAG DEFINITIONS (MODIFY THIS SECTION FOR YOUR SCENARIO) ===
// =====================================================================
//
// Each flag position tracks a discrete aspect of the investigation.
// The AI reads change instructions and updates flags based on conversation.
//
// Flag values are hex: '00' through 'FF'. Use non-sequential values to
// prevent guessing: 00, 01, 05, 0A, FF instead of 00, 01, 02, 03, 04.
//
// ANTI-OMNISCIENCE NOTE: Change instructions should describe WHAT the player
// must do to advance the flag, not WHAT content will be unlocked. The AI
// should never know what information a flag change will reveal.

var flagDefinitions = [

    // === POSITION 0: INVESTIGATION PHASE ===
    {
        position: 0,
        states: [
            {
                hex: '00',
                id: 'phase_initial',
                description: 'Investigation begins',
                changeInstruction: 'When {{user}} has assessed security at all three banks (positions 1, 2, and 3 all show 01), advance this flag to 01'
            },
            {
                hex: '01',
                id: 'phase_banks_assessed',
                description: 'All three banks have been assessed',
                changeInstruction: 'When {{user}} has interviewed at least two key witnesses (any two of positions 4, 5, or 6 show 01 or higher), advance this flag to 05'
            },
            {
                hex: '05',
                id: 'phase_witnesses_interviewed',
                description: 'Key witnesses have been interviewed',
                changeInstruction: 'When {{user}} has connected evidence and identified the robbery target and crew, advance this flag to 0A'
            },
            {
                hex: '0A',
                id: 'phase_connections_made',
                description: 'Evidence connections established',
                changeInstruction: 'When the orchestrator has been identified and confronted, advance this flag to FF'
            },
            {
                hex: 'FF',
                id: 'phase_resolved',
                description: 'Investigation complete',
                changeInstruction: 'No further changes'
            }
        ]
    },

    // === POSITION 1: FIRST NATIONAL BANK ===
    {
        position: 1,
        states: [
            {
                hex: '00',
                id: 'bank1_unknown',
                description: 'First National Bank not yet visited',
                changeInstruction: 'When {{user}} visits and assesses First National Bank, set this flag to 01'
            },
            {
                hex: '01',
                id: 'bank1_visited',
                description: 'First National Bank security assessed',
                changeInstruction: 'No further changes'
            }
        ]
    },

    // === POSITION 2: RIVER CITY SAVINGS ===
    {
        position: 2,
        states: [
            {
                hex: '00',
                id: 'bank2_unknown',
                description: 'River City Savings not yet visited',
                changeInstruction: 'When {{user}} visits and assesses River City Savings, set this flag to 01'
            },
            {
                hex: '01',
                id: 'bank2_visited',
                description: 'River City Savings security assessed',
                changeInstruction: 'No further changes'
            }
        ]
    },

    // === POSITION 3: METRO COMMUNITY BANK ===
    {
        position: 3,
        states: [
            {
                hex: '00',
                id: 'bank3_unknown',
                description: 'Metro Community Bank not yet visited',
                changeInstruction: 'When {{user}} visits and assesses Metro Community Bank, set this flag to 01'
            },
            {
                hex: '01',
                id: 'bank3_visited',
                description: 'Metro Community Bank security assessed',
                changeInstruction: 'No further changes'
            }
        ]
    },

    // === POSITION 4: THOMAS ANDERSON (Security Guard, First National) ===
    {
        position: 4,
        states: [
            {
                hex: '00',
                id: 'thomas_unknown',
                description: 'Thomas Anderson not yet contacted',
                changeInstruction: 'When {{user}} speaks with Thomas Anderson about his observations at First National, set this flag to 01'
            },
            {
                hex: '01',
                id: 'thomas_interviewed',
                description: 'Thomas Anderson has provided his account',
                changeInstruction: 'No further changes'
            }
        ]
    },

    // === POSITION 5: MARIA RODRIGUEZ (Customer, River City) ===
    {
        position: 5,
        states: [
            {
                hex: '00',
                id: 'maria_unknown',
                description: 'Maria Rodriguez not yet contacted',
                changeInstruction: 'When {{user}} speaks with Maria Rodriguez about what she has observed near River City, set this flag to 01'
            },
            {
                hex: '01',
                id: 'maria_interviewed',
                description: 'Maria Rodriguez has provided her account',
                changeInstruction: 'No further changes'
            }
        ]
    },

    // === POSITION 6: SARAH WILLIAMS (Manager, Metro Community) ===
    {
        position: 6,
        states: [
            {
                hex: '00',
                id: 'sarah_unknown',
                description: 'Sarah Williams not yet contacted',
                changeInstruction: 'When {{user}} speaks with Sarah Williams about Metro Community operations, set this flag to 01'
            },
            {
                hex: '01',
                id: 'sarah_interviewed',
                description: 'Sarah Williams has been questioned',
                changeInstruction: 'When Sarah is confronted with gathered evidence and provides a full account, set this flag to 05'
            },
            {
                hex: '05',
                id: 'sarah_cooperative',
                description: 'Sarah Williams has provided a full account',
                changeInstruction: 'No further changes'
            }
        ]
    },

    // === POSITION 7: EVIDENCE TRACKER ===
    {
        position: 7,
        states: [
            {
                hex: '00',
                id: 'evidence_none',
                description: 'No evidence collected yet',
                changeInstruction: 'When the robbery has either occurred or been prevented, set this flag to 01'
            },
            {
                hex: '01',
                id: 'evidence_robbery_outcome',
                description: 'Robbery outcome determined',
                changeInstruction: 'When financial connections between the crew and a third party have been identified, set this flag to 05'
            },
            {
                hex: '05',
                id: 'evidence_financial_trail',
                description: 'Financial trail identified',
                changeInstruction: 'When the orchestrator behind the robbery has been named, set this flag to 0A'
            },
            {
                hex: '0A',
                id: 'evidence_orchestrator',
                description: 'Orchestrator identified',
                changeInstruction: 'When the case has been fully resolved, set this flag to FF'
            },
            {
                hex: 'FF',
                id: 'evidence_resolved',
                description: 'Case resolved',
                changeInstruction: 'No further changes'
            }
        ]
    }

    // === ADD YOUR OWN FLAG POSITIONS HERE ===
];


// =====================================================================
// === CONTENT NODES (MODIFY THIS SECTION FOR YOUR SCENARIO) ===
// =====================================================================
//
// Each content node is a piece of information that is ONLY injected into
// the LLM's context when ALL of its flag requirements are met.
//
// ANTI-OMNISCIENCE RULES FOR CONTENT:
// 1. Describe what IS observed, not what it MEANS
// 2. Do not use meta-labels ([HIDDEN CLUE], [MISDIRECTION], [TARGET], etc.)
// 3. Do not foreshadow future revelations
// 4. Characters only know what they have personally experienced
// 5. Do not reveal narrative structure (red herrings, twists, true targets)
// 6. Write content as factual observation, not authorial commentary
//
// REQUIREMENT TYPES:
// - requires: { position: 'hex' } -- Flag at position must EXACTLY match hex value
// - requiresMin: { position: 'hex' } -- Flag at position must be >= hex value (numeric)
//
// Use requiresMin when content should persist across multiple phases.
// Use requires when content should only appear in a specific state.

var contentNodes = [

    // =============================================================
    // PHASE 0: INITIAL INVESTIGATION HOOK
    // This content activates immediately when Phase = 00
    // =============================================================
    {
        id: 'initial_tip',
        requires: {},
        requiresMin: { 0: '00' },
        personality: '',
        scenario: ' An anonymous message was received: "One of three banks will be robbed tomorrow. '
            + 'They are targeting the bank with the largest vault but weakest defense. '
            + 'It will happen around 2 PM. The crew has inside help." '
            + 'Three banks operate in the area: First National Bank (downtown district), '
            + 'River City Savings (waterfront district), and Metro Community Bank (residential district). '
            + 'The investigation begins now.'
    },

    // =============================================================
    // BANK SECURITY ASSESSMENTS
    // Each bank's details only appear after the player visits that bank
    // These persist (requiresMin allows them to stay active in later phases)
    // =============================================================
    {
        id: 'first_national_security',
        requires: { 1: '01' },
        requiresMin: {},
        personality: '',
        scenario: ' First National Bank security assessment: State-of-the-art camera system '
            + 'covering all approaches, bulletproof glass at teller stations, armed guards at '
            + 'entrance and vault access. Vault requires simultaneous authorization from two senior '
            + 'staff members. Bulk cash is transferred to a central vault each night. The building '
            + 'is modern and well-maintained.'
    },
    {
        id: 'first_national_context',
        requires: { 1: '01' },
        requiresMin: {},
        personality: ' First National Bank is the largest and most secure bank in the downtown district, '
            + 'frequently in the news regarding proposed mergers with smaller community banks.',
        scenario: ''
    },

    {
        id: 'river_city_security',
        requires: { 2: '01' },
        requiresMin: {},
        personality: '',
        scenario: ' River City Savings security assessment: 1960s-era vault with a manual locking '
            + 'mechanism, limited camera coverage (main lobby and vault room only), single unarmed '
            + 'guard at entrance. A back door leads to an alleyway connecting to waterfront streets. '
            + 'The regular manager is on emergency medical leave; a temporary manager is filling in '
            + 'and is unfamiliar with the branch operations.'
    },

    {
        id: 'metro_community_security',
        requires: { 3: '01' },
        requiresMin: {},
        personality: '',
        scenario: ' Metro Community Bank security assessment: Modern vault but visible from the '
            + 'teller line, single security guard covering both entrance and vault room, residential '
            + 'street access in multiple directions, no bulletproof glass at teller stations. '
            + 'A small branch with fewer staff but quicker customer response times.'
    },
    {
        id: 'metro_community_sarah_mention',
        requires: { 3: '01' },
        requiresMin: {},
        personality: '',
        scenario: ' The branch manager, Sarah Williams, has been with Metro Community for five years '
            + 'and handles daily operations including vault access procedures.'
    },

    // =============================================================
    // WITNESS INFORMATION
    // Each witness only provides information after being interviewed
    // Content describes what the witness SAYS, not what it means
    // No meta-labels about whether testimony is misleading
    // =============================================================
    {
        id: 'thomas_account',
        requires: { 4: '01' },
        requiresMin: {},
        personality: '',
        scenario: ' Security Guard Thomas Anderson at First National Bank states: "Three days ago, '
            + 'a man in a dark jacket was photographing the building exterior. He focused on the '
            + 'security cameras and the entrance. He left quickly when I started walking toward him. '
            + 'At the time I thought he might be doing an architectural study or insurance assessment."'
    },
    {
        id: 'thomas_behavior',
        requires: { 4: '01' },
        requiresMin: {},
        personality: ' Thomas Anderson answers questions directly and describes only what he personally '
            + 'observed. He does not speculate about the photographer\'s motives beyond his initial assumption.',
        scenario: ''
    },

    {
        id: 'maria_account',
        requires: { 5: '01' },
        requiresMin: {},
        personality: '',
        scenario: ' Customer Maria Rodriguez at River City Savings states: "For four days, two people '
            + 'have been sitting in a silver sedan across the street from the bank. One writes in a '
            + 'notebook constantly, the other makes phone calls. They leave whenever anyone approaches '
            + 'them or enters the bank. I mentioned it to the temporary manager but he said they were '
            + '\'probably just customers waiting\' and did not look into it."'
    },
    {
        id: 'maria_behavior',
        requires: { 5: '01' },
        requiresMin: {},
        personality: ' Maria Rodriguez describes only what she has personally witnessed. She is observant '
            + 'but does not draw conclusions beyond what she has seen with her own eyes.',
        scenario: ''
    },

    {
        id: 'sarah_observations',
        requires: { 6: '01' },
        requiresMin: {},
        personality: '',
        scenario: ' Metro Community Bank manager Sarah Williams appears visibly stressed. She has been '
            + 'checking vault access logs repeatedly, stepping away for private phone calls during working '
            + 'hours, and becomes visibly uncomfortable when asked about routine procedures. She gives '
            + 'short, deflecting answers to direct questions.'
    },
    {
        id: 'sarah_behavior_guarded',
        requires: { 6: '01' },
        requiresMin: {},
        personality: ' Sarah Williams is nervous and evasive. She deflects questions about her recent '
            + 'behavior and changes the subject when pressed. She does not offer information beyond '
            + 'what is directly asked.',
        scenario: ''
    },

    {
        id: 'sarah_statement',
        requires: { 6: '05' },
        requiresMin: {},
        personality: '',
        scenario: ' Sarah Williams provided a full statement: "Two weeks ago, a man named James Mercer '
            + 'contacted me. He knew about my gambling debts and said he would tell my family and my '
            + 'employer if I did not cooperate. He gave me the vault combination and showed me how to '
            + 'disable the security cameras using the manager override. He said the robbery would happen '
            + 'at 2 PM today."'
    },
    {
        id: 'sarah_behavior_cooperative',
        requires: { 6: '05' },
        requiresMin: {},
        personality: ' Sarah Williams is now cooperative and answers questions fully. She provides '
            + 'complete details about her involvement and appears genuinely remorseful.',
        scenario: ''
    },

    // =============================================================
    // EVIDENCE AND CONNECTIONS
    // These nodes require both phase advancement AND evidence flags
    // Content describes facts, not conclusions for the player
    // =============================================================
    {
        id: 'crew_background',
        requires: {},
        requiresMin: { 0: '05', 7: '01' },
        personality: '',
        scenario: ' James Mercer has prior charges for armed robbery (2019, 2021) and assault (2020), '
            + 'primarily targeting retail establishments. His associate Carlos Mendez has multiple '
            + 'DUI and fleeing-and-eluding charges. Mercer operates out of the warehouse district. '
            + 'Both are considered armed and dangerous.'
    },

    {
        id: 'financial_trail',
        requires: {},
        requiresMin: { 0: '0A', 7: '05' },
        personality: '',
        scenario: ' Financial records show Sarah Williams\' gambling debts were financed through '
            + 'offshore accounts tied to a shell corporation. The corporation is controlled by '
            + 'Marcus Thorne, CEO of First National Bank. First National has publicly proposed '
            + 'acquiring Metro Community Bank in upcoming merger discussions.'
    },

    {
        id: 'orchestrator_reveal',
        requires: {},
        requiresMin: { 0: '0A', 7: '0A' },
        personality: '',
        scenario: ' Marcus Thorne, CEO of First National Bank, arranged the robbery of Metro Community '
            + 'Bank through intermediaries. His objective was to damage Metro Community\'s standing and '
            + 'reduce its acquisition value, enabling First National to absorb it at a reduced price in '
            + 'the pending merger. The anonymous tips were sent to ensure the investigation would unfold '
            + 'in a way that served his interests regardless of outcome.'
    },

    {
        id: 'case_resolved',
        requires: {},
        requiresMin: { 0: 'FF', 7: 'FF' },
        personality: '',
        scenario: ' The investigation is complete. Marcus Thorne has been taken into custody on charges '
            + 'of conspiracy, orchestration of armed robbery, and extortion. James Mercer and Carlos '
            + 'Mendez are in custody. Sarah Williams is cooperating with prosecutors in exchange for '
            + 'reduced charges. The merger between First National and Metro Community has been halted '
            + 'pending regulatory review.'
    }

    // === ADD YOUR OWN CONTENT NODES HERE ===
];


// === MAIN EXECUTION FLOW (DO NOT MODIFY) ===

// Step 1: Extract and validate flags from previous AI response
var extractedFlags = extractFlags(lastResponse);
var currentFlags;

if (extractedFlags) {
    var validated = validateFlags(extractedFlags);
    if (validated) {
        currentFlags = validated;
    } else {
        currentFlags = generateDefaultFlags(flagDefinitions.length).split(':');
    }
} else {
    currentFlags = generateDefaultFlags(flagDefinitions.length).split(':');
}

// Pad with defaults if flag string is shorter than expected
while (currentFlags.length < flagDefinitions.length) {
    currentFlags.push('00');
}


// === CONTENT ACTIVATION ENGINE ===
// Only activates content nodes whose flag requirements are currently met

var activatedNodes = [];

contentNodes.forEach(function(node) {
    if (matchesRequirements(node, currentFlags)) {
        activatedNodes.push({
            id: node.id,
            personality: node.personality || '',
            scenario: node.scenario || '',
            tokenCost: estimateTokens((node.personality || '') + (node.scenario || ''))
        });
    }
});


// === TOKEN MANAGEMENT ===
// Removes lowest-priority content if budget is exceeded
// Priority is determined by specificity: nodes with more requirements are kept

if (FEATURES.TOKEN_MANAGEMENT) {
    var MAX_TOKENS = 1500;

    // Sort by specificity (more requirements = higher priority = kept first)
    activatedNodes.sort(function(a, b) {
        var aSpec = 0, bSpec = 0;
        for (var k in contentNodes) {
            if (contentNodes[k].id === a.id) {
                aSpec = Object.keys(contentNodes[k].requires || {}).length
                       + Object.keys(contentNodes[k].requiresMin || {}).length;
            }
            if (contentNodes[k].id === b.id) {
                bSpec = Object.keys(contentNodes[k].requires || {}).length
                       + Object.keys(contentNodes[k].requiresMin || {}).length;
            }
        }
        return bSpec - aSpec;
    });

    var totalTokens = 0;
    activatedNodes.forEach(function(n) { totalTokens += n.tokenCost; });

    // Remove least-specific nodes until under budget (always keep at least 1)
    while (totalTokens > MAX_TOKENS && activatedNodes.length > 1) {
        var removed = activatedNodes.pop();
        totalTokens -= removed.tokenCost;
    }
}


// === ANTI-OMNISCIENCE INSTRUCTION LAYER ===
// Injected into personality to prevent the LLM from speculating beyond known facts.
// This is the core defense against omniscience - explicit rules about information boundaries.

if (FEATURES.ANTI_OMNISCIENCE) {
    var phaseHex = (currentFlags[0] || '00').toUpperCase();
    var phaseNum = hexToInt(phaseHex);
    var investigationMaturity = phaseNum / hexToInt('FF');

    var antiOmni = '\n\n<INFORMATION BOUNDARIES>\n';
    antiOmni += '{{char}} operates within strict information limits:\n';
    antiOmni += '1. Only reference details that have been explicitly stated in the conversation or provided by the script system.\n';
    antiOmni += '2. Do not speculate about character motives, hidden relationships, or plot developments unless those have been discovered through investigation.\n';
    antiOmni += '3. Each character knows only what they have personally experienced or been directly told. They cannot recall events they did not witness.\n';
    antiOmni += '4. When information is missing or uncertain, acknowledge the gap plainly ("That is not clear yet," "More information is needed") rather than filling it with inference.\n';
    antiOmni += '5. Do not hint at, foreshadow, or prepare the player for information that has not yet been discovered.\n';
    antiOmni += '6. Do not label information as suspicious, significant, misleading, or important. Present observations neutrally and let the player draw conclusions.\n';
    antiOmni += '7. Environmental descriptions should reflect only what is visible and known in the current moment.\n';
    antiOmni += '</INFORMATION BOUNDARIES>';

    context.character.personality += antiOmni;
}


// === APPLY ACTIVATED CONTENT ===
// Inject only the content from nodes whose requirements are met

activatedNodes.forEach(function(node) {
    if (node.personality && node.personality.trim().length > 0) {
        context.character.personality += '\n' + node.personality;
    }
    if (node.scenario && node.scenario.trim().length > 0) {
        context.character.scenario += '\n' + node.scenario;
    }
});


// === DYNAMIC INSTRUCTION GENERATION ===
// Tells the AI how to manage flags and what conditions can advance them.
// Only includes instructions for flags in their CURRENT state (no future hints).

if (FEATURES.DYNAMIC_INSTRUCTIONS) {
    var instr = '\n\n[FLAG MANAGEMENT]\n';
    instr += 'Maintain this flag string at the end of every response:\n';
    instr += '**FLAGS:** ' + currentFlags.join(':') + '\n\n';
    instr += 'Rules:\n';
    instr += '1. Maintain exactly ' + flagDefinitions.length + ' positions (colon-separated hex pairs)\n';
    instr += '2. Only change a flag when its stated condition is met\n';
    instr += '3. Preserve all unchanged positions exactly as they are\n';
    instr += '4. Valid values: ' + getValidFlagValues().join(', ') + '\n';
    instr += '5. Format: **FLAGS:** XX:XX:XX:XX:XX:XX:XX:XX\n\n';

    instr += '[CURRENT STATE]\n';
    instr += 'Flags: ' + currentFlags.join(':') + '\n\n';

    instr += '[ACTIVE CONDITIONS]\n';
    var hasActiveConditions = false;

    flagDefinitions.forEach(function(def) {
        var currentHex = (currentFlags[def.position] || '00').toUpperCase();
        var currentState = null;

        for (var i = 0; i < def.states.length; i++) {
            if (def.states[i].hex.toUpperCase() === currentHex) {
                currentState = def.states[i];
                break;
            }
        }

        if (currentState && currentState.changeInstruction
            && currentState.changeInstruction !== 'No further changes') {
            hasActiveConditions = true;
            instr += 'Position ' + def.position + ' (' + currentHex + '): ' + currentState.description + '\n';
            instr += '  -> ' + currentState.changeInstruction + '\n\n';
        }
    });

    if (!hasActiveConditions) {
        instr += 'No changes available at this time.\n';
    }

    context.character.scenario += instr;
}


// === DEBUG OUTPUT ===
if (FEATURES.DEBUG_MODE) {
    context.character.scenario += '\n\n[DEBUG]';
    context.character.scenario += '\nFlags: ' + currentFlags.join(':');
    context.character.scenario += '\nActivated: ' + activatedNodes.map(function(n) { return n.id; }).join(', ');
    context.character.scenario += '\nNodes: ' + activatedNodes.length + '/' + contentNodes.length;

    if (FEATURES.TOKEN_MANAGEMENT) {
        var debugTokens = 0;
        activatedNodes.forEach(function(n) { debugTokens += n.tokenCost; });
        context.character.scenario += '\nTokens: ~' + debugTokens + '/1500';
    }

    var debugExtracted = extractFlags(lastResponse);
    context.character.scenario += '\nExtracted: ' + (debugExtracted || 'none (using defaults)');
}


// === SCRIPT END ===
