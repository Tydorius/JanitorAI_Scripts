console.log(`--- General Debug Script ---`);

// --- UNDEFINED CHECKS ---
console.log(`--- ATTEMPTING TO GET TYPES (Undefined Expected) ---`);
console.log(`Type of alternate_greetings: ${typeof context.character.alternate_greetings}`);
console.log(`Type of avatar_url: ${typeof context.character.avatar_url}`);
console.log(`Type of character_tagline: ${typeof context.character.character_tagline}`);
console.log(`Type of description: ${typeof context.character.description}`);
console.log(`Type of first_message: ${typeof context.character.first_message}`);
console.log(`Type of conversation_id: ${typeof context.chat.conversation_id}`);
console.log(`Type of message_created_at: ${typeof context.chat.message_created_at}`); // Fixed typo here
console.log(`Type of user_name: ${typeof context.chat.user_name}`);

// --- STRINGIFY CHECKS ---
console.log(`--- VIEWABLE VIA STRINGIFY ---`);
console.log(`context.chat: ${JSON.stringify(context.chat)}`);
console.log(`context.character: ${JSON.stringify(context.character)}`);
console.log(`context.character.example_dialogs: ${JSON.stringify(context.character.example_dialogs)}`);
console.log(`context.chat.last_message: ${JSON.stringify(context.chat.last_message)}`);
console.log(`context.chat.last_messages: ${JSON.stringify(context.chat.last_messages)}`);
console.log(`context.chat.message_count: ${JSON.stringify(context.chat.message_count)}`);
console.log(`context.character.name: ${JSON.stringify(context.character.name)}`);

// --- GENERAL OBJECT TYPES ---
console.log(`--- OBJECT TYPES ---`);
console.log(`Type of context.chat: ${typeof context.chat}`);
console.log(`Type of context.character: ${typeof context.character}`);
console.log(`Type of example_dialogs: ${typeof context.character.example_dialogs}`);
console.log(`Type of last_message: ${typeof context.chat.last_message}`);
console.log(`Type of last_messages: ${typeof context.chat.last_messages}`);
console.log(`Type of message_count: ${typeof context.chat.message_count}`);
console.log(`Type of character.name: ${typeof context.character.name}`);

// --- RAW STRINGS ---
console.log(`--- RAW STRINGS (No Stringify Required) ---`);
console.log(`Personality: ${context.character.personality}`);
console.log(`Scenario: ${context.character.scenario}`);

// Forcing long explanatory text to log by wrapping it in a template literal
console.log(`NOTE: As of the last time I worked on this, only example_dialogs, personality, and scenario are sent back to the model.`);
console.log(`NOTE: Everything else is touched by the Script, but not passed to the LLM.`);