# JanitorAI Script Templates

A collection of Script templates for JanitorAI's enhanced lorebook system. Each template addresses a different use case. Pick the one that fits your scenario, or combine ideas from several.

## Templates

### [Complex Lorebook](Complex_Lorebook_Template.js) | [README](Complex_Lorebook_Template_README.md)

Full-featured dynamic lorebook with cascading activation, timeline events, stat-based reactions, priority ordering, and smart filtering. Best for worldbuilding-heavy scenarios with many lore entries that need to interact with each other.

### [Adaptive Lorebook](Adaptive_Lorebook_Template.js) | [README](Adaptive_Lorebook_Template_README.md)

Token-aware lorebook that automatically scales detail between full, summary, and bullet versions based on mention frequency and token budget. Best for scenarios with lots of lore entries where context window space is the primary concern.

### [Progressive Sentence](Progressive_Sentence_Lorebook_Template.js) | [README](Progressive_Sentence_Lorebook_Template_README.md)

Sentence-level context builder with priority tiers, configurable history scope per subject, and round-robin allocation within tier budgets. Best when you need fine-grained control over exactly which sentences appear and in what order.

### [TimeDelay Script](TimeDelay_Script_Template.js) | [README](TimeDelay_Script_Template_README.md)

Progressive disclosure through message count thresholds, hour-based timeline progression, canon count tracking, hidden clue embedding, and conditional story branching. Best for investigation scenarios with time-based pacing.

### [Persistent Flags](Persistent_Flags_Lorebook_Template.js) | [README](Persistent_Flags_Lorebook_Template_README.md)

Hex-based flag string system for tracking discrete story states across sessions. Includes anti-cheat validation, save system support for cross-character continuity, and dynamic instruction generation. Best for scenarios that need state tracking without continuous numerical values.

### [Anti-Omniscience Investigation](Anti_Omniscience_Investigation_Template.js) | [README](Anti_Omniscience_Investigation_Template_README.md)

Flag-gated content system that prevents LLM omniscience by locking information behind hex flag requirements, injecting explicit anti-omniscience behavioral instructions, and eliminating meta-labels and foreshadowing. Best for mystery and investigation scenarios where spoilers ruin the experience.

### [Multiple Character](Multiple_Character_Template.js)

Drop-in/drop-out character management that dynamically includes or excludes character context based on who is mentioned in recent messages. Best for group scenarios with several characters who take turns being active.

## Reference

- **PropertyExploration.js** -- Utility script that logs available properties on the `context` object. Useful for debugging and discovering what the Scripts API exposes.

## Copy Directly on JanitorAI

All templates are available on my JanitorAI profile, ready to copy into your own Scripts:
[https://janitorai.com/profiles/0f618e4a-4d83-49da-969b-aba188761259_profile-of-tydorius](https://janitorai.com/profiles/0f618e4a-4d83-49da-969b-aba188761259_profile-of-tydorius)

## Support

If these templates are useful to you, consider buying me a coffee:
[https://ko-fi.com/tydorius](https://ko-fi.com/tydorius)
