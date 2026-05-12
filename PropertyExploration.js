// These are undefined, unable to view via stringify, tried to determine object types
console.log(`${(typeof context.character.alternate_greetings}`);
console.log(`${(typeof context.character.avatar_url}`);
console.log(`${(typeof context.character.character_tagline}`);
console.log(`${(typeof context.character.description}`);
console.log(`${(typeof context.character.first_message}`);
console.log(`${(typeof context.chat.conversation_id}`);
console.log(`${(typeof context.chat.message_crteated_at}`);
console.log(`${(typeof context.chat.user_name}`);
// These are viewable via stringify
console.log(`${JSON.stringify(context.chat)}`);
console.log(`${JSON.stringify(context.character)}`);
console.log(`${JSON.stringify(context.character.example_dialogs)}`);
console.log(`${JSON.stringify(context.chat.last_message)}`);
console.log(`${JSON.stringify(context.chat.last_messages)}`);
console.log(`${JSON.stringify(context.chat.message_count)}`);
console.log(`${JSON.stringify(context.character.name)}`);
// Object types - General just Object.
console.log(`${(typeof context.chat)}`);
console.log(`${(typeof context.character)}`);
console.log(`${(typeof context.character.example_dialogs)}`);
console.log(`${(typeof context.chat.last_message)}`);
console.log(`${(typeof context.chat.last_messages)}`);
console.log(`${(typeof context.chat.message_count)}`);
console.log(`${(typeof context.character.name)}`);
// These are already strings
console.log(`${context.character.personality}`);
console.log(`${context.character.scenario}`);

/*
These appear as options via context menu, but I've not yet figured them out:
add personality trait
add scenario detail
emotion detection
error handling
greeting detection
keyword lorebook
memory system
relationship stages
time awareness

*/