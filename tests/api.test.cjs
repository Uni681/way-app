const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function load(file, mocks = {}, env = {}) {
  const exports = {}
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  }}).outputText
  vm.runInNewContext(js, { exports, require: id => {
    if (!(id in mocks)) throw new Error(`Unexpected dependency ${id}`)
    return mocks[id]
  }, Response, Request, URL, Headers, process: { env } }, { filename: file })
  return exports
}
const validation = load('lib/api-validation.ts')
const uid='00000000-0000-0000-0000-000000000001', mid='00000000-0000-0000-0000-000000000002'
function client(results, calls=[]) {
  return { from(table) {
    const query = { table, filters: [] }; calls.push(query)
    const chain={}
    for (const key of ['select','eq','in','update','upsert']) chain[key]=(...args)=>{
      query.filters.push([key,...args]); return chain
    }
    chain.maybeSingle=async()=>results[table]
    chain.then=(resolve,reject)=>Promise.resolve(results[table]).then(resolve,reject)
    return chain
  }}
}
function fixture(options={}) {
  const reads=[], writes=[], ai=[]
  const message={id:mid,chat_id:mid,sender_id:uid,content:'stored text',is_deleted:false,ban_check_status:'pending',...options.message}
  const db=client({messages: {data: options.missing ? null : message,error:options.readError},
    chats:{data:options.noChat ? null : {user1_id:uid,user2_id:mid,...options.chat},error:null}},reads)
  const admin=client({messages:{data:options.conflict ? null : {id:mid},error:options.writeError}},writes)
  admin.rpc = async (name, args) => {
    if (name === 'claim_moderation') return { data: options.noClaim ? [] : [{message_id:mid,content:message.content,lease_token:'lease'}], error:options.claimError }
    writes.push({name,args})
    return {data:!options.conflict,error:options.writeError}
  }
  const providerMocks = {
    '@supabase/supabase-js':{createClient:()=>admin},
    '@anthropic-ai/sdk':class { messages={create:async args=>{
      ai.push(args); if(options.timeout) throw {name:'APIConnectionTimeoutError'}; if(options.aiError) throw new Error('private provider detail')
      return {content:options.empty ? [] : [{type:'text',text:options.verdict ?? 'SAFE'}]}
    }}},
  }
  const route=load('app/api/moderate/route.ts', {
    '@/lib/api-auth':{authenticate:async()=>options.unauthorized ? null : {user:{id:uid},supabase:db}},
    '@/lib/api-validation':validation,
    '@/lib/moderation':load('lib/moderation.ts', providerMocks),
  })
  return {reads,writes,ai, post: body=>route.POST(new Request('https://test/api/moderate',{
    method:'POST',body:typeof body==='string' ? body : JSON.stringify(body ?? {messageId:mid,content:'forged text'}),
  }))}
}
for(const [name,opts,status] of [
  ['unauthenticated',{unauthorized:true},401],['missing message',{missing:true},404],
  ['wrong sender',{message:{sender_id:mid}},404],['no chat',{noChat:true},404],
  ['nonparticipant',{chat:{user1_id:mid,user2_id:mid}},404],
  ['already deleted',{message:{is_deleted:true}},409],['already passed',{message:{ban_check_status:'passed'}},409],
  ['oversized text',{message:{content:'x'.repeat(4001)}},422],['database read failure',{readError:{}},503],
]) test(`moderate rejects ${name} before AI and admin writes`,async()=>{
  const f=fixture(opts);assert.equal((await f.post()).status,status);assert.equal(f.ai.length,0);assert.equal(f.writes.length,0)
})
for(const body of ['{', 'null', '{}', '{"messageId":{}}', '{"messageId":"x),id.neq.y"}']) {
 test(`moderate rejects invalid body ${body}`,async()=>{const f=fixture();assert.equal((await f.post(body)).status,400);assert.equal(f.reads.length,0)})
}
for(const verdict of ['SAFE','FLAGGED']) test(`moderate ${verdict} uses stored text and constrained update`,async()=>{
 const f=fixture({verdict});const res=await f.post();assert.equal(res.status,200)
 assert.equal(f.ai[0].messages[0].content,'stored text')
 assert.equal(f.writes[0].name,'finish_moderation')
 assert.equal(f.writes[0].args.p_message_id,mid)
 assert.equal(f.writes[0].args.p_lease_token,'lease')
 assert.equal(f.writes[0].args.p_verdict,verdict)
 assert.equal((await res.json()).flagged,verdict==='FLAGGED')
})
for(const [opts,status] of [[{verdict:'probably safe'},502],[{empty:true},502],[{aiError:true},503],[{writeError:{}},503],[{conflict:true},409]]) {
 test(`moderate failure ${JSON.stringify(opts)} is not success`,async()=>{const f=fixture(opts);const res=await f.post();assert.equal(res.status,status);assert.ok((await res.json()).error)})
}
test('Bearer authentication verifies token with auth server and applies caller RLS',async()=>{
 let config,token
 const {authenticate}=load('lib/api-auth.ts',{'@supabase/supabase-js':{createClient:(url,key,options)=>{
  config=options;return {auth:{getUser:async t=>{token=t;return {data:{user:{id:uid}},error:null}}}}
 }}})
 assert.equal(await authenticate(new Request('https://test')),null)
 const auth=await authenticate(new Request('https://test',{headers:{Authorization:'Bearer actual-token'}}))
 assert.equal(auth.user.id,uid);assert.equal(token,'actual-token');assert.equal(config.global.headers.Authorization,'Bearer actual-token')
})
test('invalid/expired Bearer token fails closed',async()=>{
 const {authenticate}=load('lib/api-auth.ts',{'@supabase/supabase-js':{createClient:()=>({auth:{getUser:async()=>({data:{user:null},error:{}})}})}})
 assert.equal(await authenticate(new Request('https://test',{headers:{Authorization:'Bearer expired'}})),null)
})
test('push endpoint rejects local hosts, attacker subdomains and credentials',()=>{
 for(const url of ['http://127.0.0.1','https://localhost','https://169.254.169.254','https://fcm.googleapis.com.evil.test/x','https://user@fcm.googleapis.com/x','https://fcm.googleapis.com:8443/x']) assert.equal(validation.isPushEndpoint(url),false)
 assert.equal(validation.isPushEndpoint('https://fcm.googleapis.com/fcm/send/test'),true)
})
for(const [name,body,chat,status] of [
 ['invalid identifier',{chatId:'x),id.neq.y',event:'chat_started'},null,400],
 ['nonparticipant',{chatId:mid,event:'chat_started'},{user1_id:mid,user2_id:mid},403],
 ['valid matching user',{chatId:mid,event:'chat_started',payload:{url:'https://evil.test'}},{user1_id:mid,user2_id:uid},200],
 ['forged mutual stock',{chatId:mid,event:'mutual_stock'},{user1_id:mid,user2_id:uid},403],
]) test(`push send ${name}`,async()=>{
 const sends=[]
 const db=client({chats:{data:chat && {id:mid,status:'freed',...chat}},stocks:{data:[]}})
 const route=load('app/api/push/send/route.ts',{'@/lib/api-auth':{authenticate:async()=>({user:{id:uid},supabase:db})},'@/lib/api-validation':validation,'@/lib/web-push':{sendPushToUser:async(...args)=>sends.push(args)}})
 const res=await route.POST(new Request('https://test',{method:'POST',body:JSON.stringify(body)}))
 assert.equal(res.status,status)
 if(status===200){assert.equal(sends[0][0],mid);assert.equal(sends[0][1].url,`/chat/${mid}`)} else assert.equal(sends.length,0)
})
for (const endpoint of ['https://127.0.0.1/internal','https://fcm.googleapis.com/fcm/send/test']) test(`subscribe ${endpoint}`,async()=>{
 const calls=[]
 const db=client({push_subscriptions:{error:{code:'42501'}}},calls)
 const route=load('app/api/push/subscribe/route.ts',{'@/lib/api-auth':{authenticate:async()=>({user:{id:uid},supabase:db})},'@/lib/api-validation':validation})
 const res=await route.POST(new Request('https://test',{method:'POST',body:JSON.stringify({endpoint,keys:{auth:'x'.repeat(22),p256dh:'y'.repeat(87)}})}))
 assert.equal(res.status,endpoint.includes('127.0.0.1') ? 400 : 409)
 if(calls.length) assert.equal(calls[0].filters[0][1].user_id,uid)
})
for(const path of ['portal','checkout']) test(`Stripe ${path} denies historically forged customer ID`,async()=>{
 let sessions=0
 const route=load(`app/api/stripe/${path}/route.ts`,{
  '@/lib/api-auth':{authenticate:async()=>({user:{id:uid}})},
  '@supabase/supabase-js':{createClient:()=>({from:()=>({select:()=>({eq:()=>({single:async()=>({data:{stripe_customer_id:'cus_other'}})})})})})},
  '@/lib/stripe':{getStripe:()=>({customers:{retrieve:async()=>({metadata:{supabase_user_id:mid}})},billingPortal:{sessions:{create:async()=>{sessions++}}},checkout:{sessions:{create:async()=>{sessions++}}}})},
 })
 const res=await route.POST(new Request('https://test',{method:'POST'}))
 assert.equal(res.status,409);assert.equal(sessions,0)
})
test('timer endpoint rejects missing cron configuration',async()=>{
 let calls=0
 const route=load('app/api/push/timer-check/route.ts',{'@supabase/supabase-js':{createClient:()=>({rpc:async()=>{calls++}})},'@/lib/web-push':{}})
 assert.equal((await route.POST(new Request('https://test',{method:'POST'}))).status,403);assert.equal(calls,0)
})

