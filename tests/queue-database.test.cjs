const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { PGlite } = require('@electric-sql/pglite')

const a='00000000-0000-0000-0000-000000000001', b='00000000-0000-0000-0000-000000000002', c='00000000-0000-0000-0000-000000000003'
test('full migrations: mandatory moderation, durable quotas and least privilege', async t => {
 const db=new PGlite()
 try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   create schema auth; create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth, public to anon,authenticated,service_role;
   grant execute on function auth.uid() to anon,authenticated,service_role;`)
  await db.exec(fs.readFileSync('supabase/schema.sql','utf8').replace('create extension if not exists "uuid-ossp";',''))
  for(const f of fs.readdirSync('supabase/migrations').filter(f=>/^00[1-8]_/.test(f)&&!f.startsWith('002')))
   await db.exec(fs.readFileSync(`supabase/migrations/${f}`,'utf8'))
  await db.exec('grant all on all tables in schema public to anon,authenticated,service_role')
  await db.exec(fs.readFileSync('supabase/migrations/009_security_authorization.sql','utf8'))
  await db.exec(`insert into auth.users values('${a}'),('${b}'),('${c}'); insert into profiles(id,codename) values('${a}','a'),('${b}','b'),('${c}','c');`)
  const scalar=async(sql)=>Object.values((await db.query(sql)).rows[0])[0]
  const chat=await scalar(`insert into chats(user1_id,user2_id) values('${a}','${b}') returning id`)
  const legacy=await scalar(`insert into messages(chat_id,sender_id,content,ban_check_status) values('${chat}','${a}','legacy','passed') returning id`)
  for(const f of ['010_mandatory_moderation.sql','011_push_deduplication.sql','012_remaining_authorization.sql'])
   await db.exec(fs.readFileSync(`supabase/migrations/${f}`,'utf8'))
  const role=async(who,sql,uid=a)=>{
   await db.exec(`set role ${who}; set request.jwt.claim.sub='${uid}'`)
   try{return await db.query(sql)}finally{await db.exec('reset role')}
  }
  const user=(sql,id=a)=>role('authenticated',sql,id)
  const service=sql=>role('service_role',sql)
  const insert=async(text,id=a)=> (await user(`insert into messages(chat_id,sender_id,content) values('${chat}','${id}','${text}') returning id`,id)).rows[0].id
  const claim=async(id)=> (await service(`select * from claim_moderation('${id}')`)).rows[0]
  const finish=async(job,verdict)=>Object.values((await service(`select finish_moderation('${job.message_id}','${job.lease_token}','${verdict}')`)).rows[0])[0]
  let first, second
  await t.test('legacy passed flags become hidden pending jobs',async()=>{
   assert.equal(await scalar(`select ban_check_status from messages where id='${legacy}'`),'pending')
   assert.equal((await user(`select content from messages where id='${legacy}'`,b)).rows.length,0)
   assert.equal(await scalar(`select count(*)::int from private.moderation_jobs where message_id='${legacy}'`),1)
  })
  await t.test('direct Data API INSERT enqueues, with sender-only pending visibility',async()=>{
   first=await insert('first')
   assert.equal(await scalar(`select count(*)::int from private.moderation_jobs where message_id='${first}'`),1)
   assert.equal((await user(`select content from messages where id='${first}'`)).rows.length,1)
   assert.equal((await user(`select content from messages where id='${first}'`,b)).rows.length,0)
   assert.equal((await user(`select content from messages where id='${first}'`,c)).rows.length,0)
   await assert.rejects(user(`update messages set moderation_state='done' where id='${first}'`),/permission denied/)
  })
  await t.test('claim is exclusive across duplicate requests; users cannot call worker RPCs',async()=>{
   const job=await claim(first);assert.equal(job.content,'first')
   assert.equal(await claim(first),undefined)
   for(const who of ['anon','authenticated']) {
    await assert.rejects(role(who,`select * from claim_moderation('${first}')`),/permission denied/)
    await assert.rejects(role(who,`select finish_moderation('${first}','${job.lease_token}','SAFE')`),/permission denied/)
    await assert.rejects(role(who,`select retry_held_moderation('${first}')`),/permission denied/)
    await assert.rejects(role(who,'select * from private.moderation_jobs'),/permission denied/)
   }
   assert.equal(await finish({...job,lease_token:c},'SAFE'),false)
   assert.equal(await finish(job,'SAFE'),true)
   assert.equal(await finish(job,'SAFE'),false)
   assert.equal((await user(`select content from messages where id='${first}'`,b)).rows.length,1)
  })
  await t.test('pending and failed posts cannot increment counters; approval counts once',async()=>{
   const before=await scalar(`select round_trip_count from chats where id='${chat}'`)
   second=await insert('second',b)
   assert.equal(await scalar(`select round_trip_count from chats where id='${chat}'`),before)
   const job=await claim(second);await finish(job,'SAFE')
   assert.equal(await scalar(`select round_trip_count from chats where id='${chat}'`),before+1)
   await finish(job,'SAFE')
   assert.equal(await scalar(`select round_trip_count from chats where id='${chat}'`),before+1)
  })
  await t.test('failure backs off, retries at most three times, and remains hidden while held',async()=>{
   const id=await insert('failing')
   for(let i=1;i<=3;i++) {
    const job=await claim(id);assert.ok(job);assert.equal(await finish(job,'ERROR'),true)
    assert.equal((await user(`select content from messages where id='${id}'`,b)).rows.length,0)
    assert.equal(await claim(id),undefined)
    if(i<3) await db.exec(`update private.moderation_jobs set available_at=now()-interval '1 second' where message_id='${id}'`)
   }
   assert.equal(await scalar(`select moderation_state from messages where id='${id}'`),'held')
   assert.equal(await scalar(`select attempts from private.moderation_jobs where message_id='${id}'`),3)
   await service(`select retry_held_moderation('${id}')`)
   assert.ok(await claim(id))
  })
  await t.test('expired lease is held, and stale results cannot approve after manual retry',async()=>{
   const id=await insert('crashed');const old=await claim(id)
   await db.exec(`update private.moderation_jobs set lease_until=now()-interval '1 second' where message_id='${id}'`)
   assert.equal(await claim(id),undefined)
   assert.equal(await finish(old,'SAFE'),false)
   assert.equal(await scalar(`select moderation_state from messages where id='${id}'`),'held')
   await service(`select retry_held_moderation('${id}')`)
   const next=await claim(id);assert.notEqual(next.lease_token,old.lease_token)
   assert.equal(await finish(old,'SAFE'),false);assert.equal(await finish(next,'FLAGGED'),true)
   assert.equal((await user(`select content from messages where id='${id}'`,b)).rows.length,0)
  })
  await t.test('uncertain provider outcome enters held without automatic retry',async()=>{
   const id=await insert('uncertain');const job=await claim(id);await finish(job,'HOLD')
   assert.equal(await scalar(`select moderation_state from messages where id='${id}'`),'held')
   assert.equal(await claim(id),undefined)
  })
  await t.test('message frequency cap is enforced for direct DB writes',async()=>{
   await db.exec('delete from private.rate_limits')
   for(let i=0;i<10;i++) await insert('bounded')
   await assert.rejects(insert('too many'),/rate_limit_exceeded/)
   await db.exec('delete from private.rate_limits')
  })
  await t.test('push events are durably unique and recipient/actor frequency is bounded',async()=>{
   const key=`chat_started-${chat}`
   const reserve=()=>service(`select reserve_push('${b}','${key}','${a}') as id`)
   const id=(await reserve()).rows[0].id;assert.ok(id);assert.equal((await reserve()).rows[0].id,null)
   await service(`select finish_push('${id}','failed')`)
   assert.equal((await reserve()).rows[0].id,null)
   for(let i=0;i<9;i++) await service(`select reserve_push('${b}','timer-00000000-0000-0000-0000-${String(i).padStart(12,'0')}','${a}')`)
   await assert.rejects(service(`select reserve_push('${b}','mutual_stock-${chat}','${a}')`),/rate_limit_exceeded/)
   await assert.rejects(user(`select reserve_push('${b}','${key}','${a}')`),/permission denied/)
  })
  await t.test('private profile fields cannot be read through public rows; own RPC is scoped',async()=>{
   await db.exec(`update profiles set notification_prefs='{"private":true}',stripe_customer_id='cus_private',subscription_status='active' where id='${a}'`)
   for(const col of ['notification_prefs','subscription_status','rules_accepted_at','occupation','stripe_customer_id','is_banned']) {
    await assert.rejects(user(`select ${col} from profiles`),/permission denied/)
   }
   await user("update profiles set occupation='private occupation' where id='"+a+"'")
   assert.equal((await user('select get_my_profile() as p',a)).rows[0].p.occupation,'private occupation')
   assert.equal((await user('select get_my_profile() as p',b)).rows[0].p.id,b)
   assert.equal((await user('select get_my_profile() as p',a)).rows[0].p.notification_prefs.private,true)
   await assert.rejects(role('anon','select get_my_profile()'),/permission denied/)
   assert.equal((await user(`select codename from profiles where id='${b}'`)).rows[0].codename,'b')
  })
  await t.test('voice lifecycle cannot be forged and expired/banned voices cannot match',async()=>{
   const voice=(await user(`insert into voices(user_id,content) values('${a}','voice') returning id`)).rows[0].id
   await assert.rejects(user(`update voices set expires_at=now()+interval '1 year' where id='${voice}'`),/permission denied/)
   await assert.rejects(user(`update voices set status='matched' where id='${voice}'`),/row-level security/)
   await db.exec(`update voices set expires_at=now()-interval '1 second' where id='${voice}'`)
   assert.equal((await user(`select match_voice('${voice}') as r`,b)).rows[0].r.error,'voice_not_available')
   await db.exec(`update voices set expires_at=now()+interval '1 hour' where id='${voice}';update profiles set is_banned=true where id='${a}'`)
   assert.equal((await user(`select match_voice('${voice}') as r`,b)).rows[0].r.error,'voice_not_available')
   await assert.rejects(insert('banned'),/row-level security/)
   await db.exec(`update profiles set is_banned=false where id='${a}'`)
   assert.ok((await user(`select match_voice('${voice}') as r`,b)).rows[0].r.chat_id)
   assert.equal((await user(`update voices set status='expired' where id='${voice}' returning id`)).rows.length,0)
  })
  await t.test('derived counters and report status cannot be forged',async()=>{
   await assert.rejects(user(`select increment_melon_soda_received('${b}')`),/permission denied/)
   await assert.rejects(user(`insert into zukan_entries(user_id,tag_type,tag_value,count) values('${a}','interest','forged',999)`),/permission denied/)
   await assert.rejects(user(`insert into reports(reporter_id,reported_user_id,chat_id,status) values('${a}','${b}','${chat}','resolved')`),/permission denied/)
   await assert.rejects(user(`insert into reports(reporter_id,reported_user_id,chat_id) values('${a}','${c}','${chat}')`),/row-level security/)
   await assert.rejects(user(`insert into reports(reporter_id,reported_user_id,chat_id,message_id) values('${a}','${b}','${chat}','${first}')`),/row-level security/)
   await user(`insert into reports(reporter_id,reported_user_id,chat_id,message_id) values('${a}','${b}','${chat}','${second}')`)
  })
  await t.test('valid drinks increment once; paid drinks require server-owned subscription',async()=>{
   const free=await scalar("select id from drink_bar_items where key='melon_soda'")
   const paid=await scalar("select id from drink_bar_items where key='beer'")
   const before=await scalar(`select melon_soda_received from profiles where id='${b}'`)
   await user(`insert into drink_bar_uses(chat_id,sender_id,item_id) values('${chat}','${a}','${free}')`)
   assert.equal(await scalar(`select melon_soda_received from profiles where id='${b}'`),before+1)
   await user(`insert into drink_bar_uses(chat_id,sender_id,item_id) values('${chat}','${a}','${paid}')`)
   await assert.rejects(user(`insert into drink_bar_uses(chat_id,sender_id,item_id) values('${chat}','${b}','${paid}')`,b),/row-level security/)
  })
  await t.test('pending reactions and unrelated relationships are rejected',async()=>{
   const pending=await insert('unreviewed')
   await assert.rejects(user(`insert into reactions(message_id,user_id,emoji) values('${pending}','${a}','👍')`),/row-level security/)
   await user(`insert into reactions(message_id,user_id,emoji) values('${first}','${b}','👍')`,b)
   await assert.rejects(user(`insert into stocks(user_id,target_user_id) values('${c}','${a}')`,c),/row-level security/)
   await assert.rejects(user(`insert into bookmarks(user_id,target_user_id) values('${c}','${a}')`,c),/row-level security/)
  })
  await t.test('direct subscription registration validates endpoints and caps fanout',async()=>{
   const keys=`'${'a'.repeat(22)}','${'b'.repeat(87)}'`
   await assert.rejects(user(`insert into push_subscriptions(user_id,endpoint,auth,p256dh) values('${a}','https://localhost/x',${keys})`),/invalid_subscription/)
   for(let i=0;i<3;i++) await user(`insert into push_subscriptions(user_id,endpoint,auth,p256dh) values('${a}','https://fcm.googleapis.com/fcm/send/${i}',${keys})`)
   await assert.rejects(user(`insert into push_subscriptions(user_id,endpoint,auth,p256dh) values('${a}','https://fcm.googleapis.com/fcm/send/extra',${keys})`),/subscription_limit/)
   await assert.rejects(user(`insert into push_subscriptions(user_id,endpoint,auth,p256dh) values('${b}','https://fcm.googleapis.com/fcm/send/0',${keys}) on conflict(endpoint) do update set user_id=excluded.user_id`,b),/row-level security/)
  })
 } finally {await db.close()}
})
