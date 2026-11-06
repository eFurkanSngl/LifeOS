begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-00000000f001'),('00000000-0000-4000-8000-00000000f002');
insert into public.lifeos_records(user_id,id,kind,data) values ('00000000-0000-4000-8000-00000000f001','00000000-0000-4000-8000-00000000f003','task','{"title":"Rollback-only RLS probe","status":"inbox"}');
set local role authenticated;
do $$
declare reply jsonb; changed integer;
begin
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated","is_anonymous":false}',true);
 if (select count(*) from public.lifeos_records where id='00000000-0000-4000-8000-00000000f003')<>1 then raise exception 'Owner read failed';end if;
 reply:=public.lifeos_push('00000000-0000-4000-8000-00000000f003','task','{"title":"Owner edit","status":"inbox"}',false,1);
 if reply->>'ok'<>'true' or reply->'record'->>'version'<>'2' then raise exception 'Owner CAS write failed';end if;
 reply:=public.lifeos_push('00000000-0000-4000-8000-00000000f003','task','{"title":"Stale edit","status":"inbox"}',false,1);
 if reply->>'ok'<>'false' then raise exception 'Stale write accepted';end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f002","role":"authenticated","is_anonymous":false}',true);
 if exists(select 1 from public.lifeos_records where id='00000000-0000-4000-8000-00000000f003') then raise exception 'Other owner read allowed';end if;
 update public.lifeos_records set data='{"title":"Other owner edit","status":"inbox"}',version=3 where id='00000000-0000-4000-8000-00000000f003';
 get diagnostics changed = row_count;
 if changed<>0 then raise exception 'Other owner write allowed';end if;
 begin
 insert into public.lifeos_records(user_id,id,kind,data) values ('00000000-0000-4000-8000-00000000f001','00000000-0000-4000-8000-00000000f004','task','{"title":"Forbidden insert","status":"inbox"}');
 raise exception 'Other owner insert allowed';
 exception when insufficient_privilege then null;
 end;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated","is_anonymous":true}',true);
 if exists(select 1 from public.lifeos_records where id='00000000-0000-4000-8000-00000000f003') then raise exception 'Anonymous identity read allowed';end if;
end $$;
reset role;
rollback;
select 'PASS: owner read/write, stale conflict, cross-owner read/write/insert denied, anonymous identity denied; all fixtures rolled back' as live_rls_verification;
