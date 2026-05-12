/**
 * TIMEDELAY LOREBOOK TEMPLATE for JanitorAI Scripts
 *
 * Progressive disclosure system that reveals information over time through:
 * - Message count thresholds (clues unlock at message 5, 10, 15...)
 * - Hour-based timeline events (story progression 0-24 hours)
 * - Canon count tracking (cumulative clues unlocked)
 * - Drop-in/drop-out witness and location activation
 * - Context-aware token management (current vs past investigation)
 * - Hidden clue embedding system
 * - Conditional events based on player actions
 *
 * Compatible with JanitorAI Scripts API (Nine API v1)
 */

// ===== FEATURE TOGGLE CONFIGURATION =====
// Set these to true/false to enable/disable specific components
const FEATURES = {
    // Core lorebook system (ALWAYS KEEP TRUE - disabling breaks everything)
    LOREBOOK: true,

    // Hour-based timeline events (0-24 hours progression)
    TIMELINE_EVENTS: true,

    // Stat parsing from AI responses (Canon Count, Hour progression)
    STAT_TRACKING: true,

    // Progressive disclosure by message count
    PROGRESSIVE_DISCLOSURE: true,

    // Drop-in/drop-out witness and location system
    DROP_IN_OUT: true,

    // Context-aware token management (reduce past investigation detail)
    CONTEXT_AWARE_BUDGETING: true,

    // Hidden clue embedding within other details
    HIDDEN_CLUES: true,

    // Conditional events (robbery success/failure based on player action)
    CONDITIONAL_EVENTS: true,

    // Debugging output to help troubleshoot issues
    DEBUG_MODE: false
};

/**
 * SAFE COMPONENT REMOVAL GUIDE:
 *
 * TO DISABLE TIMELINE EVENTS:
 * - Set TIMELINE_EVENTS: false above, OR
 * - Delete lines 451-580 (the "HOUR-BASED TIMELINE EVENTS" section)
 *
 * TO DISABLE PROGRESSIVE DISCLOSURE:
 * - Set PROGRESSIVE_DISCLOSURE: false above, OR
 * - Remove minMessages fields from canonDatabase entries
 *
 * TO DISABLE DROP-IN/OUT SYSTEM:
 * - Set DROP_IN_OUT: false above, OR
 * - Delete lines 333-406 (the "DROP-IN/OUT ENTITY DATABASE" section)
 *
 * TO DISABLE CONTEXT-AWARE BUDGETING:
 * - Set CONTEXT_AWARE_BUDGETING: false above, OR
 * - Delete lines 407-449 (the "TOKEN MANAGEMENT" section)
 * - Use full versions of all canon entries
 *
 * TO DISABLE HIDDEN CLUES:
 * - Set HIDDEN_CLUES: false above, OR
 * - Remove hiddenCondition and hiddenContent fields from canonDatabase entries
 *
 * CRITICAL SECTIONS (NEVER DELETE):
 * - Lines 89-91 (Core system context access)
 * - Lines 95-145 (Utility functions including stat parsing)
 * - Lines 311-331 (Activation engine)
 * - Lines 451-580 (Timeline events - if TIMELINE_EVENTS is true)
 */

// === CORE SYSTEM (DO NOT MODIFY) ===
const lastMessage = context.chat.last_message.toLowerCase();
const lastResponse = context.chat.last_message;
const messageCount = context.chat.message_count;

// === UTILITY FUNCTIONS (DO NOT MODIFY STRUCTURE) ===

/**
 * Safely extracts numerical stats from AI responses
 * Supports both regular stats (**StatName:** 50%) and custom stats
 */
function getStat(statName, lastResponse) {
    const regex = new RegExp(`\\*\\*${statName}:\\*\\*\\s*(\\d+)\\s*%?`, 'i');
    const match = lastResponse.match(regex);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return null;
}

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
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);
        if (matches) count += matches.length;
    });
    return count;
}

/**
 * Extract hour progression from AI responses
 */
function getHour(lastResponse) {
    const regex = new RegExp(`\\*\\*Hour:\\*\\*\\s*(\\d+)\\s*`, 'i');
    const match = lastResponse.match(regex);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return 0;
}

/**
 * Extract canon count from AI responses
 */
function getCanonCount(lastResponse) {
    const regex = new RegExp(`\\*\\*Canon Count:\\*\\*\\s*(\\d+)\\s*%?`, 'i');
    const match = lastResponse.match(regex);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return 0;
}

// === FEATURE ACTIVATION CHECKS ===
const currentHour = FEATURES.TIMELINE_EVENTS ? getHour(lastResponse) : 0;
const canonCount = FEATURES.STAT_TRACKING ? getCanonCount(lastResponse) : 0;

