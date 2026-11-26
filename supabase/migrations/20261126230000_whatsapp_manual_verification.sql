-- Manual WhatsApp verification; no external API.
create table public.whatsapp_manual_settings (
  id boolean primary key default true check (id),
  phone text not null check (phone ~ '^55[0-9]{10,11}$')
);
create table public.whatsapp_manual_checks (
  professional_id uuid primary key references public.profiles(id) on delete cascade,
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  verified_at timestamptz
);
create unique index whatsapp_verified_phone_unique on public.whatsapp_manual_checks(phone) where verified_at is not null;
alter table public.whatsapp_manual_settings enable row level security;
alter table public.whatsapp_manual_checks enable row level security;
revoke all on public.whatsapp_manual_settings, public.whatsapp_manual_checks from anon, authenticated;
create function public.whatsapp_normalize(p text) returns text language sql immutable set search_path = '' as $$
  select case when d ~ '^[0-9]{10,11}$' then '55'||d when d ~ '^55[0-9]{10,11}$' then d else null end
  from (select regexp_replace(coalesce(p,''),'[^0-9]','','g') d) s
$$;
create function public.whatsapp_manual_config(p_phone text default null) returns text language plpgsql security definer set search_path = '' as $$
declare n text;
begin
  if auth.uid() is null then raise exception 'Acesso negado'; end if;
  if p_phone is not null then
    if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
    n := public.whatsapp_normalize(p_phone);
    if n is null then raise exception 'Número inválido'; end if;
    insert into public.whatsapp_manual_settings(id,phone) values(true,n) on conflict(id) do update set phone=excluded.phone;
  end if;
  return (select phone from public.whatsapp_manual_settings where id);
end $$;
create function public.whatsapp_manual_status(p_id uuid) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or (auth.uid() <> p_id and not public.has_role(auth.uid(),'admin')) then raise exception 'Acesso negado'; end if;
  return exists(select 1 from public.whatsapp_manual_checks c join public.profiles p on p.id=c.professional_id where p.id=p_id and c.verified_at is not null and c.phone=public.whatsapp_normalize(p.phone));
end $$;
create function public.whatsapp_manual_request() returns text language plpgsql security definer set search_path = '' as $$
declare n text; k text;
begin
  select public.whatsapp_normalize(phone) into n from public.profiles where id=auth.uid() and is_professional;
  if n is null then raise exception 'Salve um telefone válido primeiro'; end if;
  if not exists(select 1 from public.whatsapp_manual_settings) then raise exception 'WhatsApp da empresa ainda não configurado'; end if;
  if public.whatsapp_manual_status(auth.uid()) then raise exception 'Número já verificado'; end if;
  if exists(select 1 from public.whatsapp_manual_checks where phone=n and verified_at is not null and professional_id<>auth.uid()) then raise exception 'Número já verificado em outra conta'; end if;
  select code into k from public.whatsapp_manual_checks where professional_id=auth.uid() and phone=n and expires_at>now() and verified_at is null;
  if k is not null then return k; end if;
  k := lpad(floor(random()*1000000)::int::text,6,'0');
  insert into public.whatsapp_manual_checks(professional_id,phone,code,expires_at) values(auth.uid(),n,k,now()+interval '24 hours')
  on conflict(professional_id) do update set phone=excluded.phone,code=excluded.code,expires_at=excluded.expires_at,verified_at=null;
  return k;
end $$;
create function public.whatsapp_manual_confirm(p_id uuid,p_sender text,p_code text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  update public.whatsapp_manual_checks c set verified_at=now()
  from public.profiles p where p.id=p_id and c.professional_id=p.id and p.is_professional and c.phone=public.whatsapp_normalize(p.phone) and c.phone=public.whatsapp_normalize(p_sender) and c.code=p_code and c.expires_at>now() and c.verified_at is null;
  if not found then raise exception 'Código expirado, incorreto ou remetente diferente do telefone cadastrado'; end if;
  return true;
end $$;
create function public.whatsapp_manual_reset() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.whatsapp_normalize(old.phone) is distinct from public.whatsapp_normalize(new.phone) then
    delete from public.whatsapp_manual_checks where professional_id=new.id;
  end if;
  return new;
end $$;
create trigger whatsapp_manual_reset_phone after update of phone on public.profiles for each row execute function public.whatsapp_manual_reset();
revoke execute on function public.whatsapp_manual_config(text),public.whatsapp_manual_status(uuid),public.whatsapp_manual_request(),public.whatsapp_manual_confirm(uuid,text,text) from public,anon;
grant execute on function public.whatsapp_manual_config(text),public.whatsapp_manual_status(uuid),public.whatsapp_manual_request(),public.whatsapp_manual_confirm(uuid,text,text) to authenticated;
