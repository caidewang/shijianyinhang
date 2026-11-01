'use strict';
const CACHE='time-bank-offline-v5-mobile';
const ASSETS=['./','./index.html','./app.js','./offline.js','./manifest.json','./icon.svg'];
const isUsable=response=>response.ok&&!response.redirected&&response.type!=='opaque';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 for(const path of ASSETS){const response=await fetch(new Request(new URL(path,self.registration.scope),{cache:'reload',credentials:'same-origin'}));if(!isUsable(response))throw Error('资源不可缓存');if(path==='./'||path==='./index.html'){const html=await response.clone().text();if(!html.includes('id="entryForm"'))throw Error('获取到了登录页，不能离线安装');}await cache.put(path,response);}
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('time-bank-offline-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data?.type==='CHECK_OFFLINE')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const ready=(await Promise.all(ASSETS.map(path=>cache.match(path)))).every(Boolean);event.ports[0]?.postMessage({ready,version:CACHE})})())});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const root=new URL(self.registration.scope);const relative=url.pathname.slice(root.pathname.length);
 // Authentication and non-app routes always reach the server. Only the local app shell is cached.
 if(!['','index.html','app.js','offline.js','manifest.json','icon.svg'].includes(relative))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(event.request,{ignoreSearch:true});return cached||fetch(event.request)})());
});

