'use strict';
(()=>{
 const status=document.getElementById('offlineStatus'),button=document.getElementById('prepareOffline');
 const check=registration=>new Promise(resolve=>{const worker=registration.active;if(!worker)return resolve(false);const channel=new MessageChannel();const timer=setTimeout(()=>resolve(false),5000);channel.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data?.ready===true)};worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2])});
 const display=ready=>{status.textContent=ready?'✓ 离线资源已准备完成。请从桌面图标进入，再用飞行模式验证。':'离线尚未准备完成，请联网后点击配置。';button.textContent=ready?'重新检查离线配置':'准备离线使用'};
 async function configure(){button.disabled=true;status.textContent='正在检查并保存离线资源，请保持联网…';try{
 if(!('serviceWorker' in navigator)||!window.isSecureContext)throw Error('当前打开方式不支持离线功能，请使用 Safari 打开正式网站');
 const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});await registration.update();
 let ready=await check(registration);if(!ready){ready=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('离线配置未完成，请确认网络正常后重试')),25000);const poll=setInterval(async()=>{if(await check(registration)){clearInterval(poll);clearTimeout(timer);resolve(true)}},750);setTimeout(()=>clearInterval(poll),26000)})}
 display(ready);
 }catch(error){status.textContent='配置未完成：'+error.message+'。请勿依赖离线使用。'}finally{button.disabled=false}}
 button.addEventListener('click',configure);
 if('serviceWorker' in navigator)navigator.serviceWorker.getRegistration('./').then(async r=>{if(r)display(await check(r))}).catch(()=>{});
})();
