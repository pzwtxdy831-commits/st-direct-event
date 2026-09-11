const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '../../../../../..');
const user = path.join(base, 'data/default-user');
const settings = JSON.parse(fs.readFileSync(path.join(user, 'settings.json'), 'utf8'));
const preset = JSON.parse(fs.readFileSync(path.join(user, 'OpenAI Settings/Kemini_Dramatron_v3.1.json'), 'utf8'));
const chatPath = path.join(user, 'chats/实教/实教 - 2026-08-27@12h59m23s208ms.jsonl');
const chat = fs.readFileSync(chatPath, 'utf8').trim().split(/\r?\n/).map(x => JSON.parse(x));
const meta = chat[0].chat_metadata || {};
console.log(JSON.stringify({
  base, presetKeys: Object.keys(preset),
  promptEntries: (preset.prompts || []).map(p => ({id: p.identifier, name: String(p.name).replace(/\p{Extended_Pictographic}/gu, ''), enabled: p.enabled, role: p.role, length: p.content?.length, interactive: /interactive_input/.test(p.content || '')})),
  order: preset.prompt_order,
  chat: {messages: chat.length - 1, metadataKeys: Object.keys(meta), state: meta.extensions?.['st-direct-event'] ? {active: meta.extensions['st-direct-event'].activeEvent?.id, currentTurn: meta.extensions['st-direct-event'].activeEvent?.currentTurn, isActive: meta.extensions['st-direct-event'].activeEvent?.isActive, events: meta.extensions['st-direct-event'].events?.length} : null},
  matchingRegex: (settings.extension_settings?.regex || settings.extension_settings?.regex_scripts || []).filter(r => /interactive_input/.test(r.replaceString || '')).map(r => ({name: String(r.scriptName).replace(/\p{Extended_Pictographic}/gu, ''), find: r.findRegex, replace: r.replaceString, disabled: r.disabled, placement: r.placement, promptOnly: r.promptOnly}))
}, null, 2));
