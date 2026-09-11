const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function harness(options = {}) {
    const handlers = new Map();
    const ctx = {chatId: 'test-chat', chatMetadata: {}, chat: [], extensionSettings: {},
        eventTypes: Object.fromEntries(['MESSAGE_SENT','USER_MESSAGE_RENDERED','GENERATION_STARTED','GENERATION_STOPPED','MESSAGE_RECEIVED','GENERATION_ENDED','MESSAGE_DELETED','CHAT_CHANGED','CHAT_LOADED','CHAT_COMPLETION_PROMPT_READY','GENERATE_BEFORE_COMBINE_PROMPTS','GENERATE_AFTER_COMBINE_PROMPTS'].map(x=>[x,x])),
        eventSource: {on(name, fn) {const list=handlers.get(name)||[];list.push(fn);handlers.set(name,list);}},
        setExtensionPrompt(name, content) {ctx.injection=content;}, saveChat: async()=>{}, saveSettingsDebounced() {}, ...options.ctx};
    const no = ()=>null;
    const document = {readyState:'loading',currentScript:{src:'http://localhost:8000/scripts/extensions/third-party/st%20direct/index.js'},addEventListener:no,querySelector:no,getElementById:no};
    const local = new Map();
    const sandbox = {document,window:{},SillyTavern:{getContext:()=>ctx},URL,AbortController,AbortSignal,setTimeout,clearTimeout,setInterval,clearInterval,Event,
        localStorage:{getItem:key=>local.get(key)||null,setItem:(key,value)=>local.set(key,value)}, fetch: options.fetch || fetch,
        console:options.verbose?console:{log:no,warn:no,error:no}, location:{origin:'http://localhost:8000'}};
    sandbox.window=sandbox;
    let source = fs.readFileSync(path.join(__dirname,'../index.js'),'utf8');
    const boundary=source.indexOf('    // ========== 启动 ==========');
    if(boundary<0) throw Error('Missing test boundary');
    source=source.slice(0,boundary)+`
        updateFloatingCapsule = () => {};
        renderEventList = () => {};
        renderApiLogs = () => {};
        openStageModalForEvent = () => { globalThis.modalOpened = true; };
        globalThis.transportTestApi = fetchWithProxyFallback;
        globalThis.testApi = {readCompletionBody, getSettings, getChatState, activateEvent, buildEventPrompt, buildTurnGuidance, buildDynamicSlipStructure, buildRecentContext, cleanRecentContext, generateAndSave, askLLM, findTriggeredEvent, buildActiveStagePrompt, bindSTEvents, EventInjectionTool, refreshWorldInfoCache, buildWorldInfoSystemPrompt, DEFAULT_SETTINGS, DEFAULT_PRESETS, DEFAULT_SUB_PROMPTS, DEFAULT_JAILBREAK_PROMPT, DEFAULT_NOVEL_BYPASS_PROMPT, EVENT_TYPES};
    })();`;
    vm.runInNewContext(source,sandbox,{filename:'index.js'});
    sandbox.testApi.bindSTEvents();
    return {ctx,api:sandbox.testApi,sandbox,local,async emit(name,...args){for(const fn of handlers.get(name)||[]) await fn(...args);}};
}
module.exports={harness};
