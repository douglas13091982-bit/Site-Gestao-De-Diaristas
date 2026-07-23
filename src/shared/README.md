# src/shared

Utilitários e componentes reutilizáveis, independentes de rota ou domínio.

- `lib/` — funções puras (formatação, validação, tipos, constantes).
- `hooks/` — hooks de infraestrutura (ViaCEP, upload de imagem).
- `components/` — blocos de UI compostos.

Dependência unidirecional: routes → features → shared → integrations.
