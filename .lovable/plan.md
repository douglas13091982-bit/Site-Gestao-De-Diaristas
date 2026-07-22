## Objetivo

Reproduzir o site https://4w6jg3ll5ix5o.mocha.app (branding **Gersepa Solutions**) sobre o template Lovable (TanStack Start + Supabase + Mercado Pago), a partir do zip enviado. O zip original é um app Cloudflare Workers (Hono + D1/SQLite + React SPA) — não roda direto no Lovable, então precisa ser portado.

Escopo bruto do zip: **18 páginas React**, **37 migrations SQL** (SQLite), backend Hono no Worker, upload de arquivos, painel admin, painel profissional, agendamento rápido, créditos, autenticação e páginas públicas (cidades, profissionais, sobre, contato).

## Estratégia

Reaproveitar o schema, RLS e UI que já construímos para a Gersepa Solutions (landing split-hero, auth com papel, dashboard, agenda, agendamentos). Portar as páginas e regras que faltam por camadas, na ordem de valor visível no preview.

## Fases

### Fase 1 — Base pronta (feito)
- Schema Supabase: `profiles`, `services`, `availability`, `bookings`, `transactions`, `reviews`, `notifications`, `user_roles` com RLS.
- Landing split-hero + card de agendamento, Header com seletor de cidade, Auth (cliente/diarista), Onboarding, Dashboard, Schedule, Bookings, Professionals, Professional profile.
- Rebrand Gersepa Solutions (paleta esmeralda/menta + destaque laranja).

### Fase 2 — Schema completo do Mocha (esta rodada, se aprovado)
Converter os 37 migrations SQLite para uma única migration Postgres consolidada, adicionando ao schema atual:
- `cities` (46 cidades ativas com slug/estado).
- `professional_services` com preço por metragem/duração, especialidades e tags.
- `professional_photos` (galeria).
- `credits` + `credit_transactions` (sistema de créditos que a diarista gasta para receber lead).
- `quick_bookings` (leads do "Agendamento Rápido" distribuídos para várias diaristas).
- `booking_offers` (aceite/recusa de um lead pela diarista).
- `admin_settings` (preço do crédito, comissões).
- Seeds das 46 cidades e categorias.
- Grants + RLS para cada tabela (owner-scoped + leitura pública onde faz sentido).

### Fase 3 — Rotas públicas espelhando o link
- `/` já existente — só ajustes finos.
- `/cidades` (grid das 46 cidades).
- `/cidades/$slug` (SEO por cidade: hero + lista de diaristas locais + reviews).
- `/profissionais` filtros por serviço/avaliação/cidade.
- `/profissional/$id` (galeria, serviços, avaliações, botão agendar/orçamento).
- `/agendamento-rapido` (formulário multi-step: cidade → tipo/tamanho → data → contato → confirmação).
- `/agendamento?pro=…` (agendamento direto com uma diarista).
- `/seja-diarista` (landing de captação).
- `/sobre`, `/contato`.

### Fase 4 — Área logada + créditos
- Dashboard cliente: pedidos, favoritos, avaliações.
- Dashboard diarista: leads recebidos, aceitar/recusar (gasta crédito), agenda, saldo.
- `/creditos` comprar créditos.
- Compra via **Mercado Pago** (Preferências + Webhook em `src/routes/api/public/webhooks/mercadopago.ts` com validação de assinatura, creditando saldo).
- Painel Admin: aprovar diaristas, ver leads, ajustar preço do crédito.

### Fase 5 — Extras
- Upload de fotos (Supabase Storage privado + signed URLs).
- Avaliações pós-serviço.
- Notificações in-app + email (transacional).
- SEO por cidade (head dinâmico + og:image).

## Detalhes técnicos

- Backend: **createServerFn** (não Edge Functions). Webhook Mercado Pago em `src/routes/api/public/`.
- Auth: já ativa (Supabase Auth). Google OAuth pelo broker Lovable.
- Créditos: transação atômica via função Postgres `spend_credit(user_id, booking_offer_id)` com `SECURITY DEFINER`.
- Distribuição de leads (Agendamento Rápido): função `dispatch_quick_booking(booking_id)` que cria N `booking_offers` para diaristas da cidade/serviço.
- Pagamentos: preferência criada em server fn; webhook público valida `x-signature` do Mercado Pago antes de creditar.

## O que precisa de você

1. Aprovar o plano.
2. Confirmar se posso **resetar o schema atual** para consolidar tudo em uma migration limpa (mais rápido e estável) — os dados de teste (Maria Silva) serão recriados.
3. Assim que aprovar a Fase 2, eu já submeto a migration para você aprovar no fluxo do Supabase e sigo com a Fase 3.

Se preferir cobrir tudo em uma rodada só, o custo em créditos será alto (várias dezenas de turnos). O caminho em fases entrega valor visível no preview a cada etapa.
