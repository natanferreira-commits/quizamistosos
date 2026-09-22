-- ============================================================
--  Bolão do Caumo — banco (Supabase)
--  Rodar UMA vez no SQL Editor do Supabase, ANTES de colocar as chaves no config.js
--  Pode rodar de novo sem medo: é tudo "if not exists" / "or replace".
-- ============================================================

-- >>> TROQUE A SENHA DO /admin AQUI (é a única linha que você precisa editar) <<<
create table if not exists public.admin_config (
  id    int primary key default 1,
  senha text not null
);
insert into public.admin_config (id, senha) values (1, 'TROQUE-ESTA-SENHA')
  on conflict (id) do update set senha = excluded.senha;
alter table public.admin_config enable row level security;   -- sem policy = invisível pela API


-- 1) Eventos do funil (a página grava aqui com a chave pública)
create table if not exists public.eventos (
  id         bigserial primary key,
  criado_em  timestamptz not null default now(),
  rodada     text not null,
  evento     text not null,     -- page_view | cta_start | palpite | bilhete_view | whatsapp_click | refazer
  etapa      int,               -- nº do palpite quando evento = 'palpite'
  visitante  text,              -- id por navegador
  sessao     text,              -- id por aba
  meta       jsonb
);
create index if not exists eventos_rodada_idx on public.eventos (rodada, evento);
create index if not exists eventos_criado_idx on public.eventos (criado_em);
alter table public.eventos enable row level security;
drop policy if exists "anon insere eventos" on public.eventos;
create policy "anon insere eventos" on public.eventos for insert to anon with check (true);
-- não existe policy de select: ninguém lê eventos pela API sem a senha do admin


-- 2) Bilhetes
create table if not exists public.bilhetes (
  codigo           text primary key,
  criado_em        timestamptz not null default now(),
  rodada           text not null,
  visitante        text,
  sessao           text,
  palpites         jsonb not null,      -- [{ "jogo": "...", "mercado": "...", "escolha": "..." }, ...]
  clicou_whatsapp  boolean not null default false,
  clicou_em        timestamptz
);
create index if not exists bilhetes_rodada_idx on public.bilhetes (rodada, criado_em desc);
alter table public.bilhetes enable row level security;
drop policy if exists "anon insere bilhetes" on public.bilhetes;
create policy "anon insere bilhetes" on public.bilhetes for insert to anon with check (true);


-- 3) Marca que o dono do bilhete clicou em "Registrar no WhatsApp"
create or replace function public.marcar_whatsapp(p_codigo text)
returns void
language sql
security definer
set search_path = public
as $$
  update bilhetes
     set clicou_whatsapp = true,
         clicou_em = coalesce(clicou_em, now())
   where codigo = p_codigo;
$$;


-- 4) Checagem de senha usada pelas funções do admin
create or replace function public._admin_ok(p_senha text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from admin_config where id = 1 and senha = p_senha);
$$;


-- 5) Resumo do /admin (acessos, funil, por dia)
create or replace function public.admin_resumo(p_senha text, p_rodada text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r json;
begin
  if not _admin_ok(p_senha) then
    raise exception 'senha invalida' using errcode = '28000';
  end if;

  select json_build_object(
    'rodadas', (
      select coalesce(json_agg(x.rodada order by x.ultima desc), '[]'::json)
      from (select rodada, max(criado_em) as ultima from eventos group by rodada) x
    ),
    'visitantes', (
      select count(distinct visitante) from eventos
      where evento = 'page_view' and (p_rodada is null or rodada = p_rodada)
    ),
    'eventos', (
      select coalesce(json_agg(json_build_object(
        'evento', evento, 'etapa', etapa, 'total', total, 'sessoes', sessoes
      ) order by evento, etapa), '[]'::json)
      from (
        select evento, etapa, count(*) as total, count(distinct sessao) as sessoes
        from eventos
        where (p_rodada is null or rodada = p_rodada)
        group by evento, etapa
      ) t
    ),
    'por_dia', (
      select coalesce(json_agg(json_build_object(
        'dia', dia, 'visitas', visitas, 'comecou', comecou, 'bilhetes', bilhetes, 'whatsapp', whatsapp
      ) order by dia desc), '[]'::json)
      from (
        select
          (criado_em at time zone 'America/Sao_Paulo')::date                as dia,
          count(distinct sessao) filter (where evento = 'page_view')        as visitas,
          count(distinct sessao) filter (where evento = 'cta_start')        as comecou,
          count(distinct sessao) filter (where evento = 'bilhete_view')     as bilhetes,
          count(distinct sessao) filter (where evento = 'whatsapp_click')   as whatsapp
        from eventos
        where (p_rodada is null or rodada = p_rodada)
        group by 1
      ) d
    ),
    'bilhetes_total', (
      select count(*) from bilhetes where (p_rodada is null or rodada = p_rodada)
    ),
    'bilhetes_whatsapp', (
      select count(*) from bilhetes where clicou_whatsapp and (p_rodada is null or rodada = p_rodada)
    ),
    'ultimo_evento', (select max(criado_em) from eventos where (p_rodada is null or rodada = p_rodada))
  ) into r;

  return r;
end;
$$;


-- 6) Lista de bilhetes do /admin
create or replace function public.admin_bilhetes(p_senha text, p_rodada text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r json;
begin
  if not _admin_ok(p_senha) then
    raise exception 'senha invalida' using errcode = '28000';
  end if;

  select coalesce(json_agg(json_build_object(
    'codigo', codigo,
    'criado_em', criado_em,
    'rodada', rodada,
    'palpites', palpites,
    'clicou_whatsapp', clicou_whatsapp
  ) order by criado_em desc), '[]'::json)
  into r
  from (
    select * from bilhetes
    where (p_rodada is null or rodada = p_rodada)
    order by criado_em desc
    limit 10000
  ) b;

  return r;
end;
$$;


-- 7) Permissões: a chave pública só executa essas funções e insere nas duas tabelas
-- (grants explícitos: funciona mesmo com "Automatically expose new tables" desligado)
grant usage on schema public to anon, authenticated;
grant insert on public.eventos, public.bilhetes to anon, authenticated;
grant usage, select on sequence public.eventos_id_seq to anon, authenticated;
revoke all on public.admin_config from anon, authenticated;
revoke all on function public._admin_ok(text) from public, anon, authenticated;
revoke all on function public.admin_resumo(text, text) from public;
revoke all on function public.admin_bilhetes(text, text) from public;
revoke all on function public.marcar_whatsapp(text) from public;
grant execute on function public.admin_resumo(text, text)   to anon, authenticated;
grant execute on function public.admin_bilhetes(text, text) to anon, authenticated;
grant execute on function public.marcar_whatsapp(text)      to anon, authenticated;