for(const opts of [{noClaim:true},{claimError:{}}]) test('no AI without successful DB claim '+JSON.stringify(opts),async()=>{
 const f=fixture(opts);assert.equal((await f.post()).status,opts.noClaim?409:503);assert.equal(f.ai.length,0);assert.equal(f.writes.length,0)
})
test('provider failure schedules retry with the same lease, never SAFE',async()=>{
 const f=fixture({aiError:true});await f.post();assert.equal(f.writes[0].args.p_verdict,'ERROR');assert.equal(f.writes[0].args.p_lease_token,'lease')
})
test('scheduled worker authenticates before touching queue',async()=>{
 let calls=0
 const route=load('app/api/moderation/worker/route.ts',{'@/lib/moderation':{processModeration:async()=>{calls++;return new Response(null,{status:409})}}},{CRON_SECRET:'test-secret'})
 assert.equal((await route.POST(new Request('https://test',{method:'POST'}))).status,403);assert.equal(calls,0)
 assert.equal((await route.POST(new Request('https://test',{method:'POST',headers:{'x-cron-secret':'test-secret'},body:JSON.stringify({messageId:'attacker'})}))).status,200);assert.equal(calls,1)
})
test('worker limits batch and surfaces retry outcomes',async()=>{
 let calls=0
 const route=load('app/api/moderation/worker/route.ts',{'@/lib/moderation':{processModeration:async id=>{assert.equal(id,undefined);calls++;return new Response(null,{status:503})}}},{CRON_SECRET:'test-secret'})
 assert.equal((await route.POST(new Request('https://test',{method:'POST',headers:{'x-cron-secret':'test-secret'}}))).status,503);assert.equal(calls,3)
})
test('UI visibility and pending labels fail closed',()=>{
 const {canDisplayMessage,moderationLabel}=load('lib/message-visibility.ts')
 for(const state of ['queued','retry','held','processing']) {
  assert.equal(canDisplayMessage({sender_id:mid,ban_check_status:'pending',is_deleted:false},uid),false)
  assert.ok(moderationLabel(state,'pending').includes('未送信'))
 }
 assert.equal(canDisplayMessage({sender_id:uid,ban_check_status:'pending',is_deleted:false},uid),true)
 assert.equal(canDisplayMessage({sender_id:mid,ban_check_status:'passed',is_deleted:false},uid),true)
 assert.equal(canDisplayMessage({sender_id:uid,ban_check_status:'flagged',is_deleted:true},uid),false)
})

