/**
 * JANITOR AI PERSISTENT FLAGS LOREBOOK TEMPLATE
 *
 * This template implements a hex-based flag system for tracking persistent state
 * across roleplay sessions. Flags represent discrete states that control which
 * lore context is active.
 *
 * IMPORTANT: This template provides:
 * - Hexadecimal flag string management (e.g., "00:1A:FF")
 * - Dynamic context activation based on flag states
 * - Anti-cheat validation for flag values
 * - Position-preserving flag updates
 * - Cross-session and cross-scenario save functionality
 *
 * Compatible with Nine API v1
 */

// ===== FEATURE TOGGLE CONFIGURATION =====
// Set these to true/false to enable/disable specific components
const FEATURES = {
    // Core flag system (ALWAYS KEEP TRUE - disabling breaks everything)
    FLAG_SYSTEM: true,

    // Anti-cheat validation of flag values
    ANTI_CHEAT: true,

    // Dynamic instruction generation for LLM
    DYNAMIC_INSTRUCTIONS: true,

    // Debugging output to help troubleshoot issues
    DEBUG_MODE: false
};

/**
 * SAFE COMPONENT REMOVAL GUIDE:
 *
 * Instead of deleting code blocks, use the toggles above to disable features.
 * If you must remove code sections, follow this guide:
 *
 * TO DISABLE ANTI-CHEAT:
 * - Set ANTI_CHEAT: false above, OR
 * - Delete lines 156-184 (validateFlags function and antiCheatResponses object)
 *
 * TO DISABLE DYNAMIC INSTRUCTIONS:
 * - Set DYNAMIC_INSTRUCTIONS: false above, OR
 * - Delete lines 240-285 (generateFlagInstructions function)
 * - Remove the instruction generation call in main execution
 *
 * TO DISABLE DEBUG MODE:
 * - Set DEBUG_MODE: false above, OR
 * - Delete lines 385-398 (DEBUG OUTPUT section)
 *
 * CRITICAL SECTIONS (NEVER DELETE):
 * - Lines 85-87 (Core system context access)
 * - Lines 101-116 (Flag definition structure)
 * - Lines 120-141 (Utility functions)
 * - Lines 263-285 (Main execution flow)
 * - Lines 297-333 (Flag lore application)
 *
 * WARNING: Always test after modifications. Syntax errors will break the entire script.
 */

// === CORE SYSTEM (DO NOT MODIFY) ===
// These lines access the chat context and are required for the script to function
const lastMessage = context.chat.last_message.toLowerCase();
const lastResponse = context.chat.last_message;
const messageCount = context.chat.message_count;

// === UTILITY FUNCTIONS (DO NOT MODIFY STRUCTURE) ===

/**
 * Extracts flag string from AI response using regex pattern matching
 * Default format: **FLAGS:** 00:1A:FF
 */
function extractFlagsFromResponse(lastResponse) {
    const regex = /\*\*FLAGS:\*\*\s*([0-9A-Fa-f:]+)/;
    const match = lastResponse.match(regex);
    if (match && match[1]) {
        return match[1];
    }
    return null;
}

/**
 * Validates if a hex string is properly formatted (pairs of hex characters)
 */
function isValidHexValue(hexValue) {
    return /^[0-9A-Fa-f]{2}$/.test(hexValue);
}

/**
 * Generates a default flag string based on flag definition count
 * Default state is "00" for all positions
 */
function generateDefaultFlags(count) {
    const defaultFlags = [];
    for (let i = 0; i < count; i++) {
        defaultFlags.push('00');
    }
    return defaultFlags.join(':');
}

// === ANTI-CHEAT CONFIGURATION ===
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

/**
 * Triggers anti-cheat response when invalid flag values are detected
 */
function triggerAntiCheat(flagIndex, invalidFlag) {
    const response = antiCheatResponses[ANTI_CHEAT_MODE];
    context.character.scenario += response.scenario;
    if (response.personality) {
        context.character.personality += response.personality;
    }

    if (FEATURES.DEBUG_MODE) {
        console.log(`[ANTI-CHEAT] Invalid flag at position ${flagIndex}: ${invalidFlag}`);
    }
}

// === FLAG DEFINITIONS (MODIFY THIS SECTION) ===
// Each flag definition represents a discrete state in your scenario
// When a flag's hex value matches the current state, its content is activated

