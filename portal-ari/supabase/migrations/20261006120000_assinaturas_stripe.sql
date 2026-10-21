-- Assinaturas via Stripe: planos, assinaturas, controle de eventos e função de acesso.
-- Escritas em assinaturas/stripe_events só acontecem pelas Edge Functions (service role),
-- que ignoram RLS. O navegador só consegue LER as próprias assinaturas.

-- ---------------------------------------------------------------- planos
create table if not exists public.planos (
  price_id        text primary key,            -- Price ID do Stripe (price_...)
  nome            text not null,
  descricao       text,
  valor_centavos  integer not null check (valor_centavos >= 0), -- só para exibição; o valor real é o do Stripe
  ordem           integer not null default 0,
  ativo           boolean not null default true
);

alter table public.planos enable row level security;

drop policy if exists "planos_leitura_publica" on public.planos;
create policy "planos_leitura_publica" on public.planos
  for select to anon, authenticated
  using (ativo);

-- Seed com os planos que estavam fixos no front (IDs de TESTE do Stripe).
-- Em produção, troque pelos Price IDs do modo live.
insert into public.planos (price_id, nome, descricao, valor_centavos, ordem) values
  ('price_1UNFWdE8OAb1ScAoQZvU0g8x', 'ENEM',                  'Foco total nas matrizes de referência e simulados estilo ENEM.', 6999, 1),
  ('price_1UNFedE8OAb1ScAoc82kerg8', 'Concursos',             'Preparatório completo para editais civis e militares.',          6999, 2),
  ('price_1UNFgaE8OAb1ScAoDkdFdEI8', 'Pré-IFMA',              'Conteúdo direcionado para aprovação no Instituto Federal.',      2990, 3),
  ('price_1UNFjPE8OAb1ScAoSkm77Wk2', '6º Ano',                'Reforço escolar e base sólida para o Ensino Fundamental.',       2990, 4),
  ('price_1UNFknE8OAb1ScAoU5mlDeBV', 'Isolada de Matemática', 'Domine a matemática do zero ao avançado com o professor.',       5990, 5)
on conflict (price_id) do nothing;

-- ----------------------------------------------------------- assinaturas
create table if not exists public.assinaturas (
  stripe_subscription_id text primary key,
  user_id                uuid not null references auth.users (id) on delete cascade,
  stripe_customer_id     text not null,
  price_id               text,
  status                 text not null,        -- active, trialing, past_due, canceled, unpaid, incomplete...
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists assinaturas_user_id_idx  on public.assinaturas (user_id);
create index if not exists assinaturas_customer_idx on public.assinaturas (stripe_customer_id);

alter table public.assinaturas enable row level security;

-- Aluno vê só as próprias; admin vê todas. Nenhuma policy de escrita: só service role escreve.
drop policy if exists "assinaturas_leitura" on public.assinaturas;
create policy "assinaturas_leitura" on public.assinaturas
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ---------------------------------------------- eventos (idempotência)
create table if not exists public.stripe_events (
  id           text primary key,               -- evt_...
  type         text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security; -- sem policies: ninguém além da service role

-- ----------------------------------------------------- função de acesso
-- true se o usuário logado é admin OU tem assinatura ativa/em teste.
-- security definer para poder ser usada dentro de policies de outras tabelas.
create or replace function public.tem_acesso()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    or exists (
      select 1 from public.assinaturas a
      where a.user_id = auth.uid()
        and a.status in ('active', 'trialing')
    );
$$;

revoke all on function public.tem_acesso() from public;
grant execute on function public.tem_acesso() to authenticated;

-- ------------------------------------------------------------------------
-- PRÓXIMO PASSO (manual, depois de revisar as policies atuais das tabelas):
-- fazer o banco recusar conteúdo pago para quem não assinou, e não só o front.
-- Exemplo para a tabela de aulas (ajuste o nome da policy existente antes!):
--
--   drop policy "<policy_de_select_atual>" on public.aulas;
--   create policy "aulas_somente_assinantes" on public.aulas
--     for select to authenticated using (public.tem_acesso());
--
-- Repita para: questoes, simulados, simulado_questoes, modulos, videoaulas, lives.
-- ------------------------------------------------------------------------
