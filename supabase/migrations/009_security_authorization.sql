-- Review and test on an isolated DB first. Apply after schema.sql and migrations 001–008.
begin;

-- Row ownership alone does not protect privileged columns.
revoke insert, update, select on public.profiles from public, anon, authenticated;
grant select (id, created_at, codename, avatar_url, occupation, mbti, interest_1,
  interest_2, rules_accepted_at, subscription_status, melon_soda_received,
  notification_prefs) on public.profiles to authenticated;
grant insert (id, codename, avatar_url, occupation, mbti, interest_1, interest_2,
  rules_accepted_at, notification_prefs) on public.profiles to authenticated;
grant update (codename, avatar_url, occupation, mbti, interest_1, interest_2,
  rules_accepted_at, notification_prefs) on public.profiles to authenticated;

-- Only the server may set moderation status or alter stored message text.
revoke insert, update on public.messages from public, anon, authenticated;
grant insert (chat_id, sender_id, content) on public.messages to authenticated;
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and char_length(content) between 1 and 4000
  and exists (select 1 from public.chats c where c.id = messages.chat_id
    and auth.uid() in (c.user1_id, c.user2_id)
    and (c.status = 'freed' or (c.status = 'active' and c.expires_at > now())))
);

-- Prevent writes to unrelated chats through the direct Supabase Data API.
drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.messages m
    join public.chats c on c.id = m.chat_id where m.id = reactions.message_id
    and auth.uid() in (c.user1_id, c.user2_id))
);
drop policy if exists drink_uses_insert on public.drink_bar_uses;
create policy drink_uses_insert on public.drink_bar_uses for insert to authenticated with check (
  sender_id = auth.uid() and exists (select 1 from public.chats c
    where c.id = drink_bar_uses.chat_id and auth.uid() in (c.user1_id, c.user2_id)
    and (c.status = 'freed' or (c.status = 'active' and c.expires_at > now())))
  and exists (select 1 from public.drink_bar_items i where i.id = drink_bar_uses.item_id
    and i.is_active and (i.is_free or exists (select 1 from public.profiles p
      where p.id = auth.uid() and p.subscription_status = 'active')))
);

-- Explicitly revoke PostgreSQL's default PUBLIC EXECUTE grant.
revoke all on function public.update_zukan_on_completion(uuid) from public, anon, authenticated;
revoke all on function public.on_message_insert() from public, anon, authenticated;
revoke all on function public.get_expiring_chats() from public, anon, authenticated;
revoke all on function public.mark_timer_notified(uuid) from public, anon, authenticated;
grant execute on function public.get_expiring_chats() to service_role;
grant execute on function public.mark_timer_notified(uuid) to service_role;
revoke all on function public.increment_melon_soda_received(uuid) from public, anon;
grant execute on function public.increment_melon_soda_received(uuid) to authenticated;

commit;
