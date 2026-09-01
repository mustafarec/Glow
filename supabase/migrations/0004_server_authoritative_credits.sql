-- Credit balances and generation settlement are server-authoritative.
-- The client may display this data, but it cannot grant, reserve, or refund it.

insert into public.remote_config (key, value)
values ('feature_limits', '{"freeProfiles":1,"freePreviewAllowance":3,"freeTimeline":true,"freePreviewCredits":15}'::jsonb)
on conflict (key) do update
set value = case
  when public.remote_config.value ? 'freePreviewCredits' then public.remote_config.value
  else public.remote_config.value || '{"freePreviewCredits":15}'::jsonb
end,
updated_at = timezone('utc', now());

create or replace function public.ensure_credit_wallet()
returns table(balance integer, lifetime_granted integer, lifetime_spent integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  free_credits integer := 15;
  wallet_inserted boolean := false;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  select coalesce((value ->> 'freePreviewCredits')::integer, 15)
    into free_credits
    from public.remote_config
   where key = 'feature_limits';
  free_credits := greatest(0, least(coalesce(free_credits, 15), 1000));

  insert into public.users (id)
  values (current_user_id)
  on conflict (id) do nothing;

  insert into public.credit_wallets (user_id, balance, lifetime_granted, lifetime_spent)
  values (current_user_id, free_credits, free_credits, 0)
  on conflict (user_id) do nothing
  returning true into wallet_inserted;

  if wallet_inserted and free_credits > 0 then
    insert into public.credit_transactions (user_id, type, amount, label)
    values (current_user_id, 'grant', free_credits, 'Free preview allowance');
  end if;

  return query
  select wallet.balance, wallet.lifetime_granted, wallet.lifetime_spent
    from public.credit_wallets as wallet
   where wallet.user_id = current_user_id;
end;
$$;

revoke all on function public.ensure_credit_wallet() from public;
grant execute on function public.ensure_credit_wallet() to authenticated;

create or replace function public.reserve_generation_credits(
  p_job_id uuid,
  p_recommendation_id text,
  p_recommendation_title text,
  p_recommendation_category text,
  p_source_storage_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  credit_cost integer;
  wallet_row public.credit_wallets%rowtype;
  existing_job public.generation_jobs%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_job_id is null
    or p_recommendation_id is null
    or length(btrim(p_recommendation_id)) = 0
    or length(p_recommendation_id) > 120
    or p_recommendation_title is null
    or length(btrim(p_recommendation_title)) = 0
    or length(p_recommendation_title) > 160 then
    raise exception 'INVALID_GENERATION_REQUEST' using errcode = '22023';
  end if;
  if p_recommendation_category not in ('hairstyle', 'hair-color', 'makeup', 'complete-glow') then
    raise exception 'INVALID_GENERATION_CATEGORY' using errcode = '22023';
  end if;
  if p_source_storage_path is not null
    and (p_source_storage_path !~ ('^' || current_user_id::text || '/[^/]+$') or position('..' in p_source_storage_path) > 0) then
    raise exception 'FORBIDDEN_SOURCE_PATH' using errcode = '42501';
  end if;

  credit_cost := case p_recommendation_category
    when 'complete-glow' then 15
    else 5
  end;

  -- The client request id is hashed into p_job_id by the Edge Function.
  -- Serializing that id makes retries converge before the wallet is charged.
  perform pg_advisory_xact_lock(hashtext(p_job_id::text));

  select * into existing_job
    from public.generation_jobs
   where id = p_job_id and user_id = current_user_id
   for update;
  if found then return p_job_id; end if;

  perform 1 from public.ensure_credit_wallet();
  select * into wallet_row
    from public.credit_wallets
   where user_id = current_user_id
   for update;
  if not found or wallet_row.balance < credit_cost then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  update public.credit_wallets
     set balance = balance - credit_cost,
         lifetime_spent = lifetime_spent + credit_cost
   where user_id = current_user_id;

  insert into public.generation_jobs (
    id, user_id, provider_job_id, recommendation_id, recommendation_title,
    recommendation_category, source_storage_path, status, credit_cost
  ) values (
    p_job_id, current_user_id, null, btrim(p_recommendation_id), btrim(p_recommendation_title),
    p_recommendation_category, p_source_storage_path, 'queued', credit_cost
  );

  insert into public.credit_transactions (user_id, type, amount, generation_job_id, label)
  values (current_user_id, 'reservation', -credit_cost, p_job_id, 'Preview: ' || btrim(p_recommendation_title));

  return p_job_id;
end;
$$;

revoke all on function public.reserve_generation_credits(uuid, text, text, text, text) from public;
grant execute on function public.reserve_generation_credits(uuid, text, text, text, text) to authenticated;

create or replace function public.fail_generation_job_and_refund(
  p_job_id uuid,
  p_error_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  job_row public.generation_jobs%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_job_id is null then
    raise exception 'INVALID_GENERATION_REQUEST' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_job_id::text));
  select * into job_row
    from public.generation_jobs
   where id = p_job_id and user_id = current_user_id
   for update;
  if not found then raise exception 'JOB_NOT_FOUND' using errcode = 'P0002'; end if;
  if job_row.status = 'completed' then return p_job_id; end if;

  if not job_row.credits_refunded then
    update public.credit_wallets
       set balance = balance + job_row.credit_cost,
           lifetime_spent = greatest(0, lifetime_spent - job_row.credit_cost)
     where user_id = current_user_id;

    insert into public.credit_transactions (user_id, type, amount, generation_job_id, label)
    values (current_user_id, 'refund', job_row.credit_cost, p_job_id, 'Generation restored');
  end if;

  update public.generation_jobs
     set status = 'failed',
         error_code = left(coalesce(nullif(btrim(p_error_code), ''), 'provider_failed'), 80),
         credits_refunded = true
   where id = p_job_id and user_id = current_user_id;

  return p_job_id;
end;
$$;

revoke all on function public.fail_generation_job_and_refund(uuid, text) from public;
grant execute on function public.fail_generation_job_and_refund(uuid, text) to authenticated;
