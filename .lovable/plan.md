# Refatoração — Clean Code + SOLID

Objetivo: reduzir arquivos gigantes, quebrar responsabilidades e centralizar lógica repetida, **sem mudar UX nem regras de negócio**. Foco nos maiores ofensores (`cadastro.tsx` 733 linhas, `agendamento.tsx` 710, `index.tsx` 496, telas de admin 200-400 linhas cada) e nos padrões duplicados que já vimos surgir por todo o app.

## Diagnóstico dos principais problemas

- **God components**: `cadastro.tsx` mistura validação de senha, ViaCEP, upload/compressão de foto, disponibilidade semanal, submissão a Supabase, gestão de regiões e categorias — tudo num único componente com 28 estados.
- **`agendamento.tsx`** funde wizard de 4 passos, geração PIX, polling de status, tokenização de cartão, cálculo de preço e criação de booking.
- **Lógica duplicada** em várias telas: fetch de perfil autenticado, upload de imagem WebP, formatação de moeda/CPF/telefone, chamadas Supabase com tratamento de erro repetido, componentes de "loading/empty state".
- **Regras de negócio no JSX**: cálculo de comissão, valor líquido, checagem de suspensão e slugs de cidade aparecem inline em componentes.
- **Acoplamento a Supabase** direto nas telas dificulta teste e viola DIP (dependência da implementação, não da abstração).
- **Ciclomática alta** em handlers `submit`/`onNext` com cadeias de `if` para validação.

## Estrutura alvo

```text
src/
  features/
    auth/               login, cadastro, reset-password
      components/       PasswordChecklist, RoleTabs, TermsFooter
      hooks/            use-password-policy.ts, use-signup-form.ts
      services/         auth.service.ts (wrap Supabase auth)
      validators/       signup.schema.ts (zod)
    booking/
      components/       StepService, StepAddress, StepSchedule, StepPayment
      hooks/            use-booking-wizard.ts, use-pix-polling.ts
      services/         booking.service.ts, payment.service.ts
      utils/            price.ts (comissão, líquido)
    professionals/      listagem, perfil público, onboarding
    admin/              agrupa sub-telas admin
    client-area/        cliente.* rotas
    pro-area/           pro.* rotas
  shared/
    ui/                 (mantém shadcn em components/ui)
    components/         EmptyState, LoadingBlock, FormField, AddressFields, AvailabilityGrid, PhotoUploader
    hooks/              use-viacep.ts, use-image-upload.ts, use-profile.ts
    lib/                format.ts (money/cpf/phone/date), result.ts (Ok/Err), guards.ts
    validators/         address.schema.ts, cpf.schema.ts
  integrations/supabase (intocado — auto-gerado)
  routes/               apenas file-based routing chamando features/*
```

Rotas passam a ser **thin controllers**: fazem `createFileRoute`, importam o componente da feature e delegam. Regra: nenhum arquivo em `src/routes/*` acima de ~120 linhas.

## Aplicação dos princípios SOLID

- **SRP**: cada arquivo faz uma coisa. Ex.: `use-viacep.ts` só busca CEP; `PhotoUploader` só faz upload+compressão; `price.ts` só calcula comissão.
- **OCP**: `payment.service.ts` expõe interface `PaymentProvider` com implementações `MercadoPagoProvider` e `PagSeguroProvider` — adicionar novo gateway não altera o checkout.
- **LSP**: componentes de step do wizard implementam o mesmo contrato `{ value, onChange, onNext, onBack }` e são intercambiáveis.
- **ISP**: hooks retornam apenas o que a tela consome (evitar mega-objetos como `useBookingWizard()` devolvendo 30 campos — dividir em `useBookingDraft`, `usePricing`, `useSlots`).
- **DIP**: telas dependem de `bookingService`/`authService`, não de `supabase` diretamente. Facilita mock em teste.

## Redução de complexidade ciclomática

- **Validação via zod** substitui cadeias de `if (!x) return toast(...)`. Um único `schema.safeParse(data)` devolve todos os erros; handler fica linear.
- **Early return + guard clauses** nos handlers restantes.
- **Lookup maps** no lugar de `switch`/`if` (ex.: mapa `role → redirect`, `provider → checkoutComponent`).
- **Extração de sub-componentes**: cada passo do wizard vira componente próprio → handler pai reduz de ~15 branches para 3.
- **`Result<T, E>`** helper para tratamento uniforme de erro Supabase, eliminando `try/catch` repetidos.

## Padrões Clean Code aplicados

- Nomes intencionais: `busy` → `isSubmitting`, `nav` → `navigate`, `t` → `role`.
- Constantes nomeadas: strings mágicas (`'professional'`, `'client'`, `'pending'`) viram enums/const objects em `shared/lib/constants.ts`.
- Funções pequenas (~20 linhas) com um nível de abstração.
- Componentes puros separados de containers com side-effects.
- Comentários apenas para "porquê", não "o quê".

## Execução em fases (para revisão incremental e zero regressão)

1. **Fundação compartilhada** — criar `shared/lib/format.ts`, `shared/lib/result.ts`, `shared/hooks/use-viacep.ts`, `shared/hooks/use-image-upload.ts`, `shared/components/{PhotoUploader,AddressFields,AvailabilityGrid,PasswordChecklist,EmptyState,LoadingBlock}`. Nenhum consumidor mudado ainda.
2. **Auth/Cadastro** — extrair `features/auth/*`, migrar `cadastro.tsx`, `auth.tsx`, `reset-password.tsx`. Meta: `cadastro.tsx` cair de 733 → ~80 linhas.
3. **Booking** — quebrar `agendamento.tsx` em 4 steps + `use-booking-wizard` + `payment.service`. Meta: <120 linhas na rota.
4. **Áreas logadas (cliente/pro)** — consolidar fetch de perfil, cards de agendamento, upload de avatar.
5. **Admin** — extrair `admin/*` para `features/admin/`, reaproveitar `DataTable`, `SettingsForm`, `SecretField`.
6. **Limpeza final** — remover código morto, alinhar imports para `@/features/...`, rodar typecheck e smoke-test em cada rota crítica (login, cadastro cliente, cadastro pro, agendamento com PIX, aceitar lead, admin/configurações).

Cada fase entra separada, com o app funcionando ao final de cada uma.

## Garantias de "não altera funcionalidade"

- Nenhuma migration SQL, nenhuma edge function, nenhuma mudança em `integrations/supabase/*`.
- Textos, layouts, cores, rotas e comportamentos permanecem idênticos.
- Se alguma incongruência aparecer durante extração (bug latente), eu **paro e reporto** antes de "consertar em silêncio".

## Detalhes técnicos

- Adicionar `zod` (já usado indiretamente) para schemas de formulário.
- Path alias `@/features/*` e `@/shared/*` no `tsconfig.json` + `vite.config.ts`.
- Manter `src/routes/` como única fonte de rotas (TanStack file-based). Componentes da feature são importados pelas rotas — nunca o inverso.
- Regras: proibido `supabase` direto em `src/routes/**`; toda chamada passa por `services/`.
- ESLint: adicionar `max-lines-per-function: 60`, `complexity: 10` como warn para prevenir regressão.

Se aprovar, começo pela Fase 1 (fundação compartilhada) — é a base sem risco e destrava as demais.