const flagDefinitions = [
    // === EXAMPLE: MISSING WALLET SCENARIO ===
    {
        hexValue: '00',
        id: 'missing_wallet',
        description: 'Wallet is missing',
        personality: ', aware their wallet is missing',
        scenario: ' Your wallet containing your driver\'s license is missing.',
        keywords: ['wallet', 'lost wallet', 'missing wallet'],
        flagChangeInstruction: 'If {{user}} has found their wallet, set this flag to 01'
    },
    {
        hexValue: '01',
        id: 'found_wallet',
        description: 'Wallet found',
        personality: ', relieved to have their wallet back',
        scenario: ' You have recovered your wallet with your driver\'s license.',
        keywords: ['license', 'id card', 'identification'],
        flagChangeInstruction: 'If {{user}} has found their license, set this flag to 05'
    },
    {
        hexValue: '05',
        id: 'found_license',
        description: 'License found',
        personality: ', having their identification secured',
        scenario: ' You have your driver\'s license back in your possession.',
        keywords: ['police', 'report', 'station'],
        flagChangeInstruction: 'If {{user}} has filed a police report, set this flag to 13'
    },
    {
        hexValue: '13',
        id: 'police_report_filed',
        description: 'Police report filed',
        personality: ', having completed the police report',
        scenario: ' You have filed a police report about the missing items.',
        keywords: ['investigation', 'detective', 'evidence'],
        flagChangeInstruction: 'If {{user}} has completed the investigation, set this flag to FF'
    },
    {
        hexValue: 'FF',
        id: 'investigation_complete',
        description: 'Investigation complete',
        personality: ', having resolved the missing items mystery',
        scenario: ' The investigation is complete and all items are accounted for.',
        keywords: [],
        flagChangeInstruction: 'No further flag changes required'
    }

    // === ADD YOUR OWN FLAGS HERE ===
    // You can add more flags for your scenario:
    // - Quest objectives
    // - Story progression points
    // - Character relationship states
    // - Item acquisition states
    // - etc.
];

/**
 * Extracts all valid hex values from flag definitions
 * Used for anti-cheat validation
 */
function getValidFlagValues() {
    const validValues = new Set();
    flagDefinitions.forEach(definition => {
        validValues.add(definition.hexValue.toUpperCase());
    });
    return Array.from(validValues);
}

/**
 * Validates flag string against expected format and valid values
 * Returns validated flag array or triggers anti-cheat if invalid
 */
function validateFlags(flagString) {
    if (!flagString) {
        return null;
    }

    const parts = flagString.split(':');
    const validHexValues = getValidFlagValues();
    const validatedFlags = [];

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i].toUpperCase();

        if (!isValidHexValue(part)) {
            triggerAntiCheat(i, part);
            return null;
        }

        if (FEATURES.ANTI_CHEAT && !validHexValues.includes(part)) {
            triggerAntiCheat(i, part);
            return null;
        }

        validatedFlags.push(part);
    }

    return validatedFlags;
}

/**
 * Generates dynamic flag management instructions for the LLM
 * Only includes instructions for flags that are currently active
 */
function generateFlagInstructions(currentFlags) {
    const instructions = ['[FLAG MANAGEMENT INSTRUCTIONS]', ''];

    instructions.push('You must maintain a flag string at the end of your responses in this format:');
    instructions.push('**FLAGS:** XX:XX:XX');
    instructions.push('');

    instructions.push('Rules:');
    instructions.push('1. Always maintain the same number of flag positions (' + flagDefinitions.length + ' in this scenario)');
    instructions.push('2. Only change flag values that are currently active (check below)');
    instructions.push('3. Preserve positions - do NOT append new flags to the end');
    instructions.push('4. Only use valid flag values: ' + getValidFlagValues().join(', '));
    instructions.push('5. Format exactly as shown: **FLAGS:** XX:XX:XX');
    instructions.push('');

    instructions.push('[CURRENT FLAG STATE]');
    instructions.push('Current flags: ' + currentFlags.join(':'));
    instructions.push('');

    instructions.push('[ACTIVE FLAG INSTRUCTIONS]');
    let hasActiveInstructions = false;

    flagDefinitions.forEach((definition, index) => {
        const currentFlag = currentFlags[index] || '00';

        if (currentFlag === definition.hexValue) {
            hasActiveInstructions = true;
            instructions.push('Flag ' + index + ' (' + currentFlag + '): ' + definition.description);

            if (definition.flagChangeInstruction && definition.flagChangeInstruction !== 'No further flag changes required') {
                instructions.push('  → ' + definition.flagChangeInstruction);
            }

            if (definition.keywords.length > 0) {
                instructions.push('  → Monitor these keywords: ' + definition.keywords.join(', '));
            }
            instructions.push('');
        }
    });

    if (!hasActiveInstructions) {
        instructions.push('No active flag instructions at this time.');
    }

    return instructions.join('\n');
}

// === MAIN EXECUTION FLOW (DO NOT MODIFY) ===
// This section controls the flag parsing, validation, and application process

let currentFlags = [];

// Step 1: Extract flags from previous response
const extractedFlags = extractFlagsFromResponse(lastResponse);