// === CANON DATABASE (MODIFY THIS SECTION) ===
// This database contains all canonical information revealed progressively
// Each entry includes: id, keywords, importance, minMessages, minHour, minCanon
// And: full.scenario, summary.scenario, bullet.scenario (for token management)
const canonDatabase = [
    // === HOUR 0 - INITIAL INVESTIGATION HOOK ===
    {
        id: 'canon_hour0_tip',
        keywords: ['anonymous tip', 'robbery', 'tip received'],
        importance: 10.0,
        minMessages: 0,
        minHour: 0,
        minCanon: 0,
        full: {
            scenario: ' [CANON]: Anonymous message received: "One of three major banks will be hit tomorrow. They\'re going after the largest vault but weakest defense. It\'s happening around 2 PM. The crew has inside help." Time is 0:00 AM. 24 hours until robbery.'
        },
        summary: {
            scenario: ' [CANON]: Anonymous tip received - bank robbery tomorrow at 2 PM. Target: one of three banks with large vault but weak security. Inside help involved. Hour 0.'
        },
        bullet: {
            scenario: ' [CANON]: Tip: Bank robbery tomorrow, 2 PM, one of three banks, inside help. Hour 0.'
        }
    },

    // === HOUR 1 - FIRST NATIONAL BANK DETAILS ===
    {
        id: 'canon_hour1_first_national',
        keywords: ['first national', 'downtown bank', 'bank security'],
        importance: 8.5,
        minMessages: 1,
        minHour: 1,
        minCanon: 1,
        full: {
            scenario: ' [CANON]: First National Bank security assessment (Hour 1): State-of-the-art camera system covers all approaches, bulletproof glass at teller stations, armed guards at entrance and vault access. Vault requires simultaneous authorization from two senior staff. Vault contains mainly paperwork and small valuables - bulk cash transferred to central vault nightly. [HIDDEN CLUE: Photographer focused on security cameras and entrance, not just taking pictures of exterior - crew was planning security bypass methods]'
        },
        summary: {
            scenario: ' [CANON]: First National Bank security: advanced cameras, bulletproof glass, armed guards, two-person vault authorization. Cash transferred nightly. [HIDDEN: Photographer checked security systems]'
        },
        bullet: {
            scenario: ' [CANON]: First National: cameras, bulletproof glass, armed guards, two-person vault. Nightly cash transfer. [HIDDEN: Security bypass planning]'
        }
    },

    // === HOUR 2 - RIVER CITY SAVINGS DETAILS ===
    {
        id: 'canon_hour2_river_city',
        keywords: ['river city', 'waterfront bank', 'savings bank'],
        importance: 8.5,
        minMessages: 2,
        minHour: 2,
        minCanon: 2,
        full: {
            scenario: ' [CANON]: River City Savings security assessment (Hour 2): 1960s-era vault with manual locking mechanism, limited camera coverage (main lobby and vault room only), single unarmed guard at entrance. Back door leads to unmonitored alleyway connecting to waterfront streets. Manager has been on emergency medical leave for past week; temporary manager unfamiliar with branch operations. [HIDDEN CLUE: Temporary manager\'s unfamiliarity explains why customer\'s legitimate concerns weren\'t taken seriously]'
        },
        summary: {
            scenario: ' [CANON]: River City Savings security: old vault, limited cameras, single guard, back alley access. Temporary manager unfamiliar with operations. [HIDDEN: Customer concerns ignored]'
        },
        bullet: {
            scenario: ' [CANON]: River City: old vault, limited cameras, one guard, back alley, temporary manager. [HIDDEN: Concerns ignored]'
        }
    },

    // === HOUR 3 - METRO COMMUNITY BANK DETAILS ===
    {
        id: 'canon_hour3_metro_community',
        keywords: ['metro community', 'community bank', 'residential bank'],
        importance: 8.5,
        minMessages: 3,
        minHour: 3,
        minCanon: 3,
        full: {
            scenario: ' [CANON]: Metro Community Bank security assessment (Hour 3): Modern vault but visible from teller line (can see when accessed), single security guard covering entrance and vault room, residential street access in multiple directions. No bulletproof glass at teller stations. Small branch - less staff, faster response times to customers. [THIS IS THE TARGET]'
        },
        summary: {
            scenario: ' [CANON]: Metro Community Bank security: visible vault, single guard, multiple exits, no bulletproof glass. Small branch. [TARGET]'
        },
        bullet: {
            scenario: ' [CANON]: Metro Community: visible vault, one guard, multiple exits, small. [TARGET]'
        }
    },

    // === HOUR 4 - MANAGER SUSPICIOUS BEHAVIOR ===
    {
        id: 'canon_hour4_manager_behavior',
        keywords: ['manager sarah', 'sarah williams', 'manager behavior', 'suspicious manager'],
        importance: 9.0,
        minMessages: 4,
        minHour: 4,
        minCanon: 3,
        full: {
            scenario: ' [CANON]: Metro Community Manager Sarah Williams has been exhibiting unusual behavior (Hour 4): checking vault access logs repeatedly, taking personal phone calls during working hours in private, appearing nervous when questioned. Has made several large personal withdrawals over past month (paying off personal gambling debts). [MISDIRECTION: Her nervousness and withdrawals appear suspicious but are unrelated to robbery planning]'
        },
        summary: {
            scenario: ' [CANON]: Manager Sarah Williams behavior: checking vault logs, private calls, nervous. Large personal withdrawals (gambling debts). [MISDIRECTION]'
        },
        bullet: {
            scenario: ' [CANON]: Sarah Williams (Manager): nervous, private calls, withdrawals (gambling debts). [MISDIRECTION]'
        }
    },

    // === HOUR 5 - SECURITY GUARD REPORT ===
    {
        id: 'canon_hour5_thomas_testimony',
        keywords: ['thomas', 'security guard', 'guard testimony', 'first national guard'],
        importance: 9.0,
        minMessages: 5,
        minHour: 5,
        minCanon: 4,
        full: {
            scenario: ' [CANON]: Security Guard Thomas Anderson at First National reports (Hour 5): "Three days ago, saw a man in dark jacket with a camera taking photos of the bank exterior. Focused on the security cameras and entrance. Didn\'t seem suspicious at time - thought maybe doing architectural study or insurance assessment. Left quickly when I walked toward him." [HIDDEN CLUE NOW REVEALED: Photographer was checking access vulnerabilities, not architectural features - confirms crew planning security bypass]'
        },
        summary: {
            scenario: ' [CANON]: Guard Thomas Anderson (Hour 5): Photographer focused on cameras and entrance 3 days ago. Not just exterior shots. [HIDDEN: Security bypass planning confirmed]'
        },
        bullet: {
            scenario: ' [CANON]: Thomas (Hour 5): Photographer focused on cameras/entrance. Security bypass planning. [HIDDEN REVEALED]'
        }
    },

    // === HOUR 6 - CUSTOMER REPORT ===
    {
        id: 'canon_hour6_maria_report',
        keywords: ['maria', 'customer', 'maria rodriguez', 'river city customer'],
        importance: 9.0,
        minMessages: 6,
        minHour: 6,
        minCanon: 5,
        full: {
            scenario: ' [CANON]: Regular Customer Maria Rodriguez at River City reports (Hour 6): "For four days, I\'ve seen two people sitting in a silver sedan across the street from the bank. One with notebook writing constantly, other making phone calls. They leave whenever anyone approaches them or goes into the bank. Tried to tell temporary manager but he said \'probably just customers waiting\' and wouldn\'t call security."'
        },
        summary: {
            scenario: ' [CANON]: Maria Rodriguez (Hour 6): Two people in silver sedan watching bank for 4 days. Writing, making calls. Temporary manager ignored concerns.'
        },
        bullet: {
            scenario: ' [CANON]: Maria (Hour 6): Watchers in silver sedan, 4 days. Manager ignored concerns.'
        }
    },

    // === HOUR 7 - ANONYMOUS FOLLOW-UP ===
    {
        id: 'canon_hour7_followup',
        keywords: ['second tip', 'follow-up message', 'anonymous follow-up'],
        importance: 10.0,
        minMessages: 7,
        minHour: 7,
        minCanon: 6,
        full: {
            scenario: ' [CANON]: Second anonymous message received (Hour 7): "Inside help is female. The vault combination was provided voluntarily, not stolen. Crew will be at location by 1:30 PM for preparation. They have a maintenance vehicle to appear legitimate." [ONE HOUR REMAINING - DECISION REQUIRED]'
        },
        summary: {
            scenario: ' [CANON]: Anonymous follow-up (Hour 7): Inside help is female. Vault combo provided voluntarily. Crew at location 1:30 PM. Maintenance vehicle. [1 HOUR REMAINING]'
        },
        bullet: {
            scenario: ' [CANON]: Follow-up (Hour 7): Female inside help, vault combo given, 1:30 PM arrival, maintenance van. [1 HOUR REMAINING]'
        }
    },

    // === HOUR 8A - ROBBERY SUCCEEDED ===
    {
        id: 'canon_hour8_robbery_success',
        keywords: ['robbery occurred', 'robbery succeeded', 'robbery happened'],
        importance: 11.0,
        minMessages: 8,
        minHour: 8,
        minCanon: 7,
        full: {
            scenario: ' [CANON]: Robbery executed at Metro Community Bank at 2:00 PM (Hour 8). Three perpetrators: dark clothing, face coverings, used stolen maintenance van to appear legitimate. Inside person (Sarah Williams) disabled security cameras using manager override code. Crew accessed vault using provided combination. Made escape through residential streets before police response. Vault contents: approximately $850,000 in cash and small valuables. No security footage available (cameras disabled). [INVESTIGATION CONTINUES]'
        },
        summary: {
            scenario: ' [CANON]: Robbery at Metro Community Bank (Hour 8, 2 PM). Three perpetrators, Sarah Williams disabled cameras, vault accessed. $850,000 stolen. No footage. [INVESTIGATION CONTINUES]'
        },
        bullet: {
            scenario: ' [CANON]: Robbery succeeded (Hour 8): 3 perpetrators, Sarah disabled cameras, $850,000 stolen, no footage. [INVESTIGATION CONTINUES]'
        }
    },

    // === HOUR 8B - ROBBERY PREVENTED ===
    {
        id: 'canon_hour8_robbery_prevented',
        keywords: ['robbery prevented', 'robbery thwarted', 'stopped robbery'],
        importance: 11.0,
        minMessages: 8,
        minHour: 8,
        minCanon: 7,
        full: {
            scenario: ' [CANON]: Robbery attempt thwarted at Metro Community Bank at 1:45 PM (Hour 8). Player intervention prevented crew from gaining control. Two perpetrators (driver and outside support) apprehended fleeing scene. Inside person (Sarah Williams) in custody. Maintenance vehicle impounded. Vault never accessed. Sarah Williams provided full statement under questioning: "James Mercer made me do it - said he\'d reveal my gambling debts to my family and get me fired." [JAMES MERCER REVEALED AS MASTERMIND]'
        },
        summary: {
            scenario: ' [CANON]: Robbery prevented (Hour 8, 1:45 PM). Player intervention. Two perpetrators caught, Sarah in custody. James Mercer identified as mastermind.'
        },
        bullet: {
            scenario: ' [CANON]: Robbery prevented (Hour 8): Player stopped it. 2 caught, Sarah in custody. James Mercer = mastermind.'
        }
    },

    // === HOUR 9 - INITIAL INVESTIGATION ===
    {
        id: 'canon_hour9_investigation',
        keywords: ['police investigation', 'investigation update', 'robbery investigation'],
        importance: 9.0,
        minMessages: 9,
        minHour: 9,
        minCanon: 7,
        full: {
            scenario: ' [CANON]: Police investigation update (Hour 9): Robbery confirmed at Metro Community Bank. Stolen maintenance van abandoned two blocks away in residential neighborhood (clean prints wiped). Sarah Williams in custody. Two other perpetrators identified as James "Mercer" Mercer (known robbery crew leader) and Carlos Mendez (driver with multiple vehicular offenses). Both at large. No security footage from inside bank (exterior cameras disabled by manager code). [HUNT FOR MERCER BEGINS]'
        },
        summary: {
            scenario: ' [CANON]: Police update (Hour 9): Sarah in custody. James Mercer and Carlos Mendez identified. Maintenance van abandoned, prints wiped. No interior footage. [HUNT FOR MERCER]'
        },
        bullet: {
            scenario: ' [CANON]: Investigation (Hour 9): Sarah custody. Mercer + Mendez wanted. Van abandoned, no footage. [HUNT FOR MERCER]'
        }
    },

    // === HOUR 10 - MANAGER FULL STATEMENT ===
    {
        id: 'canon_hour10_sarah_confession',
        keywords: ['sarah statement', 'manager confession', 'sarah confession'],
        importance: 9.5,
        minMessages: 10,
        minHour: 10,
        minCanon: 8,
        full: {
            scenario: ' [CANON]: Sarah Williams confession (Hour 10): "James Mercer contacted me two weeks ago - said he knew about my gambling debts, could help me pay them off. Said he\'d also reveal everything to my family if I didn\'t help. Provided me vault combination and showed me how to disable security cameras. Told me robbery would happen today at 2 PM. Was supposed to be in vault to let crew in but you stopped them. I\'m sorry - I was scared and desperate." [GAMBLING DEBTS CONNECTION CONFIRMED - RED HERRING FROM HOUR 4 NOW MAKES SENSE]'
        },
        summary: {
            scenario: ' [CANON]: Sarah Williams confession (Hour 10): James Mercer blackmailed her about gambling debts 2 weeks ago. Provided vault combo and camera disable. Robbery set for 2 PM today. [RED HERRING EXPLAINED]'
        },
        bullet: {
            scenario: ' [CANON]: Sarah confession (Hour 10): Mercer blackmailed about gambling debts. Provided combo/camera disable. [RED HERRING EXPLAINED]'
        }
    },

    // === HOUR 12 - CREW BACKGROUND ===
    {
        id: 'canon_hour12_crew_background',
        keywords: ['james mercer', 'carlos mendez', 'crew background', 'mercer crew'],
        importance: 8.5,
        minMessages: 12,
        minHour: 12,
        minCanon: 10,
        full: {
            scenario: ' [CANON]: James "Mercer" Mercer criminal record (Hour 12): Armed robbery (2019, 2021), assault (2020), attempted grand larceny (2022). Operated in neighboring city with small crew. Never hit banks before - mostly retail establishments. Last known residence: abandoned warehouse district. Associate: Carlos Mendez (driver with 8 DUIs, 3 fleeing eluding charges). Both considered dangerous and possibly armed. [MERCER OPERATES FROM WAREHOUSE DISTRICT]'
        },
        summary: {
            scenario: ' [CANON]: James Mercer background (Hour 12): Armed robbery charges (2019, 2021), assault (2020). Never hit banks before. Carlos Mendez = driver with DUI record. Both armed and dangerous. Operates from warehouse district.'
        },
        bullet: {
            scenario: ' [CANON]: Mercer background (Hour 12): Armed robbery x2, assault. Mendez = driver (DUI record). Armed, dangerous. Warehouse district base.'
        }
    },

    // === HOUR 15 - GANG CONNECTION ===
    {
        id: 'canon_hour15_gang_connection',
        keywords: ['police leak', 'anonymous source', 'police connection'],
        importance: 9.5,
        minMessages: 15,
        minHour: 15,
        minCanon: 12,
        full: {
            scenario: ' [CANON]: Police surveillance connection (Hour 15): Anonymous tip about robbery came from inside police department - likely someone working with Mercer crew or trying to manipulate investigation. Phone records trace anonymous messages to burner phones purchased at electronics store in neighboring city (where Mercer operated before). Pattern suggests experienced crew with law enforcement knowledge. [SOMEONE IN POLICE IS HELPING MERCER]'
        },
        summary: {
            scenario: ' [CANON]: Police connection (Hour 15): Anonymous tips traced to burner phones. Source appears to be inside police department. Crew has law enforcement knowledge. [POLICE MOLE SUSPECTED]'
        },
        bullet: {
            scenario: ' [CANON]: Police connection (Hour 15): Tips from burner phones. Source inside police. Crew knows law enforcement. [POLICE MOLE]'
        }
    },

    // === HOUR 18 - BANK SECURITY COMPROMISE ===
    {
        id: 'canon_hour18_security_compromise',
        keywords: ['forensic analysis', 'security footage', 'camera logs'],
        importance: 9.0,
        minMessages: 18,
        minHour: 18,
        minCanon: 14,
        full: {
            scenario: ' [CANON]: Forensic analysis of Metro Community security system (Hour 18): External cameras disabled using Sarah Williams\' manager override code (entered from her terminal at 1:30 PM). However, internal camera system had secondary failure - appears to have been compromised days in advance (possibly during Sarah\'s "maintenance checks" of vault). Some internal footage recovered showing crew planning inside bank on previous days (using maintenance cover). [PLANNING STARTED DAYS BEFORE ROBBERY]'
        },
        summary: {
            scenario: ' [CANON]: Security analysis (Hour 18): External cameras disabled by Sarah at 1:30 PM. Internal cameras failed days earlier (Sarah\'s "maintenance"). Recovered footage shows planning inside bank. [PLANNING BEGAN DAYS AGO]'
        },
        bullet: {
            scenario: ' [CANON]: Security analysis (Hour 18): Sarah disabled external cameras at 1:30 PM. Internal failed earlier. Planning footage recovered. [PLANNING STARTED DAYS AGO]'
        }
    },

    // === HOUR 21 - MASTERMIND CONNECTION ===
    {
        id: 'canon_hour21_mastermind',
        keywords: ['marcus thorne', 'first national ceo', 'mastermind connection'],
        importance: 10.0,
        minMessages: 21,
        minHour: 21,
        minCanon: 17,
        full: {
            scenario: ' [CANON]: Financial investigation reveals (Hour 21): Sarah Williams\' gambling debts were financed by offshore accounts tracing to shell corporation. Shell corporation controlled by CEO Marcus Thorne of First National Bank. First National has proposed acquisition of Metro Community Bank in upcoming merger discussions - merger would eliminate Metro Community as competitor and consolidate downtown banking market. Thorne stands to gain significantly from Metro Community\'s reputation damage or acquisition at reduced price. [FIRST NATIONAL IS BEHIND EVERYTHING - INITIAL RED HERRING NOW MAKES SENSE]'
        },
        summary: {
            scenario: ' [CANON]: Mastermind connection (Hour 21): Sarah\'s debts financed by shell corporation controlled by Marcus Thorne (First National CEO). First National wants to acquire Metro Community in merger. Thorne benefits from Metro\'s damage. [FIRST NATIONAL = MASTERMIND]'
        },
        bullet: {
            scenario: ' [CANON]: Mastermind (Hour 21): Sarah\'s debts financed by Marcus Thorne (First National CEO). Thorne benefits from Metro\'s damage in merger. [FIRST NATIONAL = ORCHESTRATOR]'
        }
    },

    // === HOUR 24 - FINAL CLUE ===
    {
        id: 'canon_hour24_final_clue',
        keywords: ['complete picture', 'final revelation', 'mastermind plan'],
        importance: 11.0,
        minMessages: 24,
        minHour: 24,
        minCanon: 20,
        full: {
            scenario: ' [CANON]: Complete picture revealed (Hour 24): Marcus Thorne (First National CEO) hired James Mercer crew to target Metro Community Bank through multiple cutouts to avoid direct connection. Goal: Damage Metro Community\'s reputation and value, allowing First National to acquire them at reduced price in upcoming merger. Anonymous tips were designed to either force player intervention (making Thorne appear helpful) or ensure robbery succeeded (damaging Metro Community). Mercer crew was disposable - Thorne\'s actual plan was to ensure Metro Community either failed robbery or successful robbery, both outcomes beneficial to him. [INVESTIGATION COMPLETE - MARCUS THORNE ARRESTED]'
        },
        summary: {
            scenario: ' [CANON]: Complete picture (Hour 24): Marcus Thorne (First National CEO) hired Mercer through cutouts to damage Metro Community, enabling acquisition at reduced price. Anonymous tips designed to manipulate outcome. Both robbery success/failure benefited Thorne. Thorne arrested. [INVESTIGATION COMPLETE]'
        },
        bullet: {
            scenario: ' [CANON]: Complete picture (Hour 24): Thorne hired Mercer to damage Metro for cheap acquisition. Tips manipulated outcome. Both outcomes benefited Thorne. Thorne arrested. [INVESTIGATION COMPLETE]'
        }
    }
];

