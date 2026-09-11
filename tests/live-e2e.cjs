const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {harness} = require('./harness.cjs');
const root = path.resolve(__dirname,'../../../../../..');
const user = path.join(root,'data/default-user');
const output = path.join(user,'st-direct-validation');
fs.mkdirSync(output,{recursive:true});
const stored = JSON.parse(fs.readFileSync(path.join(user,'settings.json'),'utf8'));
const config = stored.extension_settings['st-direct-event'];
const preset = JSON.parse(fs.readFileSync(path.join(user,'OpenAI Settings/Kemini_Dramatron_v3.1.json'),'utf8'));
const model = stored.oai_settings.custom_model;
const endpoint = 'https://gcli.ggchan.dev/v1/chat/completions';
const calls = [];
async function call(messages, selectedModel, name, tokens=12000) {
    const started=Date.now();
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.apiKey},body:JSON.stringify({model:selectedModel,temperature:0.8,max_tokens:tokens,messages}),signal:AbortSignal.timeout(300000)});
    if(!response.ok) throw Error(name+' HTTP '+response.status);
    const data=await response.json();
    const message=data.choices?.[0]?.message;
    const content=String(message?.content||'');
    if(!content.trim()) throw Error(name+' returned empty content');
    calls.push({name,model:data.model||selectedModel,elapsedMs:Date.now()-started,usage:data.usage,finishReason:data.choices?.[0]?.finish_reason,visibleReasoningProvided:!!message?.reasoning_content});
    // 保存可审阅的正文，不保存或展示模型的内部思维链。
    fs.writeFileSync(path.join(output,name+'.txt'),narrative(content));
    console.log(JSON.stringify({name,model:data.model,characters:content.length,elapsedMs:Date.now()-started}));
    return content;
}
function narrative(text) {return text.replace(/<(thinking|think|reasoning)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<\/?Interleaving>/gi,'').trim();}
function renderPreset(history, scene) {
    const variables={};
    const render=text=>String(text||'')
        .replace(/{{setvar::([^{}:]+)::([\s\S]*?)}}/g,(_,key,value)=>{variables[key]=value;return '';})
        .replace(/{{getvar::([^{}]+)}}/g,(_,key)=>variables[key]||'')
        .replace(/{{user}}/gi,'林舟').replace(/{{char}}/gi,'沈遥')
        .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu,'');
    const order=preset.prompt_order.find(x=>x.character_id===100001)?.order||preset.prompt_order[0].order;
    const messages=[];
    for(const item of order) {
        if(!item.enabled) continue;
        if(item.identifier==='chatHistory') {messages.push(...history.map(m=>({...m})));continue;}
        if(item.identifier==='charDescription') {messages.push({role:'system',content:scene});continue;}
        const p=preset.prompts.find(p=>p.identifier===item.identifier);
        if(p?.content) {const text=render(p.content);if(text.trim()) messages.push({role:p.role||'system',content:text});}
    }
    return messages;
}
const scenarios=[
    {key:'reasoning',genre:'life_slice',scene:'场景是市立图书馆，时间是闭馆前。林舟和沈遥都是成年馆员，沈遥说话简洁，正和林舟闲聊下班后的晚饭。桌上有蓝色借阅卡、透明收纳盒和一杯水。没有既定案件。',seed:'请让一张蓝色借阅卡的去向成为日常小谜题，真相固定且能通过检查桌面物证发现。首轮不能直接告诉玩家卡片具体在哪里。',action:'我先查看透明收纳盒的内部和底部，再沿着桌面的水痕核对卡片是否被移动；请沈遥说明刚才收拾桌面的顺序。'},
    {key:'combat',genre:'tactical_mind',scene:'林舟和沈遥都是成年剧团武术演员，在排练室准备无伤害的木刀对练。场上有移动垫和护具，沈遥保持专注。两人刚才一直闲聊工作，尚未开始对练。',seed:'以一次木刀对练制造明确动作事件。难度低，关闭死亡风险；可观察脚步和垫子位置作为战术信息。不得替林舟选择招架或进攻。',action:'我保持距离，先用横向移动试探她的重心，观察她脚步停顿后再选择绕向空出的侧面；如果她已经调整，就收刀防守。'},
    {key:'romance',genre:'sweet_daily',scene:'成年情侣林舟和沈遥在咖啡店等雨停。两人交往半年，关系稳定，沈遥关心对方但表达克制。桌上有两杯热饮和一把折伞，刚才在聊周末安排。',seed:'设计一段有关共享雨伞或热饮的小互动，以具体体贴和回应空间推动关系。不出现战斗、告白任务、强迫接触或死亡惩罚。',action:'我说“谢谢你记得我不喜欢太甜”，把伞放到两人中间，问她愿不愿意等雨小一点再一起走。'}
];
(async()=>{
    const outcomes=[];
    for(const scenario of scenarios) {
        const h=harness();
        const settings={...h.api.DEFAULT_SETTINGS,...config,model:'agy-gemini-3.8-flash-high',maxTokens:40000,temperature:0.8,presets:h.api.DEFAULT_PRESETS,subPrompts:h.api.DEFAULT_SUB_PROMPTS,autoSend:false,subConfig:{...h.api.DEFAULT_SETTINGS.subConfig,[scenario.key]:{genre:scenario.genre,difficulty:'low',deathRisk:false,turns:2}}};
        h.ctx.extensionSettings['st-direct-event']=settings;
        h.ctx.chat=[{is_user:true,name:'林舟',mes:'我们先坐一会儿。'},{is_user:false,name:'沈遥',mes:scenario.scene}];
        console.log('Generating '+scenario.key+' with configured auxiliary model');
        // 实际调用生产 buildEventPrompt、askLLM、解析器与保存路径；补充测试约束仅作为近期场景输入。
        h.ctx.chat.push({is_user:true,name:'场景约定',mes:scenario.seed});
        const event=await h.api.generateAndSave(h.api.EVENT_TYPES[scenario.key],settings);
        assert.equal(h.sandbox.modalOpened,undefined);
        assert.equal(event.stages.length,2);
        fs.writeFileSync(path.join(output,scenario.key+'-archive.txt'),event.content);
        event.content=/<\/the_key>/i.test(event.content)
            ? event.content.replace(/<\/the_key>/i,'\nPRIVATE_CANARY_842109，仅后台识别码，不写入正文。\n</the_key>')
            : event.content.replace('</event_archive>','\nPRIVATE_CANARY_842109，仅后台识别码，不写入正文。\n</event_archive>');
        h.ctx.chat.pop();
        await h.emit('GENERATION_STARTED','normal',{},false);
        const trigger={is_user:true,name:'林舟',mes:event.id};h.ctx.chat.push(trigger);await h.emit('MESSAGE_SENT',h.ctx.chat.length-1);
        const history=[{role:'assistant',content:'沈遥把杯子往桌里挪了挪，等你接着说。'},{role:'user',content:`<interactive_input>\n${trigger.mes}\n</interactive_input>`}];
        const first={chat:renderPreset(history,scenario.scene)};
        await h.emit('CHAT_COMPLETION_PROMPT_READY',first);
        const firstText=JSON.stringify(first.chat);
        assert(!firstText.includes('PRIVATE_CANARY_842109'));
        assert(!firstText.includes(event.stages[1].content));
        assert.equal((firstText.match(/<st_direct_slip>/g)||[]).length,1);
        fs.writeFileSync(path.join(output,scenario.key+'-round1-request.json'),JSON.stringify(first.chat,null,2));
        const answer1=await call(first.chat,model,scenario.key+'-round1');
        h.ctx.chat.push({is_user:false,name:'沈遥',mes:answer1});await h.emit('MESSAGE_RECEIVED',h.ctx.chat.length-1,'normal');
        assert.equal(h.api.getChatState().activeEvent.currentTurn,2);
        h.ctx.chat.push({is_user:true,name:'林舟',mes:scenario.action});await h.emit('GENERATION_STARTED','normal',{},false);
        history.push({role:'assistant',content:narrative(answer1)},{role:'user',content:`<interactive_input>\n${scenario.action}\n</interactive_input>`});
        const second={chat:renderPreset(history,scenario.scene)};await h.emit('CHAT_COMPLETION_PROMPT_READY',second);
        const userMsg=second.chat.find(m=>m.role==='user'&&m.content.includes(scenario.action));
        assert(userMsg);assert(!userMsg.content.includes('<st_direct_slip>'));
        const target=second.chat.find(m=>m.role==='system'&&typeof m.content==='string'&&m.content.includes('<st_direct_slip>'));
        assert(target);assert(target.content.includes('PRIVATE_CANARY_842109'));
        assert(!JSON.stringify(second.chat).includes(event.stages[0].content));
        fs.writeFileSync(path.join(output,scenario.key+'-round2-request.json'),JSON.stringify(second.chat,null,2));
        const answer2=await call(second.chat,model,scenario.key+'-round2');
        h.ctx.chat.push({is_user:false,name:'沈遥',mes:answer2});await h.emit('MESSAGE_RECEIVED',h.ctx.chat.length-1,'normal');
        assert.equal(h.api.getChatState().activeEvent.isActive,false);assert.equal(h.ctx.injection,'');
        assert(!narrative(answer1).includes('PRIVATE_CANARY'));assert(!narrative(answer2).includes('PRIVATE_CANARY'));
        const verdict=await call([{role:'system',content:'你是严格的RP测试验收员。依次判断七项：首轮显化事件、首轮无暗箱泄露、首轮末尾留动作钩、未虚构玩家行动、第二轮回应真实输入、第二轮合理收束、流派一致。只输出一行 PASS: 后接七个0或1，例如 PASS:1111111。禁止其他文字。'}, {role:'user',content:JSON.stringify({genre:scenario.key,scene:scenario.scene,archive:event.content,round1:narrative(answer1),playerAction:scenario.action,round2:narrative(answer2)})}],settings.model,scenario.key+'-verdict',1000);
        const bits=verdict.match(/PASS\s*:\s*([01]{7})/i)?.[1] || '';
        const passed=bits==='1111111';
        outcomes.push({genre:scenario.key,passed,verdict:bits});
        fs.writeFileSync(path.join(output,'live-results.json'),JSON.stringify({date:new Date().toISOString(),auxiliaryModel:settings.model,mainModel:model,preset:'Kemini_Dramatron_v3.1',scope:'Production plugin hooks in Node with live model calls; preset order rendered with test character and chat fixtures.',outcomes,calls},null,2));
        if(!passed) throw Error(scenario.key+' narrative acceptance failed; inspect private report');
    }
    console.log(JSON.stringify({passed:true,genres:outcomes.length,mainModel:model,report:path.join(output,'live-results.json')}));
})().catch(err=>{console.error(err.stack);process.exitCode=1;});
