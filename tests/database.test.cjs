const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { PGlite } = require('@electric-sql/pglite')

test('SQL grants and RLS reject escalation and cross-chat writes', async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated, service_role;
      grant execute on function auth.uid() to anon, authenticated, service_role;`)
    await db.exec(fs.readFileSync('supabase/schema.sql','utf8').replace('create extension if not exists "uuid-ossp";', ''))
    for (const file of fs.readdirSync('supabase/migrations').filter(f => /^00[1-8]_/.test(f) && !f.startsWith('002'))) {
      await db.exec(fs.readFileSync(`supabase/migrations/${file}`, 'utf8'))
    }
    // Match Supabase's broad initial Data API table grants before hardening.
    await db.exec('grant all on all tables in schema public to anon, authenticated, service_role;')
    await db.exec(fs.readFileSync('supabase/migrations/009_security_authorization.sql','utf8'))
    const a='00000000-0000-0000-0000-000000000001', b='00000000-0000-0000-0000-000000000002', c='00000000-0000-0000-0000-000000000003'
    await db.exec(`insert into auth.users values ('${a}'),('${b}'),('${c}');
      insert into profiles(id,codename) values ('${a}','a'),('${b}','b'),('${c}','c');`)
    const chat=(await db.query(`insert into chats(user1_id,user2_id) values ('${a}','${b}') returning id`)).rows[0].id
    const item=(await db.query("select id from drink_bar_items where key='melon_soda'")).rows[0].id
    const asUser = async (id, sql) => {
      await db.exec(`set role authenticated; set request.jwt.claim.sub = '${id}';`)
      try { return await db.query(sql) } finally { await db.exec('reset role') }
    }
    await asUser(a, "update profiles set codename='new' where codename='a'")
    for (const column of ["subscription_status='active'", "stripe_customer_id='cus_victim'", 'is_banned=false']) {
      await assert.rejects(asUser(a, `update profiles set ${column} where id='${a}'`), /permission denied/)
    }
    await assert.rejects(asUser(a, 'select stripe_customer_id from profiles'), /permission denied/)
    await assert.rejects(asUser(a, `insert into profiles(id,codename,subscription_status) values ('${a}','hack','active')`), /permission denied/)
    for (const fn of ['get_expiring_chats()', `mark_timer_notified('${chat}')`, `update_zukan_on_completion('${chat}')`]) {
      await assert.rejects(asUser(a, `select ${fn}`), /permission denied/)
      await db.exec('set role anon')
      await assert.rejects(db.query(`select ${fn}`), /permission denied/)
      await db.exec('reset role')
    }
    const msg=(await asUser(a, `insert into messages(chat_id,sender_id,content) values ('${chat}','${a}','hello') returning id`)).rows[0].id
    await assert.rejects(asUser(a, `update messages set ban_check_status='passed' where id='${msg}'`), /permission denied/)
    await assert.rejects(asUser(a, `insert into messages(chat_id,sender_id,content,ban_check_status) values ('${chat}','${a}','x','passed')`), /permission denied/)
    await assert.rejects(asUser(c, `insert into messages(chat_id,sender_id,content) values ('${chat}','${c}','x')`), /row-level security/)
    await assert.rejects(asUser(c, `insert into reactions(message_id,user_id,emoji) values ('${msg}','${c}','x')`), /row-level security/)
    await assert.rejects(asUser(c, `insert into drink_bar_uses(chat_id,sender_id,item_id) values ('${chat}','${c}','${item}')`), /row-level security/)
    await asUser(b, `insert into reactions(message_id,user_id,emoji) values ('${msg}','${b}','x')`)
    await asUser(b, `insert into drink_bar_uses(chat_id,sender_id,item_id) values ('${chat}','${b}','${item}')`)
    await db.exec(`update chats set expires_at=now()-interval '1 hour' where id='${chat}'`)
    await assert.rejects(asUser(a, `insert into messages(chat_id,sender_id,content) values ('${chat}','${a}','expired')`), /row-level security/)
    await db.exec(`update chats set status='freed' where id='${chat}'`)
    await asUser(a, `insert into messages(chat_id,sender_id,content) values ('${chat}','${a}','freed')`)
    await asUser(a, `insert into push_subscriptions(user_id,endpoint,auth,p256dh) values ('${a}','https://example.test','x','y')`)
    await assert.rejects(asUser(b, `insert into push_subscriptions(user_id,endpoint,auth,p256dh) values ('${b}','https://example.test','x','y') on conflict(endpoint) do update set user_id=excluded.user_id`), /row-level security/)
  } finally { await db.close() }
})
