
## Escopo real do que foi enviado

O zip `V_23._NOVO_MODELO_agendamendo_rapido_01.zip` é um app **Mocha** completo de agendamento de faxineiras/prestadores, com:

- **18 páginas React** (~18.500 linhas) usando `react-router 7`
- **1 Cloudflare Worker Hono** (`src/worker/index.ts`, ~5.200 linhas) com dezenas de endpoints REST
- **37 migrations SQLite/D1** (~27 KB de SQL)
- **Auth `@getmocha/users-service`** (serviço proprietário Mocha, não replicável no Lovable)
- **Tailwind v3 + shadcn/radix**, ícones Lucide

Portar isso 1-para-1 é um trabalho **muito grande** (múltiplas dezenas de créditos + várias horas de iteração). Não dá pra fazer num único turno sem quebrar o preview no meio. Vou executar em fases entregáveis, cada uma deixando o preview funcional.

## Diferenças críticas que forçam reescrita (não é copiar/colar)

| Origem (Mocha) | Destino (Lovable) |
|---|---|
| `react-router 7` (`<Routes>`) | `src/routes/*.tsx` com `createFileRoute` |
| Hono no Worker (`app.get('/api/...')`) | `createServerFn` (app-interno) + `src/routes/api/*` (webhooks) |
| D1 SQLite | Supabase Postgres (dialeto diferente: `AUTOINCREMENT`, `DATETIME`, `INTEGER PRIMARY KEY`, sem `gen_random_uuid()`, etc.) |
| `@getmocha/users-service` | Supabase Auth (email/senha + Google) |
| `env.DB.prepare(...)` | `supabase.from(...)` / RPC / RLS |
| Sem RLS | RLS obrigatório em toda tabela `public` |
| `wrangler.json` / Worker | Descartado |

## Plano em 5 fases

### Fase 1 — Fundação e schema (esta fase)
1. Extrair o zip pra `/tmp/v23` e analisar todas as 37 migrations + `shared/types.ts`.
2. Consolidar num **único SQL Supabase**: tabelas → GRANTs → RLS → policies → triggers `updated_at`. Converter tipos SQLite → Postgres (`INTEGER PK AUTOINCREMENT` → `uuid` + `gen_random_uuid()`, `DATETIME DEFAULT CURRENT_TIMESTAMP` → `timestamptz`, `TEXT` → `text`, etc.).
3. Substituir user IDs de texto pelo `auth.users(id)` (uuid). Criar `profiles` + `user_roles` (enum `app_role`: `admin | professional | client`) + função `has_role`.
4. Aplicar via `supabase--migration` (uma execução, com sua aprovação).
5. Recompilar tipos e limpar `src/features/*` do app anterior que não serve mais.

### Fase 2 — Auth e shell
1. `src/routes/__root.tsx` com header/nav baseado em sessão.
2. `src/routes/index.tsx` (Home pública) + `src/routes/auth.tsx` (login/cadastro email+senha + Google) + `src/routes/auth-callback.tsx`.
3. Camada `_authenticated/` (já gerenciada pelo template).
4. Camada `_authenticated/_admin/` e `_authenticated/_professional/` para RBAC.

### Fase 3 — Rotas públicas + backend leitura
- `/`, `/about`, `/contact`, `/cities`, `/cities/$city`, `/professionals`, `/professionals/$id`, `/quick-booking` (a "novidade" do V23).
- `createServerFn` públicos com client publishable pra leitura de cidades/profissionais.
- `head()` com SEO próprio por rota.

### Fase 4 — Rotas autenticadas + backend escrita
- Cliente: `/my-bookings`, `/booking`, `/profile`, `/add-credits`.
- Profissional: `/professional/dashboard`, `/become-cleaner`, `/professional/profile`.
- Admin: `/admin/dashboard`.
- `createServerFn` autenticados (`requireSupabaseAuth`) pra bookings/mensagens/perfil.
- Traduzir cada endpoint Hono do worker em uma server function equivalente.

### Fase 5 — Pagamentos, push, polish
- Endpoints de crédito/pagamento (se houver provedor definido; Mercado Pago já tem integração no projeto anterior — decidir se reaproveita ou parte do zero).
- Web push (`web-push`) como `src/routes/api/public/send-push.ts`.
- Testes manuais do preview em cada fluxo, SEO/head, ajustes de estilo.

## Detalhes técnicos

- **Nada** do `src/worker/`, `wrangler.json`, `tsconfig.worker.json`, `@getmocha/*`, `hono`, `react-router` vai pro projeto final.
- **`migrations/*.sql`** viram **um** arquivo consolidado convertido para Postgres, não são aplicadas uma a uma.
- `src/shared/types.ts` (Zod schemas) é reaproveitável quase inteiro em `src/lib/validation/`.
- Componentes `radix-ui` + Tailwind viram shadcn (já presente no template).
- Lovable AI Gateway substitui qualquer IA que o app original chamasse (se aplicável).
- `wrangler.json` do Lovable atual permanece; deploy é Cloudflare Workers via TanStack Start.

## O que preciso confirmar antes de começar

1. **Confirmação de escopo/custo**: isso vai gastar créditos significativos e levar múltiplos turnos. OK prosseguir?
2. **Papéis de usuário**: mantenho `admin`, `professional`, `client` como no original?
3. **Pagamentos**: reaproveito a integração Mercado Pago do projeto anterior (que ainda está parcialmente no repo), uso Stripe, ou pulo pagamentos nesta primeira versão?
4. **Push notifications** entram na v1 ou ficam pra depois?

Assim que você aprovar o plano e responder essas 4, começo pela **Fase 1** (schema + migration única).
