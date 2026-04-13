# CLAUDE.md — Grupo Grapiúna de Comunicação

> Este arquivo é o guia operacional do Claude Code para este projeto.
> A fonte de verdade completa está no vault Obsidian documentado abaixo.
> Leia as seções relevantes antes de qualquer alteração.

---

## Vault de Documentação

**Localização:** `C:\Users\Felipe\Documents\DEV\Obsidian\GrupoGrapiuna\GrupoGrapiuna\GrupoGrapiunaDoc`
**MCP Obsidian:** `http://localhost:22361/sse`
**MOC principal:** `Grupo Grapiúna de Comunicação.md`

O vault tem **32 arquivos** cobrindo toda a arquitetura, features e componentes.
Antes de qualquer tarefa não trivial, leia o(s) arquivo(s) correspondente(s).

---

## Mapa da Documentação por Tipo de Tarefa

### Quando for trabalhar em páginas públicas
| Tarefa | Ler no vault |
|--------|-------------|
| Página inicial | `Página Inicial.md` |
| Feed de notícias | `Portal de Notícias.md` |
| Artigo individual | `Detalhe da Notícia.md` |
| TV ao vivo / stream | `TV Ao Vivo.md` + `Chat Ao Vivo.md` |
| Podcasts | `Plataforma de Podcasts.md` |
| Portfólio Hub73 | `Hub73 Produtora.md` |
| Página de anúncios | `Mídia Kit.md` |

### Quando for trabalhar no painel admin
| Tarefa | Ler no vault |
|--------|-------------|
| Estrutura geral do admin | `Painel Administrativo.md` |
| CRUD de notícias | `Admin Notícias.md` |
| Grade de programação TV | `Admin Programação TV.md` |
| Banners publicitários | `Admin Anúncios.md` |
| Portfólio Hub73 | `Admin Hub73.md` |
| Episódios de podcast | `Admin Podcasts.md` |
| Vídeos YouTube | `Admin Vídeos YouTube.md` |
| Métricas e gráficos | `Analytics Dashboard.md` |

### Quando for trabalhar em infraestrutura / arquitetura
| Tarefa | Ler no vault |
|--------|-------------|
| Visão geral do sistema | `Arquitetura Geral.md` |
| Firebase / Firestore | `Configuração Firebase.md` + `Banco de Dados Firestore.md` |
| Autenticação e papéis | `Autenticação e Controle de Acesso.md` |
| Servidor Express | `Servidor Express.md` |
| Build / Vite / TypeScript | `Configuração de Build.md` |
| Upload de imagens | `Upload de Imagens.md` + `Integração Cloudinary.md` |

### Quando for trabalhar em componentes compartilhados
| Tarefa | Ler no vault |
|--------|-------------|
| Navegação | `Navbar.md` |
| Rodapé | `Footer.md` |
| Sistema de anúncios | `Sistema de Anúncios.md` |
| Hook de autenticação | `Hook de Autenticação.md` |
| Tipos globais | `Tipos TypeScript.md` |
| Erros Firestore | `Tratamento de Erros Firestore.md` |
| Analytics de acessos | `Rastreamento de Acessos.md` |

---

## Protocolo Obrigatório

### Antes de qualquer alteração
1. **Leia o arquivo do vault** correspondente ao módulo que vai alterar
2. **Leia o código** do(s) arquivo(s) relevante(s) antes de propor mudanças
3. Verifique se a mudança afeta **Firestore Rules** (`firestore.rules`) — alterações de schema exigem atualização das regras
4. Verifique se a mudança afeta **tipos globais** (`src/types.ts`) — novos campos precisam ser tipados

### Depois de qualquer alteração significativa
1. Se mudou schema do Firestore → atualize `Banco de Dados Firestore.md` no vault
2. Se criou novo componente → crie arquivo correspondente no vault seguindo o padrão
3. Se mudou comportamento de autenticação/permissão → atualize `Autenticação e Controle de Acesso.md`
4. Se mudou variáveis de ambiente → atualize `.env.example` e `Configuração de Build.md`
5. Se afetou o `Active Context` abaixo → atualize a seção correspondente neste arquivo

---

## Padrão de Documentação no Vault

Todo arquivo novo no vault deve seguir este formato:

```markdown
---
tags: [categorias relevantes]
relacionado: [[Arquivos conectados]]
status: ativo
tipo: feature | arquitetura | decisão | endpoint | componente
versao: 1.0.0
---

# Nome do Módulo

## Como funciona
## Arquivos principais
## Integrações
## Configuração
## Observações importantes
```

- Nome do arquivo: **PascalCase com espaços** (ex: `Meu Novo Módulo.md`)
- Use `[[wiki-links]]` para referenciar outros arquivos do vault
- Documente o **estado atual** — sem histórico de mudanças

---

## Arquitetura do Sistema

```
SPA React 19 + TypeScript
    ↓ (Firebase SDK direto — sem API REST intermediária)
Firestore (NoSQL, real-time)
    ↓ (onSnapshot listeners)
Componentes React (re-render reativo)

Express.js → apenas middleware dev/prod + /api/health + /api/news (mock)
Vercel → hospedagem + rewrites SPA
Cloudinary → storage de imagens (Firebase Storage não está em uso)
```