// === DROP-IN/OUT ENTITY DATABASE (MODIFY THIS SECTION) ===
// Witnesses and locations activate only when mentioned in conversation
const entityMentions = {
    // WITNESSES
    thomas: /thomas|guard thomas|security guard/i.test(lastMessage),
    maria: /maria|customer marie|rodriguez/i.test(lastMessage),
    sarah: /sarah|manager sarah|sarah williams/i.test(lastMessage),
    
    // LOCATIONS
    first_national: /first national|first bank|downtown bank/i.test(lastMessage),
    river_city: /river city|savings|waterfront bank/i.test(lastMessage),
    metro_community: /metro community|metro bank|community bank/i.test(lastMessage)
};

const characterLore = [];

// === WITNESS: THOMAS ANDERSON (Security Guard) ===
if (FEATURES.DROP_IN_OUT && entityMentions.thomas) {
    characterLore.push({
        keywords: ['thomas', 'security guard', 'first national'],
        priority: 8,
        content: {
            scenario: `Thomas Anderson (Security Guard at First National Bank) ${
                canonCount >= 4 
                    ? 'has provided testimony about suspicious photographer: "Three days ago, saw a man in dark jacket with a camera taking photos of the bank exterior. Focused on the security cameras and entrance." [Hidden detail revealed: Photographer was checking security systems, not just taking pictures]' 
                    : 'is stationed at entrance and lobby. Has worked at First National for three years. Generally observant but can be distracted. Has noticed some unusual activity recently but hasn\'t thought to report it.'}. ${
                canonCount >= 4 
                    ? 'Thomas is now cooperating fully with investigation.' 
                    : 'Thomas would cooperate if questioned directly.'}`,
            personality: `<BEGIN 'Thomas' PERSONALITY>
Thomas Anderson is armed security guard at First National Bank.
Thomas has worked at First National for three years and knows the building well.
Thomas is generally observant but sometimes misses significance of what he sees.
Thomas is dutiful and follows security protocols.
Thomas is cooperative when questioned but may require prompting to recall details.
Thomas doesn't consider himself particularly important to investigations.
Thomas is proud of his role in protecting the bank.
<END 'Thomas' PERSONALITY>`
        }
    });
}

