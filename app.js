'use strict';
const KEY='family-time-bank-v1';
const $=id=>document.getElementById(id);
const minute=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
const validTime=t=>typeof t==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function validDate(s){if(typeof s!=='string'||!/^20\d\d-\d\d-\d\d$/.test(s))return false;const d=new Date(s+'T12:00:00');return !isNaN(d)&&`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`===s&&s<=localDate()}
function validate(s){
 if(!s||![1,2].includes(s.version)||!Array.isArray(s.entries)||s.entries.length>10000)throw Error('备份格式不正确');
 if(s.version===1){
  if(!validTime(s.deadline))throw Error('旧备份规则无效');
  const dates=new Set();let balance=0;
  const entries=[...s.entries].sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(e=>{
   if(!e||!validDate(e.date)||!validTime(e.finish)||!validTime(e.deadline)||typeof e.note!=='string'||e.note.length>100||dates.has(e.date))throw Error('旧记录格式错误');
   dates.add(e.date);const diff=minute(e.deadline)-minute(e.finish);const amount=diff>=0?diff:Math.min(balance,-diff);balance+=diff>=0?amount:-amount;
   return {id:'legacy-'+e.date,date:e.date,type:diff>=0?'in':'out',minutes:amount,note:e.note,legacy:true,finish:e.finish,deadline:e.deadline,uncovered:Math.max(0,-diff-amount)};
  });return {version:2,entries};
 }
 const ids=new Set();const entries=s.entries.map(e=>{
  if(!e||typeof e.id!=='string'||!e.id||e.id.length>100||ids.has(e.id)||!validDate(e.date)||!['in','out'].includes(e.type)||!Number.isSafeInteger(e.minutes)||e.minutes<0||e.minutes>1000000||typeof e.note!=='string'||e.note.length>100)throw Error('记录格式错误');
  const legacy=e.legacy===true&&validTime(e.finish)&&validTime(e.deadline)&&Number.isSafeInteger(e.uncovered)&&e.uncovered>=0;
  if(e.minutes===0&&!legacy)throw Error('分钟数必须大于0');ids.add(e.id);
  return {id:e.id,date:e.date,type:e.type,minutes:e.minutes,note:e.note,...(legacy?{legacy:true,finish:e.finish,deadline:e.deadline,uncovered:e.uncovered}:{})};
 });ledger(entries);return {version:2,entries};
}
function ledger(entries){let balance=0,earned=0,spent=0;const rows=[...entries].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>{const deposit=e.type==='in'?e.minutes:0,withdrawal=e.type==='out'?e.minutes:0;balance+=deposit-withdrawal;if(!Number.isSafeInteger(balance)||balance<0)throw Error('该操作会导致某笔记录的余额不足');earned+=deposit;spent+=withdrawal;return {...e,deposit,withdrawal,balance,difference:deposit-withdrawal}});return {balance,earned,spent,rows}}
let state={version:2,entries:[]},filter='all',storageBroken=false;
try{const raw=localStorage.getItem(KEY);if(raw)state=validate(JSON.parse(raw))}catch(e){storageBroken=true;setTimeout(()=>toast('无法读取原有记录。请先导出原始数据，勿继续记账。'),100)}
function persist(next){try{ledger(next.entries)}catch(e){toast(e.message);return false}if(storageBroken){toast('存储读取异常，请先导出原始数据并保留备份。');return false}try{localStorage.setItem(KEY,JSON.stringify(next));state=next;render();return true}catch(e){toast('保存失败，请检查浏览器存储空间。此次记录未入账。');return false}}
let toastTimer;function toast(text){$('toast').textContent=text;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),4500)}
function ask(title,text,action){$('confirmTitle').textContent=title;$('confirmText').textContent=text;$('acceptAction').onclick=()=>{$('confirmDialog').close();action()};$('confirmDialog').showModal()}
$('cancelAction').onclick=()=>$('confirmDialog').close();
function preview(){const n=Number($('minutes').value);$('calculation').textContent=Number.isSafeInteger(n)&&n>0?`本次${$('entryType').value==='in'?'存入 +':'用掉 -'}${n} 分钟。用掉的分钟不能超过当时余额。`:'请输入大于 0 的整数分钟数。'}
function render(){const l=ledger(state.entries);$('balance').textContent=l.balance;$('earned').replaceChildren(document.createTextNode(l.earned));$('spent').replaceChildren(document.createTextNode(l.spent));for(const id of ['earned','spent']){const small=document.createElement('small');small.textContent='分钟';$(id).append(small)}$('balanceHint').textContent=l.balance?'这是认真完成作业，为自己存下的从容。':'从今天开始，存下第一份时间。';$('saveStatus').textContent=storageBroken?'存储读取异常，请先导出原始数据':'✓ 记录保存在当前设备，请定期备份';const rows=l.rows.filter(e=>filter==='all'||(filter==='in'?e.difference>0:e.difference<0)).reverse();$('records').replaceChildren();if(!rows.length){const empty=document.createElement('div');empty.className='empty';const icon=document.createElement('span');icon.textContent='♧';empty.append(icon,document.createTextNode(state.entries.length?'这里还没有此类记录。':'存折还是空白的，记下第一份努力吧。'));$('records').append(empty)}for(const e of rows){const row=document.createElement('div');row.className='row';const badge=document.createElement('div');badge.className='badge';badge.textContent=e.difference>0?'↙':e.difference<0?'↗':'✓';const text=document.createElement('div');text.className='text';const title=document.createElement('b');title.textContent=`${e.date.slice(5).replace('-','月')}日 · ${e.legacy&&e.minutes===0?'旧版记录':e.type==='in'?'存入时间':'用掉时间'}`;const sub=document.createElement('small');sub.textContent=`余额 ${e.balance} 分钟${e.legacy?` · 旧版：${e.finish}完成／基准${e.deadline}`:''}${e.uncovered?` · 原超出额度 ${e.uncovered} 分钟`:''}${e.note?' · '+e.note:''}`;text.append(title,sub);const delta=document.createElement('div');delta.className='change'+(e.difference<0?' minus':'');delta.textContent=e.deposit?'+'+e.deposit:e.withdrawal?'-'+e.withdrawal:'0';const remove=document.createElement('button');remove.type='button';remove.className='remove';remove.textContent='撤销';remove.setAttribute('aria-label',`撤销${e.date}记录`);remove.onclick=()=>ask('撤销这笔记录？','撤销后将重新计算余额。如果会导致后续记录余额不足，将阻止撤销。',()=>{if(persist({...state,entries:state.entries.filter(x=>x.id!==e.id)}))toast('记录已撤销，可重新填写。')});row.append(badge,text,delta,remove);$('records').append(row)}preview()}
$('today').textContent=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date());$('entryDate').value=localDate();$('entryDate').max=localDate();$('minutes').oninput=preview;$('entryType').onchange=preview;$('entryDate').oninput=preview;
$('entryForm').onsubmit=event=>{event.preventDefault();const date=$('entryDate').value,minutes=Number($('minutes').value),type=$('entryType').value;
 if(!validDate(date)||!Number.isSafeInteger(minutes)||minutes<=0||minutes>1000000||!['in','out'].includes(type)){toast('请填写有效日期及 1–1000000 的整数分钟数。');return}
 if(!$('confirmed').checked)return;
 const e={id:crypto.randomUUID(),date,type,minutes,note:$('reason').value.trim()};
 const save=()=>{if(persist({...state,entries:[...state.entries,e]})){$('confirmed').checked=false;$('reason').value='';$('minutes').value='';preview();toast('已记入时间存折 ✧')}};
 if(state.entries.some(x=>x.date>date))ask('补记一笔历史记录？','补记会重新计算后续余额，余额不足时不能保存。',save);else save();};
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));render()});
$('export').onclick=()=>{let contents;if(storageBroken){try{contents=localStorage.getItem(KEY)||'{}'}catch(e){toast('无法访问原始存储。');return}}else contents=JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2);const url=URL.createObjectURL(new Blob([contents],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`时间银行备份-${localDate()}${storageBroken?'-原始数据':''}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);toast('已发起备份下载，请确认文件已保存。')};
$('import').onclick=()=>$('fileInput').click();$('fileInput').onchange=async()=>{const file=$('fileInput').files[0];$('fileInput').value='';if(!file)return;if(file.size>3000000){toast('备份文件过大，请检查是否选择正确。');return}try{const next=validate(JSON.parse(await file.text()));ask('恢复这份备份？',`包含 ${next.entries.length} 笔记录，余额 ${ledger(next.entries).balance} 分钟。恢复会替换当前全部记录，请先导出当前备份。`,()=>{const previousBroken=storageBroken;storageBroken=false;if(persist(next))toast('备份已恢复。');else storageBroken=previousBroken})}catch(e){toast('恢复失败：备份内容无效，当前记录未改变。')}};
window.addEventListener('storage',e=>{if(e.key!==KEY)return;try{state=e.newValue?validate(JSON.parse(e.newValue)):{version:2,entries:[]};render();toast('已更新为同一浏览器另一页面的记录。')}catch(error){toast('另一页面的数据异常，请导出备份检查。')}});render();

