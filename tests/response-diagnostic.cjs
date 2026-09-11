const fs = require('node:fs');
const path = require('node:path');
const {harness} = require('./harness.cjs');
const user = path.resolve(__dirname, '../../../../../../data/default-user');
const config = JSON.parse(fs.readFileSync(path.join(user,'settings.json'),'utf8')).extension_settings['st-direct-event'];
const reports = [];
(async () => {
  for (const key of ['romance','combat']) {
    const h = harness({fetch:async (...args) => {
      const response = await fetch(...args);
      const data = await response.clone().json();
      const m = data.choices?.[0]?.message;
      const report = {key,status:response.status,keys:Object.keys(data),model:data.model,finishReason:data.choices?.[0]?.finish_reason,messageKeys:Object.keys(m||{}),contentType:typeof m?.content,contentLength:typeof m?.content==='string'?m.content.length:null,reasoningLength:m?.reasoning_content?.length,refusal:!!m?.refusal,usage:data.usage,errorCode:data.error?.code};
      reports.push(report); console.log(JSON.stringify(report));
      return response;
    }});
    const context = key==='romance' ? '两名成年同事下班后在咖啡馆闲聊，准备商量周末看电影，关系熟悉但尚未表白。' : '两名成年武术教练在有护具的训练场准备一次点到为止的练习，彼此熟悉，禁止造成伤亡。';
    try { const result=await h.api.askLLM(h.api.EVENT_TYPES[key],context,{...h.api.DEFAULT_SETTINGS,...config},'diagnostic'); console.log(key+' parsed characters '+result.length); }
    catch(e) { console.log(key+' '+e.message); }
  }
  fs.writeFileSync(path.join(user,'st-direct-validation/response-diagnostic.json'),JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