// === WITNESS: MARIA RODRIGUEZ (Regular Customer) ===
if (FEATURES.DROP_IN_OUT && entityMentions.maria) {
    characterLore.push({
        keywords: ['maria', 'customer', 'river city'],
        priority: 8,
        content: {
            scenario: `Maria Rodriguez is regular customer at River City Savings. She has banked there for over ten years and knows the normal routines of the branch. ${
                canonCount >= 5 
                    ? 'has reported suspicious activity: "For four days, I\'ve seen two people sitting in a silver sedan across the street from the bank. One with notebook writing constantly, other making phone calls. They leave whenever anyone approaches. Tried to tell temporary manager but he said \'probably just customers waiting\' and wouldn\'t call security."' 
                    : 'is observant about the branch and its regular customers. She has noticed some unfamiliar faces recently, including what appears to be a temporary manager filling in.'} ${
                canonCount >= 5 
                    ? 'Maria is frustrated that her legitimate concerns weren\'t taken seriously by the temporary manager.' 
                    : 'Maria would be eager to help if someone took her concerns seriously.'}`,
            personality: `<BEGIN 'Maria' PERSONALITY>
Maria Rodriguez is retiree who banks at River City Savings daily.
Maria is highly observant and knows what constitutes "normal" at the branch.
Maria is protective of "her" bank and cares about its security.
Maria has noticed unusual activity recently and is concerned.
Maria has tried to report her concerns but was dismissed by temporary manager.
Maria is frustrated that legitimate security concerns weren't taken seriously.
Maria is willing to cooperate with investigators who will listen.
<END 'Maria' PERSONALITY>`
        }
    });
}

