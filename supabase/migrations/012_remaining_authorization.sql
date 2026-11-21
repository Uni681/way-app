begin;
-- Remove ALL prior column grants as well as table grants, then expose only identity cards.
revoke select on public.profiles from public,anon,authenticated;
do $$ declare c record; begin
  for c in select column_name from information_schema.columns where table_schema='public' and table_name='profiles' loop
    execute format('revoke select (%I) on public.profiles from public,anon,authenticated', c.column_name);
  end loop;
end $$;
grant select(id,codename,avatar_url) on public.profiles to authenticated;
create function public.get_my_profile() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',id,'codename',codename,'avatar_url',avatar_url,
    'occupation',occupation,'mbti',mbti,'interest_1',interest_1,'interest_2',interest_2,
    'rules_accepted_at',rules_accepted_at,'subscription_status',subscription_status,
    'notification_prefs',notification_prefs,'melon_soda_received',melon_soda_received)
  from public.profiles where id=auth.uid();
$$;
create function public.is_active_way_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and not is_banned);
$$;
create function public.has_way_subscription() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=auth.uid() and not is_banned and subscription_status='active');
$$;
revoke all on function public.get_my_profile(),public.is_active_way_user(),public.has_way_subscription() from public,anon;
grant execute on function public.get_my_profile(),public.is_active_way_user(),public.has_way_subscription() to authenticated;

-- Ban status is server-owned; enforce it on every user-managed content table.
do $$ declare t text; begin
  foreach t in array array['voices','messages','reactions','drink_bar_uses','stocks','bookmarks','reports','zukan_entries','push_subscriptions'] loop
    execute format('create policy active_account on public.%I as restrictive for all to authenticated using (public.is_active_way_user()) with check (public.is_active_way_user())',t);
  end loop;
end $$;

-- Prevent forged timestamps, status, chat links and resetting matched voices to waiting.
revoke all on public.voices from public,anon,authenticated;
grant select on public.voices to authenticated;
grant insert(user_id,content),update(status) on public.voices to authenticated;
drop policy voices_update on public.voices;
create policy voices_update on public.voices for update to authenticated
  using (user_id=auth.uid() and status='waiting') with check(user_id=auth.uid() and status='expired');
create policy voices_content_limit on public.voices as restrictive for insert to authenticated
  with check(char_length(content) between 1 and 1000);
create function private.limit_voice() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.take_quota('voice_minute',new.user_id::text,60,3);
  perform private.take_quota('voice_hour',new.user_id::text,3600,30);
  return new;
end; $$;
create trigger limit_voice after insert on public.voices for each row execute function private.limit_voice();

