## BabyClean — Reconstrução do zero

Você escolheu "começar do zero". Vou apagar o projeto Gersepa atual e reconstruir como BabyClean, marketplace de diaristas com pagamentos via Mercado Pago.

**Aviso de escopo:** o spec cobre ~30 features (geo, escrow, disputas, seguro, auditoria, PWA, WhatsApp API, SendGrid, admin completo). Isso é trabalho de dezenas de turnos. Vou entregar em fases; cada fase deixa o preview funcional. Esta primeira fase entrega o esqueleto sólido.

---

### Fase 1 (agora) — Fundação + Rebrand + Onboarding + Agenda + Busca

#### 1.1 Limpeza
- Remover: `src/routes/index.tsx`, `_authenticated/dashboard.tsx`, `_authenticated/bookings.$bookingId.tsx`, `cities.tsx`, `professionals.tsx`, `quick-booking.tsx`, `auth.tsx`.
- Manter: `__root.tsx`, `_authenticated/route.tsx`, `use-auth.tsx`, integrações Supabase, error boundary.

#### 1.2 Schema Supabase (migration única, com sua aprovação)
Reset do schema `public` e recriação:

```text
profiles       (id→auth.users, role, full_name, avatar_url, phone, bio,
                city, state, address, lat, lng, service_radius_km,
                rating_avg, rating_count, is_verified)
services       (id, worker_id→profiles, title, description, base_price,
                duration_min, is_active)
availability   (id, worker_id, day_of_week 0-6, start_time, end_time,
                is_active)
bookings       (id, client_id, worker_id, service_id, scheduled_at,
                duration_min, address, lat, lng, status, total_price,
                platform_fee, worker_payout, notes,
                checkin_at, checkout_at, checkin_lat, checkin_lng)
transactions   (id, booking_id, provider='mercadopago', provider_ref,
                amount, status, paid_at, released_at, refunded_at)
reviews        (id, booking_id, reviewer_id, reviewee_id, rating 1-5,
                comment, created_at)
notifications  (id, user_id, type, title, body, data jsonb, read_at)
user_roles     (id, user_id, role enum: admin|worker|client)
```

- Enum `booking_status`: requested → confirmed → in_progress → completed → reviewed | cancelled.
- Função `has_role(uuid, app_role)` SECURITY DEFINER (já existe, reaproveito).
- RLS em tudo: cliente vê o próprio; profissional vê próprio + bookings onde é worker; admin via `has_role`.
- Trigger `handle_new_user` cria profile + role padrão `client`.
- GRANTs conforme regra (authenticated + service_role; anon apenas em `services`/`profiles` públicos de workers verificados).
- Trigger `updated_at`.
- Índices em `bookings(worker_id, scheduled_at)`, `profiles(city, role)`, `availability(worker_id, day_of_week)`.

#### 1.3 Rebrand BabyClean
- `src/styles.css`: paleta azul suave (#3b82f6) + verde menta (#10b981) + branco; tipografia Inter via Google Fonts no `__root.tsx`.
- `__root.tsx`: título "BabyClean — Diaristas verificadas", meta, favicon.
- Novo `Header` compartilhado (nav + login/painel/sair).

#### 1.4 Rotas públicas
- `/` — landing (hero azul/menta, como funciona, cidades, CTA cadastro cliente/profissional).
- `/auth` — login/cadastro **com escolha de role** (Cliente ou Profissional) no signup. Google + email.
- `/professionals` — busca com filtros na URL: cidade, preço máx, nota mín, data (Zod `validateSearch`, TanStack Query, paginação).
- `/professionals/$id` — perfil público: bio, serviços, agenda, reviews, botão "Agendar" (redireciona para `/auth` se guest).

#### 1.5 Rotas autenticadas
- `_authenticated/onboarding.tsx` — completa perfil pós-signup (nome, telefone, cidade, endereço; se worker: bio, raio, verificação pendente).
- `_authenticated/dashboard.tsx` — split por role (cliente vê próximos serviços; worker vê solicitações + agenda; admin vê KPIs simples).
- `_authenticated/schedule.tsx` (worker) — CRUD de `availability` (grid dia da semana × horário) e `services` (título, preço, duração).
- `_authenticated/bookings.tsx` — lista de agendamentos do usuário (filtros + status).

#### 1.6 Server functions (createServerFn + requireSupabaseAuth)
- `searchProfessionals` (público)
- `getProfessional` (público)
- `saveAvailability`, `saveService` (worker)
- `createBooking` (client) — valida conflito com availability + bookings existentes
- `updateBookingStatus` (worker/admin)

---

### Fases futuras (não entram nesta rodada)

- **Fase 2** — Mercado Pago Checkout + webhook `/api/public/webhooks/mercadopago` + escrow (release 24h após checkout).
- **Fase 3** — Google Maps (autocomplete endereço + Distance Matrix para raio de atendimento + check-in georreferenciado).
- **Fase 4** — Sistema de avaliação 360°, notificações in-app (bell) e push (web-push já configurado).
- **Fase 5** — Painel admin completo (moderação, disputas com chat, exportação CSV/PDF, logs de auditoria).
- **Fase 6** — WhatsApp Business API, SendGrid, PWA offline, otimizações CDN.

---

### Antes de começar preciso confirmar

1. **Mercado Pago agora?** Não. Fica na Fase 2. Nesta fase o botão "Agendar" cria o booking com status `requested` sem cobrar.
2. **Preciso da sua credencial Mercado Pago (`MERCADOPAGO_ACCESS_TOKEN`) só quando chegarmos na Fase 2** — não peço agora.

Se aprovar o plano, executo Fase 1 completa (migration + código) no próximo turno.
