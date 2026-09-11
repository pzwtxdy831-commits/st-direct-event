const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dir = path.resolve(__dirname, '..');
const userDir = path.resolve(dir, '../../../../../data/default-user');
const backup = path.join(userDir, 'st-direct-validation/backup-before-0.4.0');
fs.mkdirSync(backup, {recursive: true});
for (const file of ['index.js','style.css','manifest.json','README.md']) if (!fs.existsSync(path.join(backup,file))) fs.copyFileSync(path.join(dir,file),path.join(backup,file));
let source = fs.readFileSync(path.join(dir,'index.js'),'utf8').replace(/\r\n/g,'\n');
function section(start, end, replacement) {
    const a=source.indexOf(start), b=source.indexOf(end,a);
    if(a<0||b<0) throw Error('Missing boundary: '+start);
    source=source.slice(0,a)+replacement+'\n\n'+source.slice(b);
}
const previousDraft = fs.readFileSync(path.join(dir,'update.cjs'),'utf8');
const start=previousDraft.indexOf('const common ='), end=previousDraft.indexOf("replaceSection('    const DEFAULT_JAILBREAK_PROMPT",start);
const {presets,sub} = vm.runInNewContext(previousDraft.slice(start,end)+';({presets,sub})');
for (const preset of Object.values(presets)) preset.systemPrompt += '\n必须产生能实际演出的具体事件；不能把纸条写成抽象建议。每张非终局纸条只写本轮可观察事实、NPC动机的外在表现和动作留钩；后台真相只写入 event_archive，结局条件只写入 event_endings。纸条不得替玩家决定未来行动。';
section('    const DEFAULT_PRESETS =', '    const THEMES =', '    const DEFAULT_PRESETS = '+JSON.stringify(presets,null,4)+';');
section('    const DEFAULT_SUB_PROMPTS =', '    const SUB_CONFIGS =', '    const DEFAULT_SUB_PROMPTS = '+JSON.stringify(sub,null,4)+';');
source=source.replace("model: '',", "model: 'agy-gemini-3.8-flash-high',");
source=source.replace("theme: 'sakura'", "theme: 'ocean'");
source=source.replace("        const merged = Object.assign({}, DEFAULT_SETTINGS, stored, ls);", "        // 服务器配置升级后丢弃旧缓存，避免浏览器把旧模型与旧提示词覆盖回来。\n        if ((Number(stored.configVersion) || 0) > (Number(ls.configVersion) || 0)) ls = {};\n        const merged = Object.assign({}, DEFAULT_SETTINGS, stored, ls);");
source=source.replace('if (userPrompt && userPrompt.length >= 70)', 'if (userPrompt)');
source=source.replace('if (userPreset && userPreset.systemPrompt && userPreset.systemPrompt.length >= 80)', 'if (userPreset && typeof userPreset.systemPrompt === \'string\' && userPreset.systemPrompt.trim())');
source=source.replace('        const clean = Object.assign({}, DEFAULT_SETTINGS, settings || {});', '        const clean = Object.assign({}, DEFAULT_SETTINGS, settings || {}, {configVersion: 4});');
source=source.replace("            if (typeof window.saveSettingsDebounced === 'function')", "            if (typeof ctx?.saveSettingsDebounced === 'function') ctx.saveSettingsDebounced();\n            else if (typeof window.saveSettingsDebounced === 'function')");
section('    const EventInjectionTool = {', '    function ensureFloatingCapsule()', fs.readFileSync(path.join(__dirname,'new-core.txt'),'utf8'));
section('    function buildTurnGuidance(', '    function buildEventPrompt(', `    function buildTurnGuidance(turns, currentTurn = null, genreKey = '') {
        const n = Math.min(30, Math.max(1, Math.floor(Number(turns) || 2)));
        const genre = {combat: '动作、位置与资源变化', reasoning: '可验证线索、调查反馈与对质', romance: '具体互动、试探回应与关系变化', random: '场景变化、处理选择与局部后果'}[genreKey] || '情境与选择';
        return [\`总计 \${n} 回合，围绕\${genre}推进。\`,
            n === 1 ? '一轮：直接进入可判定的关键时刻；承接已有玩家行动，处理局面并保留尚未作出的选择。不得同时要求本轮永不结案。'
            : n === 2 ? '两轮：首轮呈现具体触因、必要信息与动作留钩；第二轮根据玩家真实回应处理结果。'
            : n === 3 ? '三轮：触因与选择、反馈与变局、结果与余波。'
            : '多轮：每轮提供新信息或实际局势变化，按玩家行动条件推进，不反复用同一悬念拖延。',
            currentTurn == null ? '' : \`当前第 \${currentTurn}/\${n} 回合。\`,
            '一回合指一次主模型有效叙事回复。编号只是启动信号，不代表玩家已作出任何行动。非终局严禁结束事件与揭示暗箱，终局不再重复中盘留钩命令。'
        ].filter(Boolean).join('\\n');
    }

    function buildDynamicSlipStructure(chosenTurns, genreKey) {
        const n = Math.min(30, Math.max(1, Math.floor(Number(chosenTurns) || 2)));
        const slips = Array.from({length:n}, (_,i) => {
            const round = i + 1;
            const instruction = round === n
                ? '按已知事实与玩家实际回应处理结果，不虚构玩家动作。这里只写终局如何演出，完整答案和分支判据仍放在后台档案与结局区。'
                : '只写当前轮可以看到、听到或通过明确行动获取的信息。具体描写现场变化、NPC动作或证词，最后留下玩家可以回应的动作钩子；不能写后续轮次、真正答案、隐藏动机与胜负结局。';
            return \`<segment_\${round} title="第 \${round} 轮小纸条">\\n\${instruction}\\n</segment_\${round}>\`;
        });
        return [
            \`仅生成 \${n} 张连续编号的小纸条，不得生成多余阶段或空白占位。每张约100～220字，后台约150～300字，按复杂度适度调整。\`,
            '输出严格采用以下XML分区，分区之外不输出解释、代码围栏或其他文字。保留这些必要标签。',
            '<event_archive>固定真相、人物动机与因果链。推理须写清手法、时间线、关键证据与可验证反证；战斗须写目标、能力边界和可观察破绽；恋爱须写既有关系、顾虑和回应条件。暗箱内容不得复制进非终局纸条。</event_archive>',
            ...slips,
            '<event_endings>Good End：写明确可判断的成功或部分成功条件与结果。Bad End：写受阻、退出或失败条件及相称代价；允许中性结果。拒绝恋爱不等于失败，检定失败不等于必死。</event_endings>',
            '不要为了制造悬念把玩家已知事实也藏进暗箱；每张纸条必须包含足够的公开信息使玩家能够行动。未来纸条以条件句兼容不同玩家回应，不能预写玩家必然成功或失败。'
        ].join('\\n\\n');
    }`);