create or replace function public.match_voice(p_voice_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v public.voices%rowtype; v_chat_id uuid; encounter int;
begin
  if not public.is_active_way_user() then raise exception 'forbidden'; end if;
  perform private.take_quota('match_minute',auth.uid()::text,60,5);
  select * into v from public.voices where id=p_voice_id and status='waiting' and expires_at>now() for update skip locked;
  if not found then return jsonb_build_object('error','voice_not_available'); end if;
  if v.user_id=auth.uid() then return jsonb_build_object('error','cannot_match_own_voice'); end if;
  if not exists(select 1 from public.profiles where id=v.user_id and not is_banned) then
    return jsonb_build_object('error','voice_not_available'); end if;
  -- Serialize two requests for the same pair, even if they target different voices.
  perform pg_advisory_xact_lock(hashtextextended(least(v.user_id,auth.uid())::text || greatest(v.user_id,auth.uid())::text,42));
  select count(*)+1 into encounter from public.chats
    where (user1_id=v.user_id and user2_id=auth.uid()) or (user2_id=v.user_id and user1_id=auth.uid());
  insert into public.chats(user1_id,user2_id,voice_id,encounter_number,status,freed_at)
    values(v.user_id,auth.uid(),v.id,encounter,case when encounter>=30 then 'freed'::public.chat_status else 'active'::public.chat_status end,
      case when encounter>=30 then now() else null end) returning id into v_chat_id;
  update public.voices set status='matched',matched_at=now(),chat_id=v_chat_id where id=v.id;
  return jsonb_build_object('chat_id',v_chat_id);
end; $$;

-- Derived data cannot be forged through the Data API or a freely callable counter RPC.
revoke insert,update,delete on public.zukan_entries from public,anon,authenticated;
revoke all on function public.increment_melon_soda_received(uuid) from public,anon,authenticated;
revoke all on public.drink_bar_uses from public,anon,authenticated;
grant select on public.drink_bar_uses to authenticated;
grant insert(chat_id,sender_id,item_id) on public.drink_bar_uses to authenticated;
drop policy drink_uses_insert on public.drink_bar_uses;
create policy drink_uses_insert on public.drink_bar_uses for insert to authenticated with check (
  sender_id=auth.uid() and exists(select 1 from public.chats c where c.id=drink_bar_uses.chat_id
    and auth.uid() in (c.user1_id,c.user2_id) and (c.status='freed' or (c.status='active' and c.expires_at>now())))
  and exists(select 1 from public.drink_bar_items i where i.id=drink_bar_uses.item_id and i.is_active
    and (i.is_free or public.has_way_subscription())));
create function private.record_drink() returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.take_quota('drink_minute',new.sender_id::text,60,10);
  if exists(select 1 from public.drink_bar_items where id=new.item_id and key='melon_soda') then
    update public.profiles set melon_soda_received=melon_soda_received+1 where id=(
      select case when user1_id=new.sender_id then user2_id else user1_id end from public.chats where id=new.chat_id);
  end if;
  return new;
end; $$;
create trigger record_drink after insert on public.drink_bar_uses for each row execute function private.record_drink();

revoke insert,update on public.reactions from public,anon,authenticated;
grant insert(message_id,user_id,emoji) on public.reactions to authenticated;
create policy approved_reactions on public.reactions as restrictive for insert to authenticated with check (
  emoji in ('😂','👍','❤️','🔥','😮','🥲','😴','👀') and exists(select 1 from public.messages m
    where m.id=message_id and m.ban_check_status='passed' and not m.is_deleted));
revoke all on public.reports from public,anon,authenticated;
grant select on public.reports to authenticated;
grant insert(reporter_id,reported_user_id,chat_id,message_id,reason) on public.reports to authenticated;
create policy report_target on public.reports as restrictive for insert to authenticated with check (
  reported_user_id<>auth.uid() and char_length(coalesce(reason,''))<=2000
  and exists(select 1 from public.chats c where c.id=reports.chat_id
    and auth.uid() in (c.user1_id,c.user2_id) and reported_user_id in (c.user1_id,c.user2_id))
  and (message_id is null or exists(select 1 from public.messages m where m.id=reports.message_id
    and m.chat_id=reports.chat_id and m.sender_id=reported_user_id)));

-- Only a genuine encounter grants a stock/bookmark relationship.
revoke insert,update on public.stocks,public.bookmarks from public,anon,authenticated;
grant insert(user_id,target_user_id) on public.stocks,public.bookmarks to authenticated;
create policy stock_relationship on public.stocks as restrictive for insert to authenticated with check (
  exists(select 1 from public.chats c where auth.uid() in (c.user1_id,c.user2_id) and target_user_id in (c.user1_id,c.user2_id)));
create policy bookmark_relationship on public.bookmarks as restrictive for insert to authenticated with check (
  exists(select 1 from public.chats c where auth.uid() in (c.user1_id,c.user2_id) and target_user_id in (c.user1_id,c.user2_id)));
revoke all on function public.match_voice(uuid) from public,anon;
grant execute on function public.match_voice(uuid) to authenticated;
revoke all on all functions in schema private from public,anon,authenticated;
notify pgrst, 'reload schema';
commit;
