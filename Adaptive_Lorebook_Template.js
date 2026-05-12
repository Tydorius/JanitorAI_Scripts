// Adaptive Lorebook Template for JanitorAI Scripts
// Manages token usage by dynamically adjusting detail level based on context relevance
// Compatible with JanitorAI Scripts API

// Configuration
const MAX_TOKENS = 1500; // Maximum tokens to use for lore entries

// Core system access
const lastMessage = context.chat.last_message ? context.chat.last_message.toLowerCase() : '';
const messageCount = context.chat.message_count || 0;

// Utility function to estimate token count from text
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Utility function to count keyword mentions in text
function countMentions(keywords, text) {
  let count = 0;
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    const matches = text.match(regex);
    if (matches) count += matches.length;
  });
  return count;
}

// Lore database with Full, Summary, and Bullet versions
// Each entry must include: id, keywords, importance, full, summary, bullet
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
      scenario: ' The capital is the empire\'s political center, divided into Noble, Merchant, and Lower districts. Political factions compete for influence.'
    },
    bullet: {
      personality: ', knows the capital',
      scenario: ' Capital city: Noble Quarter, Merchant Quarter, Lower District. Political hub.'
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
      scenario: ' The Mages Guild regulates all legal magic use. They maintain academies, conduct research, and hold political influence through advisory roles.'
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
      scenario: ' The Merchant Guild represents the economic backbone of the empire. They control trade routes, set prices for key commodities, and negotiate treaties with foreign markets. Guild membership is hereditary for established families but can be purchased by wealthy newcomers. The Guild maintains its own security force to protect caravans and warehouses from bandits and rival factions.'
    },
    summary: {
      personality: ', familiar with Merchant Guild operations',
      scenario: ' The Merchant Guild controls trade routes and commodity pricing. Membership is hereditary or purchasable, and they maintain private security.'
    },
    bullet: {
      personality: ', aware of Merchant Guild',
      scenario: ' Merchant Guild: controls trade, sets prices, private security force.'
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
      scenario: ' Duke Ashford is a skilled politician controlling the western provinces. He builds alliances and gathers intelligence while maintaining fair governance in his territory.'
    },
    bullet: {
      personality: ', knows Duke Ashford',
      scenario: ' Duke Ashford: western provinces, ambitious politician, fair local governor.'
    }
  },

  {
    id: 'character_priestess',
    keywords: ['high priestess', 'priestess elena', 'temple leader'],
    importance: 6.5,
    full: {
      personality: ', recognizing High Priestess Elena\'s spiritual authority and diplomatic influence',
      scenario: ' High Priestess Elena leads the Temple of the Seven Lights, the dominant religious institution in the empire. Now in her sixties, she has served for over thirty years and commands the loyalty of thousands of clergy and followers. She advocates for the poor and often mediates disputes between noble houses. Her word carries significant weight in matters of tradition and morality, though she carefully avoids direct involvement in political power struggles.'
    },
    summary: {
      personality: ', familiar with High Priestess Elena\'s role',
      scenario: ' High Priestess Elena leads the Temple of the Seven Lights. She advocates for the poor, mediates noble disputes, and holds moral authority.'
    },
    bullet: {
      personality: ', knows High Priestess Elena',
      scenario: ' High Priestess Elena: religious leader, mediator, advocates for poor.'
    }
  },

  {
    id: 'history_war',
    keywords: ['great war', 'border conflict', 'northern campaign'],
    importance: 5.0,
    full: {
      personality: ', versed in the history and consequences of the Great War',
      scenario: ' The Great War ended fifteen years ago after a decade of brutal conflict with the northern kingdoms. It concluded with a costly victory for the empire but left the treasury depleted and the military exhausted. Veterans still struggle with their experiences, and border tensions remain high. The war reshaped political alliances and elevated certain military families to positions of power while others fell into obscurity.'
    },
    summary: {
      personality: ', aware of Great War history',
      scenario: ' The Great War ended fifteen years ago. The empire won but suffered economic strain. Veterans and border tensions remain issues.'
    },
    bullet: {
      personality: ', knows of Great War',
      scenario: ' Great War: ended 15 years ago, empire victory, economic costs.'
    }
  }
];

// Build activation array with mention counts
const activationArray = [];

