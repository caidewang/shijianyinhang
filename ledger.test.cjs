const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/app.js','utf8').split('let state=')[0];
const c=vm.createContext({Date,Set,Error,Number,Math});vm.runInContext(source,c);
const run=s=>vm.runInContext(s,c);
test('manual deposits and withdrawals accumulate on same day',()=>{
 assert.equal(run("ledger([{id:'a',date:'2026-01-01',type:'in',minutes:30,note:''},{id:'b',date:'2026-01-01',type:'out',minutes:12,note:''}]).balance"),18);
});
test('legacy migration preserves capped withdrawals and excess information',()=>{
 assert.equal(run("ledger(validate({version:1,deadline:'20:00',entries:[{date:'2026-01-01',finish:'19:30',deadline:'20:00',note:''},{date:'2026-01-02',finish:'20:40',deadline:'20:00',note:''}]}).entries).balance"),0);
});
test('rejects invalid minutes and overdraft backups',()=>{
 for(const n of [0,-1,1.5,Infinity])assert.throws(()=>run(`validate({version:2,entries:[{id:'a',date:'2026-01-01',type:'in',minutes:${n},note:''}]})`));
 assert.throws(()=>run("validate({version:2,entries:[{id:'a',date:'2026-01-01',type:'out',minutes:1,note:''}]})"));
});

test('migration roundtrip retains balance and original excess',()=>{
 assert.equal(run("validate(validate({version:1,deadline:'20:00',entries:[{date:'2026-01-01',finish:'19:30',deadline:'20:00',note:'old'},{date:'2026-01-02',finish:'20:40',deadline:'20:00',note:''}]})).entries[1].uncovered"),10);
 assert.equal(run("validate({version:2,entries:[{id:'a',date:'2026-01-01',type:'in',minutes:30,note:''},{id:'b',date:'2026-01-01',type:'out',minutes:12,note:''}]}).entries.length"),2);
});