// === WITNESS: SARAH WILLIAMS (Bank Manager) ===
if (FEATURES.DROP_IN_OUT && entityMentions.sarah) {
    characterLore.push({
        keywords: ['sarah', 'manager', 'metro community'],
        priority: 9,
        content: {
            scenario: (function() {
                let scenarioText = 'Sarah Williams is manager at Metro Community Bank. ';
                let cooperationText = '';
                
                if (canonCount >= 4 && canonCount < 8) {
                    scenarioText += 'has been exhibiting nervous behavior: checking vault access logs repeatedly, taking private phone calls, appearing anxious when questioned. Has made several large personal withdrawals recently. [This behavior appears suspicious but there may be an explanation]';
                } else if (canonCount >= 8) {
                    scenarioText += 'has provided full confession: "James Mercer contacted me two weeks ago - knew about my gambling debts, threatened to reveal to my family. Provided vault combination and showed me how to disable security cameras. Told me robbery would happen today at 2 PM." [Gambling debts were unrelated to robbery planning - misdirection]';
                    cooperationText = 'Sarah is in custody and cooperating fully with investigation.';
                } else {
                    scenarioText += 'has been working at Metro Community Bank for five years. Generally well-liked by customers and staff.';
                    cooperationText = 'Sarah appears stressed but professional.';
                }
                
                if (canonCount >= 4 && canonCount < 8) {
                    cooperationText = 'Sarah is visibly nervous when questioned.';
                }
                
                return scenarioText + ' ' + cooperationText;
            })(),
            personality: (function() {
                let personalityText = '<BEGIN \'Sarah\' PERSONALITY>\n';
                
                if (canonCount >= 8) {
                    personalityText += 'Sarah Williams is former manager at Metro Community Bank, now in custody for her role in the robbery.\n';
                    personalityText += 'Sarah was blackmailed by James Mercer about her gambling debts.\n';
                    personalityText += 'Sarah provided vault combination and disabled security cameras to help the robbery crew.\n';
                    personalityText += 'Sarah is remorseful and cooperating fully with investigators.\n';
                    personalityText += 'Sarah recognizes she was used and is helping to identify Mercer and his associates.';
                } else if (canonCount >= 4) {
                    personalityText += 'Sarah Williams is manager at Metro Community Bank.\n';
                    personalityText += 'Sarah has been exhibiting nervous and suspicious behavior recently.\n';
                    personalityText += 'Sarah has been making large personal withdrawals and taking private phone calls.\n';
                    personalityText += 'Sarah appears anxious when questioned about her activities.\n';
                    personalityText += 'Sarah\'s behavior raises questions about her involvement in something unusual.';
                } else {
                    personalityText += 'Sarah Williams is manager at Metro Community Bank.\n';
                    personalityText += 'Sarah has worked at Metro Community Bank for five years.\n';
                    personalityText += 'Sarah is generally professional and well-regarded by customers.\n';
                    personalityText += 'Sarah handles daily operations and vault access procedures.\n';
                    personalityText += 'Sarah is responsible for maintaining bank security protocols.';
                }
                
                return personalityText + '<END \'Sarah\' PERSONALITY>';
            })()
        }
    });
}

