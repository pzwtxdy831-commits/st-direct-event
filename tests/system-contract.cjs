const {harness}=require('./harness.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const h=harness();
 const xml='<event_outline><the_key>秘密钥匙</the_key><stages><stage index="1"><external_push>灯光熄灭，管理员举起手电。</external_push><action_hook>管理员询问先检查哪一处。</action_hook></stage><stage index="2" is_final="true"><judgment_criteria>找到开关则恢复照明，否则等待维修。</judgment_criteria></stage></stages></event_outline>';
 const parsed=h.api.EventInjectionTool.parse(xml,2);
 assert.equal(parsed.stages.length,2);assert(!parsed.stages[0].content.includes('秘密钥匙'));assert(parsed.endings.includes('开关'));
 assert.throws(()=>h.api.EventInjectionTool.parse(xml.replace('<action_hook>','<missing>'),2));
 assert.equal(h.api.cleanRecentContext('前文'+xml+'后文'),'前文后文');
 const e={id:'推理事件c0001',type:'reasoning',content:xml,maxTurns:2,...parsed};h.api.getChatState().events.push(e);h.api.activateEvent(e);
 const input='  <interactive_input>\n我什么也不说。 $&\n</interactive_input>  ';
 h.ctx.chat=[{is_user:true,mes:'我什么也不说。 $&'}];
 const player={role:'user',content:[{type:'text',text:input},{type:'image_url',image_url:{url:'data:image/png;base64,AA=='}}]};
 const original=JSON.stringify(player);const request={chat:[player,{role:'user',content:'尾部预设'}]};
 await h.emit('CHAT_COMPLETION_PROMPT_READY',request);await h.emit('CHAT_COMPLETION_PROMPT_READY',request);
 assert.equal(JSON.stringify(player),original);assert.equal(request.chat[1].role,'system');assert.equal(request.chat.filter(m=>m.role==='system').length,1);
 const final=h.api.EventInjectionTool.buildSegmentPrompt(e,2,2);assert(!final.includes('3. 【末尾动作留钩'));assert(final.includes('秘密钥匙'));
 const before=fs.readFileSync('C:/SillyTavern-1.18.0/SillyTavern-1.18.0/data/default-user/st-direct-validation/before-system-redesign/index.js','utf8');
 const after=fs.readFileSync(require('node:path').join(__dirname,'../index.js'),'utf8');
 for(const name of ['DEFAULT_JAILBREAK_PROMPT','DEFAULT_NOVEL_BYPASS_PROMPT']) {
   const slice=src=>{const start=src.indexOf('const '+name+' =');const end=src.indexOf('\n    const ',start+1);return src.slice(start,end);};
   assert.equal(slice(after),slice(before),name+' changed');
 }
 console.log('PASS new schema, missing hook rejection, archive cleaning, byte-exact player preservation, system placement, duplicate hook, final closure, unchanged bypass constants');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