source=source.replace('不要输出任何解释、前后缀或元标签，只输出事件框架正文。', '保留规定的XML结构标签，不输出解释、客套话或代码围栏。');
source=source.replace('            goodEnd: parsed.goodEnd,\n            badEnd: parsed.badEnd,', '            goodEnd: parsed.goodEnd,\n            badEnd: parsed.badEnd,\n            endings: parsed.endings,');
section('        // 设置为当前激活事件状态', '        await saveChatState();\n        console.log', '        // 先保存档案；只有发送校验通过或用户明确启用后才激活。');
section('        // 自动弹出分轮剧本弹窗', '        return event;\n    }\n\n    function getNextEventId', '        // 生成后保持详情关闭，只有用户点击查看剧本才显示后台内容。');
source=source.replace(/\.replace\(/, '.replace('); // Preserve original encoding and line endings consistently.
source=source.replace("            // 去掉历史指令注入残留", "            // 先删除整个导演区块，不能只剥标签留下机密正文。\n            .replace(DIRECTOR_BLOCK, '')\n            .replace(/<(event_archive|event_endings|segment_\\d+)\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>/gi, '')\n            .replace(/<(thinking|reasoning)\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>/gi, '')\n            // 去掉历史指令注入残留");
source=source.replace('m.extra?.is_event || m.extra?.display_text ||', 'm.extra?.is_event ||');
section('        if (eventTypes.GENERATION_ENDED) {', '\n        stEventsBound = true;', `        if (eventTypes.GENERATION_STARTED) eventSource.on(eventTypes.GENERATION_STARTED, onGenerationStarted);
        if (eventTypes.GENERATION_STOPPED) eventSource.on(eventTypes.GENERATION_STOPPED, () => { if (generationRun) generationRun.stopped = true; });
        if (eventTypes.MESSAGE_DELETED) eventSource.on(eventTypes.MESSAGE_DELETED, () => {
            const active = getChatState().activeEvent;
            if (!active?.activationToken || active.manuallyStopped) return;
            const chat = getCtx()?.chat || [];
            const completed = chat.map((m,i) => ({mark:m.extra?.st_direct,index:i})).filter(x => x.mark?.eventId === active.id && x.mark.activationToken === active.activationToken);
            active.currentTurn = completed.length ? Math.max(...completed.map(x => x.mark.round)) + 1 : 1;
            active.isActive = active.currentTurn <= active.maxTurns;
            active.lastCountedMessageId = completed.at(-1)?.index ?? null;
            active.lastCountedUserMessageId = null;
            generationRun = null;
            if (active.isActive) EventInjectionTool.inject(active, active.currentTurn); else unregisterInjection();
            void saveChatState();
            updateFloatingCapsule();
        });
        const chatChanged = () => {
            runtimeEvent = null;
            generationRun = null;
            pendingHiddenEvent = null;
            activeInjectedEvent = null;
            lastInjectionDiagnostic = null;
            unregisterInjection();
            const active = resolveActiveEvent();
            if (active) EventInjectionTool.inject(active, active.currentTurn);
            updateFloatingCapsule();
        };
        if (eventTypes.CHAT_CHANGED) eventSource.on(eventTypes.CHAT_CHANGED, chatChanged);
        if (eventTypes.CHAT_LOADED && eventTypes.CHAT_LOADED !== eventTypes.CHAT_CHANGED) eventSource.on(eventTypes.CHAT_LOADED, chatChanged);
`);
source=source.replace("        registerSlashCommands();\n\n        // 标记", "        registerSlashCommands();\n        if (getCtx()?.isGenerating?.()) throw new Error('主模型正在回复，请等回复结束后发送事件');\n        const previousActive = getChatState().activeEvent;\n        activateEvent(event, true);\n\n        // 标记");
const a = source.indexOf('    async function sendEventTrigger(');
const ca=source.indexOf('        } catch (err) {',a);
const ce=source.indexOf('\n    // ========== 工具',ca);
source=source.slice(0,ca)+`        } catch (err) {
            pendingHiddenEvent = null;
            activeInjectedEvent = null;
            getChatState().activeEvent = previousActive;
            runtimeEvent = null;
            if (previousActive?.isActive) EventInjectionTool.inject(previousActive, previousActive.currentTurn); else unregisterInjection();
            throw err;
        }
    }
`+source.slice(ce);
// Reuse the same validated activation path for event list and manual activation.
section('    async function setActiveEventById(', '    async function stopActiveEvent()', `    async function setActiveEventById(eventId) {
        const event = getChatState().events.find(x => x.id === eventId);
        const active = activateEvent(event, true);
        EventInjectionTool.inject(active, active.currentTurn);
        await saveChatState();
        updateFloatingCapsule();
        renderEventList();
    }`);
source=source.replace('        state.activeEvent.isActive = false;\n        unregisterInjection();', '        state.activeEvent.isActive = false;\n        state.activeEvent.manuallyStopped = true;\n        generationRun = null;\n        runtimeEvent = null;\n        unregisterInjection();');
source=source.replace('<span class="se-capsule-stage">阶段 ${info.stageNumber}/5: ${escapeHtml(info.stageTitle)}</span>', '<span class="se-capsule-stage">${info.isFinalStage ? \'本轮收束\' : \'等待行动\'}</span>');
source=source.replaceAll('提前定情','提前收束').replaceAll('终局收束与定情表态','终局收束与回应').replaceAll('五阶段','分轮');
source=source.replace('            <div class="se-fab" data-action="toggle"', '            <div class="se-fab" data-action="toggle" role="button" tabindex="0" aria-label="打开剧情导演"');
source=source.replace("        root.addEventListener('click', onRootClick);", "        root.addEventListener('click', onRootClick);\n        root.addEventListener('keydown', e => { if (e.target.matches('.se-fab') && ['Enter', ' '].includes(e.key)) { e.preventDefault(); togglePanel(); } });");
source=source.replaceAll('v0.3.0','v0.4.0');
fs.writeFileSync(path.join(dir,'index.js'),source);
fs.writeFileSync(path.join(__dirname,'new-presets.json'),JSON.stringify({presets,subPrompts:sub},null,2));
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));manifest.version='0.4.0';fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Updated core and event presets; bypass prompts preserved. Backup: '+backup);