// === LOCATION: FIRST NATIONAL BANK ===
if (FEATURES.DROP_IN_OUT && entityMentions.first_national) {
    characterLore.push({
        keywords: ['first national', 'downtown', 'bank'],
        priority: 7,
        content: {
            scenario: `First National Bank is downtown's premier banking institution with state-of-the-art security. ${
                canonCount >= 1 
                    ? 'Features: advanced camera system covering all approaches, bulletproof glass at teller stations, armed guards at entrance and vault access. Vault requires simultaneous authorization from two senior staff. Vault contains mainly paperwork and small valuables - bulk cash transferred to central vault nightly. [Not the robbery target - appears in anonymous tip as red herring]' 
                    : 'This is a large, modern bank in the downtown district. It appears well-defended and professionally run.'} ${
                canonCount >= 1 
                    ? 'First National has proposed acquiring Metro Community Bank in upcoming merger discussions.' 
                    : ''}`,
            personality: `<BEGIN 'First National' SETTING>
First National Bank is a downtown banking institution with high security standards.
The building features modern architecture and professional atmosphere.
Security is a priority at First National with multiple guards and surveillance systems.
First National represents established banking authority in the city.
First National is considering acquisitions of smaller banks like Metro Community.
<END 'First National' SETTING>`
        }
    });
}

// === LOCATION: RIVER CITY SAVINGS ===
if (FEATURES.DROP_IN_OUT && entityMentions.river_city) {
    characterLore.push({
        keywords: ['river city', 'waterfront', 'savings bank'],
        priority: 7,
        content: {
            scenario: `River City Savings is an older bank in the waterfront district with historic charm. ${
                canonCount >= 2 
                    ? 'Features: 1960s-era vault with manual locking mechanism, limited camera coverage (main lobby and vault room only), single unarmed guard at entrance. Back door leads to unmonitored alleyway connecting to waterfront streets. Manager has been on emergency medical leave for past week; temporary manager unfamiliar with branch operations. [Not the robbery target - appears vulnerable but not chosen]' 
                    : 'This is an older bank building with historic architecture. It has a more traditional feel compared to modern banks.'} ${
                canonCount >= 6 
                    ? 'Regular customer Maria Rodriguez has reported suspicious watchers near the bank for four days.' 
                    : ''}`,
            personality: `<BEGIN 'River City' SETTING>
River City Savings is a historic bank in the waterfront district.
The building dates from the 1960s with traditional vault systems.
River City has a loyal customer base who appreciate its old-fashioned service.
The waterfront location provides scenic views but also creates access considerations.
Security is less modern than newer banks, relying on older systems.
<END 'River City' SETTING>`
        }
    });
}

