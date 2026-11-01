'use strict';
(()=>{
 const status=document.getElementById('offlineStatus'),button=document.getElementById('prepareOffline');
 const pageVersion=document.documentElement.dataset.appVersion||'time-bank-offline-v3-manual';
 let refreshPending=false;
 const versionNumber=value=>Number(/offline-v(\d+)/.exec(value||'')?.[1]||0);
 const check=registration=>new Promise(resolve=>{
  const worker=registration.active;if(!worker)return resolve({ready:false});
  const channel=new MessageChannel();
  const finish=result=>{clearTimeout(timer);channel.port1.close();resolve(result)};
  const timer=setTimeout(()=>finish({ready:false}),5000);
  channel.port1.onmessage=e=>finish({ready:e.data?.ready===true,version:e.data?.version});
  worker.postMessage({type:'CHECK_OFFLINE'},[channel.port2]);
 });
 const display=result=>{
  refreshPending=result.ready&&versionNumber(result.version)>versionNumber(pageVersion);
  if(refreshPending){status.textContent='新版已准备好。刷新可显示新页面；尚未提交的输入不会保存，已入账记录会保留。';button.textContent='刷新到最新版本';return}
  const ready=result.ready&&result.version===pageVersion;
  status.textContent=ready?'✓ 离线已就绪。首次配置后，请用飞行模式验证记账和重新打开。':'请联网检查更新并准备离线资源。';
  button.textContent='检查更新并准备离线';
 };
 async function configure(){
  if(refreshPending){window.location.reload();return}
  button.disabled=true;status.textContent='正在检查更新，请保持联网…';
  try{
   if(!('serviceWorker' in navigator)||!window.isSecureContext)throw Error('请使用 Safari 打开正式网站');
   const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});await registration.update();
   const installing=registration.installing;
   if(installing&&installing.state!=='activated')await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{installing.removeEventListener('statechange',changed);reject(Error('更新尚未完成，请稍后重试'))},30000);
    function changed(){if(installing.state==='activated'||installing.state==='redundant'){clearTimeout(timer);installing.removeEventListener('statechange',changed);installing.state==='activated'?resolve():reject(Error('更新失败，请重试'))}}
    installing.addEventListener('statechange',changed);changed();
   });
   display(await check(registration));
  }catch(error){status.textContent='未完成：'+error.message+'。暂勿依赖离线使用。'}finally{button.disabled=false}
 }
 button.addEventListener('click',configure);
 if('serviceWorker' in navigator){
  const inspect=()=>navigator.serviceWorker.getRegistration('./').then(async r=>{if(r)display(await check(r))}).catch(()=>{});
  navigator.serviceWorker.addEventListener('controllerchange',inspect);inspect();
 }
})();
