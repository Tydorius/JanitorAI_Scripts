# JanitorAI Script Templates

A collection of Script templates for JanitorAI's enhanced lorebook system. Each template addresses a different use case. Pick the one that fits your scenario, or combine ideas from several.

[Skip to Template List](#Templates)

## Account Status

JanitorAI permanently banned my account with no warning for 'Advertising and Spam' - so unfortunately I will no longer be contributing to the community.

I attempted an appeal and it was dismissed and stonewalled with the following from Theo:

---
Hello,

After reviewing your request, we confirm that your account violated our Terms of Service. You were issued a permanent ban due to the creation of spam content advertising off-site services. The action taken was applied in accordance with our moderation policies and internal guidelines; this decision is final, and the ban will remain in place.

Please note that we are unable to provide additional details regarding the specific evidence or internal review process. We will not respond to further appeals or messages about this matter.

Thank you for your understanding.

Regards,
Janitorai Customer Support

---

The appeal itself is below:

---

I attempted to send this via the web form but it caps at 2,000 characters.

Good morning,

I'm messaging regarding a moderation action on my account. I received a notification of a permanent ban with the following reason:

"Your account has been permanently suspended due to advertising or spam. You can find more information here: https://help.janitorai.com/en/article/advertising-and-spam-cp37m3/?bust=1770750279733 JanitorAI Moderation Team"

I reviewed the terms of service, community guidelines, and content guidelines before I began posting links to my GitHub and the various things I've created for use with JanitorAI. At the end of this message is all of the information I identified pertaining to advertising/spam. If I have missed something, please let me know, but so far as I can tell I have not violated policies.

If mentioning that my latest tool can work with other platforms was classified as advertising/spam (Note that I did not say 'this site is better' or 'go use this instead') then I am happy to edit my post. But I was very specific in mentioning it in passing and not directing traffic to other options.

Regarding the content I did identify in the TOS, Community Guidelines, and Content Guidelines:

1. I have not advertised for other platforms or competing products.
2. The links in my account are to other locations that I can be found, primarily GitHub which contains copies of my Scripts from Janitor.
3. The plugins I've authored are all open source, and I am very clear in reminding everyone to review anything before they install it. They are designed solely to work with JanitorAI.
4. My most recent post was regarding a self-hosted tool that is the equivalent of having Open WebUI as an intermediary for one's LLM access. It is not a competing product or replacement, and there is no financial incentive.

My account has never advertised for competitors or any type of product. I've mentioned other locations that I can be found in the past, which is already approved by the moderation team and there are thousands of creators that do the same thing.

All of my content is JanitorAI focused, and I even maintain a GitHub repo with all of my Scripts so that users can pull all templates at once, report issues, or take any other action they wish.

My most recent project is a self-hosted tool that sits between JanitorAI and destination LLMs allowing users to run verification, attach their own lorebooks, or otherwise have more control over their environment. It is essentially a self-hosted alternative to platforms like LoreBary, which are also already approved and there are thousands of character pages and creators that promote the use of LoreBary.

If you can identify the problematic content I am happy to modify as needed.

Thank you for your time.

-Tydorius

Everything I located regarding spam/advertising:

From the TOS:

```
6. Prohibited Content and Conduct

You agree not to submit, post, or transmit any content that:

(...)

(l) Contains spam, malware, or deceptive content;
```

From the Community Guidelines:

```
Advertising and spam. Using JanitorAI to advertise products or services, or posting spam content, is prohibited. This includes purposefully steering users to competing platforms. Simple links indicating presence on other sites (e.g., "you can also find me here") are permitted.
```

From the Content Guidelines:

```
Advertising And Spam

External Links

Users may include external links in their profile or character bio, provided the linked content or spaces do not violate platform policies. Any link directing to illegal material, prohibited sexual content or other policy-violating content or space is strictly forbidden and may result in account restrictions.

Links to externally hosted NSFW imagery are permitted only when the content depicts fictional characters who are clearly and unmistakably adults and does not involve illegal or prohibited themes (including but not limited to bestiality, necrophilia, or minor-coded content). Links to real-life pornography are not permitted under any circumstances, regardless of the source platform.
Any link leading to content that violates our platform guidelines, will be met with account restrictions.

Promotion of Competitors or Third-Party Products

Users may include links to other platforms or websites for informational or social purposes, such as "You can also find me here," provided the intent is not to redirect traffic away from the platform. Actively encouraging users to leave the platform for a competitor, or promoting competing services in a comparative or persuasive manner (e.g., "This site is better," "Go use this instead"), is not permitted.

Commercial advertising is prohibited. Companies or individuals may not use the platform to market, promote, or advertise products, services, subscription platforms, or external businesses.

Financial Solicitation Outside Permitted Guidelines

Direct financial solicitation is not allowed. Content that pressures, demands, or emotionally manipulates users for money or donations for personal causes is prohibited. This includes presenting emergencies, personal hardships, or urgent appeals in a manner intended to extract funds from other users.

However, neutral and informational references to commissions, tips, or voluntary support are permitted within profiles or character bios ("Commissions are open," "You can tip here"). These references must remain optional, non-coercive, and non-manipulative.
```

---

In spite of the fact that:
* I had no strikes on my account
* My account's purpose has been the improvement of the JanitorAI community
* The Terms of Service, Community Guidelines, and Content Guidelines support my work
* I made it clear that I attempted to adhere to the rules and made a good faith offer to adjust my content accordingly

I have been banned with no opportunity for remediation or appeal, and the moderation team has refused to provide additional clarification. Either they did not read the content, did not read the appeal, or simply do not care.

I will leave this repo in place for those who are using it. However, keep in mind that the moderation team may apply "moderation policies and internal guidelines" that conflict with their terms of service without warning.

## Templates

### [Complex Lorebook](Complex_Lorebook_Template.js) | [README](Complex_Lorebook_Template_README.md) | [JanitorAI Link](https://janitorai.com/characters/addf68e5-4809-4c15-b81e-06e5cbc9ac93_character-complex-lorebook-template)

Full-featured dynamic lorebook with cascading activation, timeline events, stat-based reactions, priority ordering, and smart filtering. Best for worldbuilding-heavy scenarios with many lore entries that need to interact with each other.

### [Adaptive Lorebook](Adaptive_Lorebook_Template.js) | [README](Adaptive_Lorebook_Template_README.md)| [JanitorAI Link](https://janitorai.com/characters/1411c045-6bc2-434e-b8f6-42998e8c74fc_character-token-count-conscious-lorebook-template)

Token-aware lorebook that automatically scales detail between full, summary, and bullet versions based on mention frequency and token budget. Best for scenarios with lots of lore entries where context window space is the primary concern.

### [Progressive Sentence](Progressive_Sentence_Lorebook_Template.js) | [README](Progressive_Sentence_Lorebook_Template_README.md)| [JanitorAI Link](https://janitorai.com/characters/97aeaa58-0a42-49ce-94e9-fd1df396ff18_character-token-count-aware-variant-lorebook-template)

Sentence-level context builder with priority tiers, configurable history scope per subject, and round-robin allocation within tier budgets. Best when you need fine-grained control over exactly which sentences appear and in what order.

### [TimeDelay Script](TimeDelay_Script_Template.js) | [README](TimeDelay_Script_Template_README.md)| [JanitorAI Link](https://janitorai.com/characters/6387ad41-7000-4734-bc66-e57abdf41b27_character-time-delay-script-template-investigations-delayed-clues-etc)

Progressive disclosure through message count thresholds, hour-based timeline progression, canon count tracking, hidden clue embedding, and conditional story branching. Best for investigation scenarios with time-based pacing.

### [Persistent Memory Flags](Persistent_Flags_Lorebook_Template.js) | [README](Persistent_Flags_Lorebook_Template_README.md)| [JanitorAI Link](https://janitorai.com/characters/e10c6c40-e665-44fe-99c8-e0f1e98abefb_character-persistent-memory-script-template)

Hex-based flag string system for tracking discrete story states across sessions. Includes anti-cheat validation, save system support for cross-character continuity, and dynamic instruction generation. Best for scenarios that need state tracking without continuous numerical values.

### [Hidden Persistent Memory](Hidden_Persistent_Memory_Template.js) | [README](Hidden_Persistent_Memory_Template_README.md) | [JanitorAI Link](https://janitorai.com/characters/34ce8756-6ab5-4870-9f75-0ae91045041a_character-hidden-persistent-memory-lorebook-template)

Zero-width unicode character encoding for invisible state persistence between Script instances. Tracks weather, location (with scene shift detection), emotional state (16-bit bitmask), inventory (bitfield), schedule/day counter, and character presence. Each component is independently toggleable. Best for scenarios that need persistent state tracking without visible artifacts in the chat.

### [Anti-Omniscience Investigation](Anti_Omniscience_Investigation_Template.js) | [README](Anti_Omniscience_Investigation_Template_README.md)|[ JanitorAI Link](https://janitorai.com/characters/6b680acf-165e-4584-b9be-ce05badcc2ba_character-anti-omniscience-investigation-lorebook-template)

Flag-gated content system that prevents LLM omniscience by locking information behind hex flag requirements, injecting explicit anti-omniscience behavioral instructions, and eliminating meta-labels and foreshadowing. Best for mystery and investigation scenarios where spoilers ruin the experience.

### [Multiple Character](Multiple_Character_Template.js)| [README](Multiple_Character_Template_README.md) | [JanitorAI Link](https://janitorai.com/characters/596dc3a1-6b62-4774-98db-6d3e9c05d7e2_character-multiple-character-drop-in-drop-out-lorebook-template)

Drop-in/drop-out character management that dynamically includes or excludes character context based on who is mentioned in recent messages. Best for group scenarios with several characters who take turns being active.

### [Context Aware Multiple Character](Context_Aware_Multiple_Character_Template.js)| [README](Context_Aware_Multiple_Character_Template_README.md) | [JanitorAI Link](https://janitorai.com/characters/ccff2be4-8cad-4b03-a9de-8ea7d5d58f73_character-context-aware-multiple-character-lorebook-template)

Combines drop-in/drop-out character management with adaptive detail levels. Each character category (personality, appearance, dialog) scales between full, limited, and summary versions based on per-category token budgets. Includes support for progressive sentence categories with round-robin allocation. Best for scenarios with multiple characters where context window space needs careful management.

## [General Debug Reference](PropertyExploration.js) | [README](PropertyExploration_README.md) | [JanitorAI Link](https://janitorai.com/characters/7d0fda82-058a-4dfc-830c-9e8998d633a6_character-general-debug-lorebook-template)

Utility script that logs available properties on the `context` object. Useful for debugging and discovering what the Scripts API exposes.

## Copy Directly on JanitorAI

All templates are available on my JanitorAI profile, ready to copy into your own Scripts.


[@Tydorius](https://janitorai.com/profiles/0f618e4a-4d83-49da-969b-aba188761259_profile-of-tydorius)

## Support

If these templates are useful to you, consider buying me a coffee:
[https://ko-fi.com/tydorius](https://ko-fi.com/tydorius)