### Estrutura de pastas
```
src/
├── components/   # 25 componentes (páginas + admin + layout + utilitários)
├── hooks/        # useAuth.ts
├── lib/          # firestore-errors.ts, utils.ts
├── App.tsx       # Router + AccessTracker
├── firebase.ts   # init Firebase, signInWithGoogle, signOut
├── types.ts      # NewsPost, Podcast, Production, ScheduleItem, YouTubeVideo
└── index.css     # Tailwind + estilos globais
```

### Coleções Firestore (10)
| Coleção | Uso |
|---------|-----|
| `news` | Artigos de notícia |
| `tv_schedule` | Grade de programação semanal |
| `ads` | Banners publicitários (4 tamanhos) |
| `users` | Perfis e papéis (`admin`/`editor`/`user`) |
| `live_chat` | Mensagens do chat ao vivo |
| `hub73` | Projetos do portfólio Hub73 |
| `podcasts` | Episódios de podcast |
| `youtube_videos` | Metadados + contagem de views |
| `site_stats` | Analytics (doc único: `global`) |
| `live_config` | Status do stream (doc único: `current`) |

### Rotas da aplicação
```
/              → Página Inicial (Home.tsx)
/noticias      → Portal de Notícias (NewsPage.tsx)
/noticias/:id  → Detalhe da Notícia (NewsDetailPage.tsx)
/tv            → TV Ao Vivo (TVPage.tsx)
/podcasts      → Plataforma de Podcasts (PodcastPage.tsx)
/hub73         → Hub73 Produtora (Hub73Page.tsx)
/anuncie       → Mídia Kit (MidiaKitPage.tsx)
/midia-kit     → Mídia Kit (mesmo componente)
/admin         → Painel Administrativo (AdminDashboard.tsx) [protegido]
```

---

## Comandos Essenciais

```bash
# Desenvolvimento
npm run dev          # Express + Vite HMR (porta 3000)

# Build e qualidade
npm run build        # Build de produção → dist/
npm run preview      # Preview do build em localhost
npm run lint         # TypeScript type-check (não bloqueia build)
npm run clean        # Remove dist/

# Firebase
firebase deploy      # Deploy das Firestore Rules
firebase emulators:start  # Emuladores locais (se configurado)
```

---

## Regras Críticas

### Nunca fazer
- **Não usar Firebase Storage** — imagens sempre vão para Cloudinary
- **Não criar rotas REST no Express** para dados — o SDK do Firebase é usado direto no frontend
- **Não remover o `databaseId`** na inicialização do Firestore — o projeto usa instância não padrão
- **Não hardcodar emails de admin** em novos lugares — já existem em `firestore.rules` e `useAuth.ts`
- **Não commitar `firebase-applet-config.json`** em repositórios públicos

### Sempre fazer
- **Usar `serverTimestamp()`** para campos `createdAt`/`updatedAt` — nunca `new Date()`
- **Usar `increment()`** para contadores no Firestore — nunca ler-incrementar-escrever
- **Verificar `loading`** do `useAuth` antes de renderizar conteúdo protegido
- **Usar `handleFirestoreError()`** em todos os catch blocks de operações Firestore
- **Usar o alias `@/`** para imports absolutos (aponta para raiz do projeto, não `src/`)
- **Aplicar `rel="noopener noreferrer"`** em todos os links externos com `target="_blank"`

### Autenticação
- Somente Google OAuth — não implementar login por email/senha
- Papel (`role`) vem do Firestore (`users/{uid}`), não do token JWT
- Dupla verificação: client-side via `useAuth` + server-side via Firestore Rules
- Se `users/{uid}` não existir → papel padrão é `user` (sem acesso admin)

### Banners de anúncio
- Quatro tamanhos: `leaderboard` (970×90), `sidebar` (300×250), `mobile` (320×50), `cover`
- Componente `AdBanner` seleciona aleatoriamente entre anúncios ativos do tamanho/página
- Anúncios inativos (`active: false`) **nunca** são exibidos

### Firestore Rules
- Qualquer novo campo obrigatório em escrita precisa ser adicionado às rules
- Regras atuais validam: campos obrigatórios, tamanhos máximos, ownership de userId no chat
- Deploy de rules: `firebase deploy --only firestore:rules`

---

## Lacunas de Documentação Identificadas

Estas funcionalidades existem mas têm limitações não resolvidas — considerar antes de expandir:

| Área | Lacuna |
|------|--------|
| **Newsletter** | Formulário visual sem backend — não envia emails |
| **Mídia Kit** | Formulário de proposta sem backend — não envia dados |
| **Chat** | Sem moderação, sem rate limiting, sem banimento de usuários |
| **Podcasts** | Sem player embutido — links para plataformas externas |
| **YouTube Videos** | Sem sync automático com YouTube Data API — entrada manual |
| **Analytics** | `site_stats` cresce indefinidamente — sem compressão/arquivamento |
| **Cloudinary** | Upload unsigned — sem controle de acesso por arquivo |
| **Imagens deletadas** | Excluir documento Firestore não remove imagem do Cloudinary |
| **Usuários novos** | Sem trigger automático para criar `users/{uid}` no Firestore |
| **Índices Firestore** | Índices compostos não documentados — podem ser necessários em queries complexas |

---

## Active Context

> Atualizar manualmente a cada sessão de trabalho relevante.

```
Última atualização: 2026-04-12
Branch ativa: main
Status do build: limpo (sem alterações pendentes)

Em andamento:
- (nenhuma tarefa em andamento)

Próximos passos conhecidos:
- (nenhum definido)

Decisões recentes:
- Documentação inicial do vault criada (32 arquivos)
- CLAUDE.md gerado a partir do vault
```