// Step 2: Validate flags or use defaults
if (extractedFlags) {
    const validatedFlags = validateFlags(extractedFlags);
    if (validatedFlags) {
        currentFlags = validatedFlags;
    } else {
        currentFlags = generateDefaultFlags(flagDefinitions.length).split(':');
    }
} else {
    currentFlags = generateDefaultFlags(flagDefinitions.length).split(':');
}

// Step 3: Apply flag-based lore
applyFlagLore(currentFlags);

// Step 4: Generate and add instructions for LLM
if (FEATURES.DYNAMIC_INSTRUCTIONS) {
    const instructions = generateFlagInstructions(currentFlags);
    context.character.scenario += '\n\n' + instructions;
}

/**
 * Applies flag-based lore to character context
 * Only activates content for flags that match their current state
 */
function applyFlagLore(flags) {
    flagDefinitions.forEach((definition, index) => {
        const currentFlag = flags[index];

        if (currentFlag === definition.hexValue) {
            if (definition.personality) {
                if (!context.character.personality.includes(definition.personality)) {
                    context.character.personality += definition.personality;
                }
            }

            if (definition.scenario) {
                if (!context.character.scenario.includes(definition.scenario)) {
                    context.character.scenario += definition.scenario;
                }
            }
        }
    });
}

// === DEBUG OUTPUT (OPTIONAL) ===
// Debug output is now controlled by the DEBUG_MODE toggle above
if (FEATURES.DEBUG_MODE) {
    context.character.scenario += '\n\n[DEBUG FLAGS]';
    context.character.scenario += '\nCurrent state: ' + currentFlags.join(':');
    context.character.scenario += '\nExpected count: ' + flagDefinitions.length;
    context.character.scenario += '\nValid values: ' + getValidFlagValues().join(', ');

    if (FEATURES.ANTI_CHEAT) {
        const extracted = extractFlagsFromResponse(lastResponse);
        if (extracted) {
            context.character.scenario += '\nExtracted from response: ' + extracted;
        } else {
            context.character.scenario += '\nNo flags found in response (using defaults)';
        }
    }
}

// === TEMPLATE USAGE GUIDE ===
/*
HOW TO USE THIS TEMPLATE:

1. DEFINE YOUR FLAGS:
   - Replace the example flag definitions with your own
   - Each flag represents a discrete state in your scenario
   - Use hex values: '00', '01', '05', '0A', 'FF', etc.
   - Space out values (05, 13, 1A) to make guessing harder

2. UNDERSTAND FLAG PROPERTIES:
   - hexValue: The hex value that identifies this flag state
   - id: Unique identifier for this flag
   - description: Human-readable description
   - personality: Personality addition when flag is active
   - scenario: Scenario addition when flag is active
   - keywords: Keywords that apply when flag is active
   - flagChangeInstruction: When to change this flag to next state

3. SET UP FLAG CHANGES:
   - Each flag can transition to other states
   - Instructions only apply when flag is currently active
   - Keywords come and go based on flag state
   - This creates progressive context unfolding

4. CONFIGURE ANTI-CHEAT:
   - Choose mode: 'OOC_WARNING' (default), 'COMICAL', or 'SEVERE'
   - All flag values are validated against allowed values
   - Invalid values trigger configured anti-cheat response

5. TEST FLAG FLOW:
   - Start with all flags at '00'
   - LLM evaluates if conditions are met
   - LLM updates only active flags
   - Context changes on next message cycle

ADVANCED FEATURES:

- Position Preservation: Flags always stay in assigned positions
- Dynamic Instructions: Only active flags generate instructions
- Valid Value Extraction: Auto-builds list of allowed hex values
- Multiple Anti-Cheat Modes: Choose severity of response
- Debug Mode: Track flag parsing and validation

SAVE SYSTEMS:

This template supports two save system approaches:

1. CROSS-SCENARIO SAVE GAME:
   Users can copy their flag string and paste it into a different bot/character
   to carry over story state. This allows scenarios to span multiple characters
   or time periods while maintaining continuity.

2. SESSION CONTINUITY:
   When a chat fills the context window, users can copy their flag string and
   paste it into a new session along with a summary of important events. This
   allows continuing the story without losing state information.

BEST PRACTICES:

- Start with sequential hex values (00, 01, 02) for clarity
- Add spacing (05, 13, 1A) only if anti-cheat is a concern
- Keep flag descriptions concise but clear
- Use specific keywords to avoid unwanted activation
- Test flag transitions with various conversation flows
- Document flag meaning for cross-scenario usage

Remember: This is a template - make it your own!

FEATURE TOGGLE QUICK REFERENCE:
- FLAG_SYSTEM: Core system (always keep true)
- ANTI_CHEAT: Validate flag values
- DYNAMIC_INSTRUCTIONS: Generate LLM guidance
- DEBUG_MODE: Show flag parsing information

To disable a feature: Change its value to 'false' in the FEATURES object at the top.
To permanently remove: Use the removal guide in the header comments.
*/

// === SCRIPT END ===
}