function pushFixture(options={}) {
 const calls={sent:0,reserved:0,finished:[],deleted:[]}
 let occupied=false
 const chain={select:()=>chain,eq:(...args)=>{calls.deleted.push(args);return chain},limit:async()=>({data:[{endpoint:'https://fcm.googleapis.com/fcm/send/test',auth:'a',p256dh:'b'}]}),delete:()=>chain,then:resolve=>resolve({})}
 const api=load('lib/web-push.ts',{
  './api-validation':validation,
  '@supabase/supabase-js':{createClient:()=>({from:()=>chain,rpc:async(name,args)=>{
   if(name==='reserve_push') {
    calls.reserved++;if(options.reserveError) return {error:{}}
    if(occupied) return {data:null}
    occupied=true;return {data:'delivery-id'}
   }
   calls.finished.push(args.p_outcome);return {}
  }})},
  'web-push':{setVapidDetails:()=>{},sendNotification:async()=>{
   calls.sent++;if(options.sendError) throw {statusCode:options.statusCode ?? 503}
  }},
 })
 return {calls,send:()=>api.sendPushToUser(mid,{title:'WAY',body:'fixed',tag:`chat_started-${mid}`},uid)}
}
test('concurrent push requests only reach provider after one durable reservation',async()=>{
 const f=pushFixture();const results=await Promise.all([f.send(),f.send()]);assert.equal(f.calls.sent,1);assert.equal(results.filter(Boolean).length,1)
})
test('push quota/storage failure prevents network calls',async()=>{
 const f=pushFixture({reserveError:true});await assert.rejects(f.send());assert.equal(f.calls.sent,0)
})
test('ambiguous provider failure is recorded, never automatically replayed',async()=>{
 const f=pushFixture({sendError:true});await assert.rejects(f.send());assert.equal(await f.send(),false);assert.equal(f.calls.sent,1);assert.ok(f.calls.finished.includes('failed'))
})
test('only terminal subscription failures remove the matching recipient endpoint',async()=>{
 const f=pushFixture({sendError:true,statusCode:410});await assert.rejects(f.send());assert.ok(f.calls.deleted.some(x=>x[0]==='user_id'&&x[1]===mid));assert.ok(f.calls.deleted.some(x=>x[0]==='endpoint'))
})

test('ambiguous AI timeout is held rather than retried',async()=>{
 const f=fixture({timeout:true});assert.equal((await f.post()).status,503);assert.equal(f.writes[0].args.p_verdict,'HOLD')
})