loreDatabase.forEach(entry => {
  const mentions = countMentions(entry.keywords, lastMessage);

  if (mentions > 0) {
    activationArray.push({
      lore_id: entry.id,
      mentions: mentions,
      importance: entry.importance,
      tokens: estimateTokens(entry.full.personality + entry.full.scenario),
      type: 'full',
      entry: entry
    });
  }
});

// Sort by mentions (descending), then by importance (descending) for tiebreakers
activationArray.sort((a, b) => {
  if (b.mentions !== a.mentions) {
    return b.mentions - a.mentions;
  }
  return b.importance - a.importance;
});

// Calculate total tokens
function calculateTotalTokens(arr) {
  return arr.reduce((sum, item) => sum + item.tokens, 0);
}

// Adaptive token management
// Ensure top 3 stay full, next 3 prefer summary, rest can be bullets
if (activationArray.length > 0) {
  let totalTokens = calculateTotalTokens(activationArray);

  // If we exceed max tokens, start reducing detail level
  if (totalTokens > MAX_TOKENS) {
    // First pass: reduce entries beyond top 3 to summary (excluding next 3 if possible)
    for (let i = activationArray.length - 1; i >= 6 && totalTokens > MAX_TOKENS; i--) {
      const item = activationArray[i];
      if (item.type === 'full') {
        const summaryTokens = estimateTokens(item.entry.summary.personality + item.entry.summary.scenario);
        totalTokens = totalTokens - item.tokens + summaryTokens;
        item.tokens = summaryTokens;
        item.type = 'summary';
      }
    }

    // Second pass: reduce entries 4-6 to summary if still over limit
    for (let i = 5; i >= 3 && totalTokens > MAX_TOKENS; i--) {
      if (i < activationArray.length) {
        const item = activationArray[i];
        if (item.type === 'full') {
          const summaryTokens = estimateTokens(item.entry.summary.personality + item.entry.summary.scenario);
          totalTokens = totalTokens - item.tokens + summaryTokens;
          item.tokens = summaryTokens;
          item.type = 'summary';
        }
      }
    }

    // Third pass: convert non-top-3 summaries to bullets if still over limit
    for (let i = activationArray.length - 1; i >= 3 && totalTokens > MAX_TOKENS; i--) {
      const item = activationArray[i];
      if (item.type === 'summary') {
        const bulletTokens = estimateTokens(item.entry.bullet.personality + item.entry.bullet.scenario);
        totalTokens = totalTokens - item.tokens + bulletTokens;
        item.tokens = bulletTokens;
        item.type = 'bullet';
      }
    }

    // Fourth pass: if still over, reduce position 3 and 2 to summary
    if (totalTokens > MAX_TOKENS && activationArray.length > 2) {
      for (let i = 2; i >= 1 && totalTokens > MAX_TOKENS; i--) {
        const item = activationArray[i];
        if (item.type === 'full') {
          const summaryTokens = estimateTokens(item.entry.summary.personality + item.entry.summary.scenario);
          totalTokens = totalTokens - item.tokens + summaryTokens;
          item.tokens = summaryTokens;
          item.type = 'summary';
        }
      }
    }

    // Fifth pass: convert all remaining summaries to bullets except top entry
    if (totalTokens > MAX_TOKENS) {
      for (let i = activationArray.length - 1; i >= 1 && totalTokens > MAX_TOKENS; i--) {
        const item = activationArray[i];
        if (item.type === 'summary') {
          const bulletTokens = estimateTokens(item.entry.bullet.personality + item.entry.bullet.scenario);
          totalTokens = totalTokens - item.tokens + bulletTokens;
          item.tokens = bulletTokens;
          item.type = 'bullet';
        }
      }
    }
  }
}

// Apply lore to context based on determined detail level
activationArray.forEach(item => {
  const loreContent = item.entry[item.type];

  if (loreContent.personality) {
    context.character.personality += loreContent.personality;
  }

  if (loreContent.scenario) {
    context.character.scenario += loreContent.scenario;
  }
});

// Usage Instructions:
// 1. Adjust MAX_TOKENS based on your target model's context window
// 2. Add your own lore entries to loreDatabase with full, summary, and bullet versions
// 3. Set importance values as floats (higher = more important)
// 4. Test by using trigger keywords to see adaptive detail levels in action
// 5. Monitor actual token usage and adjust MAX_TOKENS as needed