// === LOCATION: METRO COMMUNITY BANK ===
if (FEATURES.DROP_IN_OUT && entityMentions.metro_community) {
    characterLore.push({
        keywords: ['metro community', 'metro bank', 'community bank'],
        priority: 8,
        content: {
            scenario: `Metro Community Bank is a small neighborhood bank serving the residential district. ${
                canonCount >= 3 
                    ? 'Features: modern vault but visible from teller line (can see when accessed), single security guard covering entrance and vault room, residential street access in multiple directions. No bulletproof glass at teller stations. Small branch - less staff, faster response times to customers. [THIS IS THE ROBBERY TARGET]' 
                    : 'This is a small community bank in a residential neighborhood. It has a more personal, neighborhood atmosphere.'} ${
                canonCount >= 8 
                    ? 'Manager Sarah Williams was providing inside help to the robbery crew - disabled cameras and provided vault combination.' 
                    : canonCount >= 4 
                        ? 'Manager Sarah Williams has been behaving suspiciously recently - checking vault access logs, taking private calls, making large withdrawals.' 
                        : ''}`,
            personality: `<BEGIN 'Metro Community' SETTING>
Metro Community Bank is a small neighborhood-focused bank serving the residential district.
The branch has a personal, welcoming atmosphere and knows many customers by name.
Security is adequate but not as extensive as larger banks.
The residential location provides multiple access points and escape routes.
Metro Community focuses on community relationships and customer service.
<END 'Metro Community' SETTING>`
        }
    });
}

// === ACTIVATION ENGINE (DO NOT MODIFY) ===
let activatedCanon = [];
let triggeredKeywords = [];

// First pass: Check direct keyword matches for canon database
canonDatabase.forEach(entry => {
    // Check minimum message count
    if (messageCount < entry.minMessages) return;
    
    // Check minimum hour
    if (FEATURES.TIMELINE_EVENTS && currentHour < entry.minHour) return;
    
    // Check minimum canon count
    if (FEATURES.STAT_TRACKING && canonCount < entry.minCanon) return;
    
    // Check keyword presence
    const hasKeyword = entry.keywords.some(keyword => lastMessage.includes(keyword));
    if (!hasKeyword) return;
    
    // Activate canon entry
    activatedCanon.push(entry);
    
    // Collect triggers for cascading
    if (entry.importance > 8.0) {
        entry.keywords.forEach(keyword => triggeredKeywords.push(keyword));
    }
});

// Token management (if enabled)
if (FEATURES.CONTEXT_AWARE_BUDGETING) {
    const MAX_TOKENS = 1500;
    let usedTokens = 0;
    const managedCanon = [];
    
    // Sort by importance and mention count
    const sortedCanon = activatedCanon.sort((a, b) => {
        const aMentions = countMentions(a.keywords, lastMessage);
        const bMentions = countMentions(b.keywords, lastMessage);
        if (aMentions !== bMentions) return bMentions - aMentions;
        return b.importance - a.importance;
    });
    
    // Assign detail level based on token budget
    sortedCanon.forEach(entry => {
        const mentionCount = countMentions(entry.keywords, lastMessage);
        let version;
        
        // High-priority or recently-mentioned entries get full version
        if (entry.importance >= 10.0 || mentionCount >= 2) {
            version = entry.full;
            if (usedTokens + estimateTokens(version.scenario) <= MAX_TOKENS) {
                managedCanon.push(entry.full);
                usedTokens += estimateTokens(version.scenario);
            }
        }
        // Medium-priority entries get summary
        else if (entry.importance >= 8.0) {
            version = entry.summary;
            if (usedTokens + estimateTokens(version.scenario) <= MAX_TOKENS) {
                managedCanon.push(entry.summary);
                usedTokens += estimateTokens(version.scenario);
            }
        }
        // Low-priority entries get bullet
        else {
            version = entry.bullet;
            if (usedTokens + estimateTokens(version.scenario) <= MAX_TOKENS) {
                managedCanon.push(entry.bullet);
                usedTokens += estimateTokens(version.scenario);
            }
        }
    });
    
    // Replace activatedCanon with managed version
    activatedCanon = managedCanon;
}

// === APPLY CANON (DO NOT MODIFY) ===
activatedCanon
    .sort((a, b) => b.importance - a.importance)
    .forEach(entry => {
        if (entry.scenario && !context.character.scenario.includes(entry.scenario)) {
            context.character.scenario += '\n\n' + entry.scenario;
        }
    });

// Apply character/location lore
characterLore.forEach(entity => {
    if (entity.content.scenario) {
        context.character.scenario += '\n\n' + entity.content.scenario;
    }
    if (entity.content.personality) {
        context.character.personality += '\n\n' + entity.content.personality;
    }
});

// === HOUR-BASED TIMELINE EVENTS (MODIFY THIS SECTION) ===
// This section creates events based on hour progression
// MODIFY the hour values and event content as needed for your story

