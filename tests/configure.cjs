const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../../../../..');
const user=path.join(root,'data/default-user');
const target=path.join(user,'settings.json');
const backup=path.join(user,'st-direct-validation/backup-before-0.4.0/settings.json');
fs.mkdirSync(path.dirname(backup),{recursive:true});
if(!fs.existsSync(backup))fs.copyFileSync(target,backup);
const settings=JSON.parse(fs.readFileSync(target,'utf8'));
const current=settings.extension_settings['st-direct-event'];
if(!current?.apiKey)throw Error('Existing API credential is missing');
const presets=JSON.parse(fs.readFileSync(path.join(__dirname,'new-presets.json'),'utf8'));
settings.extension_settings['st-direct-event']={...current,...presets,baseUrl:'https://gcli.ggchan.dev/v1',model:'agy-gemini-3.8-flash-high',maxTokens:40000,temperature:0.8,theme:'ocean',fabIconUrl:'',configVersion:4};
// Only change the plugin object; leave primary-model settings and bypass presets intact.
const temp=target+'.st-direct.tmp';fs.writeFileSync(temp,JSON.stringify(settings,null,4));fs.renameSync(temp,target);
console.log(JSON.stringify({configured:true,model:settings.extension_settings['st-direct-event'].model,maxTokens:40000,temperature:0.8,theme:'ocean',bypassPreserved:settings.extension_settings['st-direct-event'].jailbreakPrompt===current.jailbreakPrompt&&settings.extension_settings['st-direct-event'].novelBypassPrompt===current.novelBypassPrompt}));
