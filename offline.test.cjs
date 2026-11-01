const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('new worker offers explicit page refresh without touching account storage',async()=>{
 const handlers={};let reloaded=false;
 const status={textContent:''},button={textContent:'',disabled:false,addEventListener:(k,f)=>handlers.click=f};
 const worker={postMessage:(message,ports)=>queueMicrotask(()=>ports[0].target.onmessage({data:{ready:true,version:'time-bank-offline-v4-mobile'}}))};
 const reg={active:worker,update:async()=>{}};
 const sw={getRegistration:async()=>reg,register:async()=>reg,addEventListener:(k,f)=>handlers[k]=f};
 const c={document:{getElementById:id=>id==='offlineStatus'?status:button,documentElement:{dataset:{appVersion:'time-bank-offline-v3-manual'}}},navigator:{serviceWorker:sw},window:{isSecureContext:true,location:{reload:()=>{reloaded=true}}},MessageChannel:class{constructor(){this.port1={close(){}};this.port2={target:this.port1,close(){}}}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},Promise};
 vm.runInNewContext(fs.readFileSync(__dirname+'/offline.js','utf8'),c);await new Promise(r=>setImmediate(r));
 assert.match(button.textContent,/刷新/);assert.equal(reloaded,false);await handlers.click();assert.equal(reloaded,true);
});