if (FEATURES.TIMELINE_EVENTS) {
    
    // === HOUR 0 - INITIAL TIP (Always provided at start) ===
    if (currentHour === 0 && canonCount >= 0) {
        context.character.scenario += '\n\n[CANON]: Anonymous message received: "One of three major banks will be hit tomorrow. They\'re going after the largest vault but weakest defense. It\'s happening around 2 PM. The crew has inside help." Time is 0:00 AM. 24 hours until robbery. [BEGIN INVESTIGATION]';
    }
    
    // === HOUR 1-3 - BANK VISITS (Observational clues) ===
    if (currentHour === 1 && canonCount >= 1) {
        context.character.scenario += '\n\n[CANON]: First National Bank security assessment: Advanced cameras, bulletproof glass, armed guards, two-person vault authorization. Cash transferred nightly.';
    }
    
    if (currentHour === 2 && canonCount >= 2) {
        context.character.scenario += '\n\n[CANON]: River City Savings security: 1960s-era vault, limited cameras, single guard, back alley access. Temporary manager unfamiliar with operations.';
    }
    
    if (currentHour === 3 && canonCount >= 3) {
        context.character.scenario += '\n\n[CANON]: Metro Community Bank security: Visible vault, single guard, multiple exits, no bulletproof glass. Small branch with neighborhood atmosphere.';
    }
    
    // === HOUR 4-7 - WITNESS INTERVIEWS (Detailed clues) ===
    if (currentHour === 4 && canonCount >= 3) {
        context.character.scenario += '\n\n[CANON]: Manager Sarah Williams (Metro Community) exhibiting unusual behavior: checking vault access logs, private calls, nervous when questioned. Large personal withdrawals.';
    }
    
    if (currentHour === 5 && canonCount >= 4) {
        context.character.scenario += '\n\n[CANON]: Security Guard Thomas (First National) reports: Photographer focused on security cameras and entrance 3 days ago. Not just exterior shots.';
    }
    
    if (currentHour === 6 && canonCount >= 5) {
        context.character.scenario += '\n\n[CANON]: Customer Maria (River City) reports: Watchers in silver sedan for 4 days. Writing, making calls. Temporary manager ignored concerns.';
    }
    
    if (currentHour === 7 && canonCount >= 6) {
        context.character.scenario += '\n\n[CANON]: Second anonymous message: Inside help is female. Vault combo provided voluntarily. Crew at location 1:30 PM. Maintenance vehicle. [ONE HOUR REMAINING]';
    }
    
    // === HOUR 8 - ROBBERY EVENT (Conditional based on player action) ===
    if (currentHour === 8 && canonCount >= 7) {
        const atMetro = lastMessage.includes('metro') || 
                          lastMessage.includes('community bank');
        
        if (atMetro && canonCount >= 7) {
            // Robbery prevented
            context.character.scenario += '\n\n[CANON]: Robbery attempt thwarted at 1:45 PM! Player intervention stopped crew. Two perpetrators caught, Sarah Williams in custody. James Mercer identified as mastermind. [ROBBERY PREVENTED]';
        } else {
            // Robbery succeeded
            context.character.scenario += '\n\n[CANON]: Robbery executed at 2:00 PM! Metro Community Bank hit. Sarah Williams disabled cameras, vault accessed. $850,000 stolen. No footage available. [ROBBERY SUCCEEDED]';
        }
    }
    
    // === HOUR 9-23 - INVESTIGATION PHASE (Background information) ===
    if (currentHour === 9 && canonCount >= 7) {
        context.character.scenario += '\n\n[CANON]: Police investigation: Sarah in custody. James Mercer and Carlos Mendez identified as perpetrators. Maintenance van abandoned, prints wiped. No interior footage. [HUNT FOR MERCER BEGINS]';
    }
    
    if (currentHour === 10 && canonCount >= 8) {
        context.character.scenario += '\n\n[CANON]: Sarah Williams confession: James Mercer blackmailed her about gambling debts. Provided vault combo and camera disable. Robbery set for 2 PM. [RED HERRING EXPLAINED]';
    }
    
    if (currentHour === 12 && canonCount >= 10) {
        context.character.scenario += '\n\n[CANON]: James Mercer background: Armed robbery x2, assault. Never hit banks before. Carlos Mendez = driver with DUI record. Both armed and dangerous. Operates from warehouse district.';
    }
    
    if (currentHour === 15 && canonCount >= 12) {
        context.character.scenario += '\n\n[CANON]: Police connection: Anonymous tips traced to burner phones. Source appears to be inside police department. Crew has law enforcement knowledge. [POLICE MOLE SUSPECTED]';
    }
    
    if (currentHour === 18 && canonCount >= 14) {
        context.character.scenario += '\n\n[CANON]: Security analysis: Sarah disabled external cameras at 1:30 PM. Internal cameras failed earlier (Sarah\'s "maintenance"). Planning footage recovered. [PLANNING STARTED DAYS AGO]';
    }
    
    if (currentHour === 21 && canonCount >= 17) {
        context.character.scenario += '\n\n[CANON]: Mastermind connection: Sarah\'s debts financed by Marcus Thorne (First National CEO). Thorne benefits from Metro\'s damage in merger. [FIRST NATIONAL = MASTERMIND]';
    }
    
    // === HOUR 24 - FINAL REVELATION ===
    if (currentHour === 24 && canonCount >= 20) {
        context.character.scenario += '\n\n[CANON]: Complete picture: Marcus Thorne (First National CEO) hired Mercer through cutouts to damage Metro Community for cheap acquisition. Tips manipulated outcome. Both outcomes benefited Thorne. Thorne arrested. [INVESTIGATION COMPLETE]';
    }
}

// === DEBUGGING (OPTIONAL) ===
if (FEATURES.DEBUG_MODE) {
    context.character.scenario += `\n\n[DEBUG: Activated ${activatedCanon.length} canon entries, ${characterLore.length} entities. Hour: ${currentHour}, Canon Count: ${canonCount}, Message Count: ${messageCount}]`;
    
    if (FEATURES.CONTEXT_AWARE_BUDGETING) {
        const usedTokens = activatedCanon.reduce((total, entry) => total + estimateTokens(entry.scenario), 0);
        context.character.scenario += `\n[DEBUG TOKENS: ${usedTokens}/1500 used]`;
    }
    
    if (triggeredKeywords.length > 0) {
        context.character.scenario += `\n[DEBUG TRIGGERS: ${triggeredKeywords.join(', ')}]`;
    }
}

// === SCRIPT END ===
