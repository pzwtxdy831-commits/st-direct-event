const fs=require('node:fs');
const path=require('node:path');
const file=path.join(__dirname,'../index.js');
let code=fs.readFileSync(file,'utf8');
code=code.replaceAll('configVersion: 6','configVersion: 7').replaceAll(') < 6',') < 7');
code=code.replace('if ((Number(ls.configVersion) || 0) < 7) {\n            ls = {};','if ((Number(ls.configVersion) || 0) < 7) {\n            delete ls.presets;\n            delete ls.subPrompts;');
// 保留用户的密钥、模型与破限文本，仅迁移普通预设。
code=code.replace("if ((Number(stored.configVersion) || 0) > (Number(ls.configVersion) || 0)) ls = {};","if ((Number(stored.configVersion) || 0) > (Number(ls.configVersion) || 0)) { delete ls.presets; delete ls.subPrompts; }");
code=code.replace("        merged.autoSend =", "        merged.configVersion = 7;\n        merged.autoSend =");
code=code.replace("                '3. 【末尾动作留钩", "                final ? '3. 【终局收束】：根据已发生的真实行动裁决；尚未作出的选择保持未定，不得虚构玩家行动以凑结局。' : '3. 【末尾动作留钩");
code=code.replace('推动剧情产生实质物理或心理变局。','推动可观察的现场变化，不得仅用心理描写替代事件。');
const start=code.indexOf('    const DEFAULT_PRESETS =');
const end=code.indexOf('    const THEMES =',start);
let presets=code.slice(start,end).replaceAll('强行将局势拉入对决','依据现场条件提供可应对的冲突').replaceAll('强行制造悬念压迫感','显现可验证的悬念').replaceAll('强行将','合理地将');
const principle='\n因果边界：纸条是环境与NPC的可执行计划，不能推翻已经发生的事实。若玩家已离场、阻止触发条件或明确拒绝，依据现场实际条件取消、改写或收束该动作，禁止传送、复活道具或强制亲密。非终局只写客观推力与动作留钩，不假定回应；终局公正评估真实言行，出人意料的合理解法也可成功，沉默与拒绝本身不等于失败。';
presets=presets.replace(/"systemPrompt": ("(?:[^"\\]|\\.)*")/g,(_,literal)=>'"systemPrompt": '+JSON.stringify(JSON.parse(literal)+principle));
code=code.slice(0,start)+presets+code.slice(end);
const subStart=code.indexOf('    const DEFAULT_SUB_PROMPTS =');
const subEnd=code.indexOf('\n    };',subStart);
// 细分预设保留流派差异，统一客观推力与玩家自主权边界。
const sub=code.slice(subStart,subEnd).replace(/("[a-z_]+\.[a-z_]+"\s*:\s*)("(?:[^"\\]|\\.)*")/g,(_,key,literal)=>key+JSON.stringify(JSON.parse(literal)+principle));
code=code.slice(0,subStart)+sub+code.slice(subEnd);
code=code.replaceAll('剧情导演推演引擎 v0.4.0','场景进度').replaceAll('当前无进行中的事件。点击下方按钮即可生成高浓度大纲并启动剧情推演。','选择一个事件，让场景向前一步。').replaceAll('查看分轮剧本总览','查看剧本').replaceAll('查看生成原文','原始档案');
fs.writeFileSync(file,code);
