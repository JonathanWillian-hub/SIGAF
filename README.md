# SIGAF, Sistema de Registro e Gestão de Atividades Funcionais

> Solução centralizada, confiável e padronizada para o registro, rastreamento e gestão de substituições e atividades funcionais. Desafio SAGA SENAI, Análise e Desenvolvimento de Sistemas, 2026.

Equipe: Gabriel Morais Pinto, Jonathan Willian de Paula Santos, Kauê Alexandre Souza, Micael Silva Domiciano e Miguel Viana Laube.

**Orientador:** Prof.º Wesley Fioreze.

![Dashboard do gestor](docs/evidencias/09-rf05-dashboard-gestor.png)

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|---|---|
| Back-end / API REST | **Node.js** 20+, Express 5, JWT, bcrypt e Helmet |
| Front-end | **Vue.js 3**, Vite, Vue Router, Pinia, GSAP (animações) e Lucide Icons |
| Banco de dados | **PostgreSQL no Supabase** (driver `pg`); PGlite para desenvolvimento local |
| Relatórios | PDFKit (PDF), ExcelJS (Excel) e CSV |
| Testes | `node:test` + Supertest (44 testes) |

## 🧩 Arquitetura

```
SIGAF/
├── backend/                  API REST (Node.js + Express)
│   ├── src/
│   │   ├── domain/           Classes do Diagrama de Classes (Usuario, Setor, Disciplina,
│   │   │                     RegistroAtividade, Relatorio + enums PerfilUsuario/CategoriaAtividade)
│   │   ├── modules/          Um módulo por componente dos diagramas de sequência
│   │   │   ├── auth/           Serviço de Autenticação e Controle de Acesso (RF05)
│   │   │   ├── apontamentos/   Sistema de Apontamentos (RF01)
│   │   │   ├── registros/      Sistema/API de Registros (RF02, RF03)
│   │   │   ├── homologacao/    Pendentes de Homologação (aprovar/rejeitar)
│   │   │   ├── relatorios/     Módulo + Processador de Relatórios (RF04)
│   │   │   ├── dashboard/      Painel Centralizado (RF05)
│   │   │   ├── notificacoes/   Serviço de Notificação (sistema + e-mail opcional)
│   │   │   ├── auditoria/      Logs auditáveis (RNF06)
│   │   │   └── cadastros/      Usuários, setores e disciplinas
│   │   ├── middlewares/      autenticar / autorizar (Serviço de Autorização), tempo de resposta
│   │   ├── database/         schema.sql (igual ao banco do Supabase) + setup.js (dados de demonstração)
│   │   └── utils/            criptografia AES-256-GCM, gerador de certificado HTTPS
│   └── tests/                testes de unidade e de integração
├── frontend/                 Interface web (Vue.js 3)
│   └── src/
│       ├── views/            Login, Dashboard, Atividades, Novo Registro, Substituições,
│       │                     Homologação, Relatórios, Auditoria, Cadastros
│       ├── components/       Layout (menu lateral do protótipo), cartões, modais…
│       └── domain/           RegistroAtividade.js (mesmas validações do back-end)
└── docs/
    ├── evidencias/           Prints do sistema funcionando + saídas de teste
    ├── EVIDENCIAS.md         O que cada print comprova
    └── RASTREABILIDADE.md    Matriz de requisito, código, teste e evidência
```

## ▶️ Como rodar

**Pré-requisitos:** Node.js 20 ou superior. O banco de dados é o PostgreSQL do **Supabase** (projeto SIGAF, organização JonathanWillian-hub), onde as tabelas já estão criadas.

```bash
# 1) Back-end
cd backend
npm install
cp .env.example .env          # cole em DATABASE_URL a string de conexão do Supabase (veja abaixo)
npm start                     # API em http://localhost:3333
```

**Como pegar a string de conexão:** no painel do Supabase, abra o projeto SIGAF, clique em **Connect**, escolha **Session pooler** e copie a URI. Troque `[YOUR-PASSWORD]` pela senha do banco. Se a senha tiver símbolos, eles precisam ir codificados na URL (`%` vira `%25`, `!` vira `%21`, `@` vira `%40`, `#` vira `%23`, `$` vira `%24`). Peça a string pronta para quem já tem o projeto rodando.

```bash
# 2) Front-end (em outro terminal)
cd frontend
npm install
npm run dev                   # interface em http://localhost:5173
```

**Acessos de demonstração** (senha `Sigaf@2026` para todos):

| Perfil | E-mail | O que vê |
|---|---|---|
| Colaborador | `colaborador@sigaf.com` | só os próprios registros |
| Gestor | `gestor@sigaf.com` | registros da equipe (Logística & Expedição), homologação, relatórios e criação de contas de colaboradores da equipe |
| Administrador | `admin@sigaf.com` | tudo + cadastros e auditoria |

### Outros comandos

```bash
npm run db:seed               # (em backend/) insere os dados de demonstração; só funciona com as tabelas vazias
npm run db:local              # (em backend/) sobe um PostgreSQL local (PGlite) para trabalhar sem internet
npm run db:setup              # (em backend/) recria as tabelas e os dados; só aceita o banco local
npm run db:migrar             # (em backend/) adiciona as colunas novas (perfil) num banco que já existe, sem apagar dados
npm test                      # (em backend/) roda os 44 testes; use o banco local, porque eles gravam dados
npm run gerar-certificado     # (em backend/) gera certificado autoassinado; depois HTTPS_ENABLED=true no .env
```

## ✅ Requisitos atendidos

| Requisito | Onde está |
|---|---|
| **RF01** Registro de atividades e substituições | Tela *Novo Registro* com escolha da categoria (4 opções) e depois o formulário; botão **Cancelar** descarta os dados (A1) |
| **RF02** Detalhamento da atividade | Executor, profissional substituído, data, início/fim, setor, disciplina e tarefas; campos vazios ficam **em vermelho** (A1) e fim antes do início gera **alerta** (A2); “Registro salvo com sucesso” |
| **RF03** Consulta de histórico | Tela *Atividades*: filtros por data, profissional, setor, tipo e status, detalhes completos; “Nenhum registro encontrado para os filtros informados” + *Limpar busca* (A1) |
| **RF04** Relatórios e prestação de contas | Tela *Relatórios*: período, setor, profissional e formato (PDF, Excel ou CSV) com download automático; acima de 100 registros vai para **segundo plano** e notifica quando pronto (A1) |
| **RF05** Painel centralizado | Login leva ao *Dashboard* com resumo, atalhos “Novo Registro” e “Consultar Histórico”; visão por perfil (A1) |
| Meu perfil | Tela *Meu perfil* para todos: foto, nome, e-mail, matrícula, CPF (mascarado, com opção de mostrar), telefone, perfil de acesso, cargo, setor e situação da conta; troca de senha, avisos por e-mail e resumo das próprias atividades e últimos acessos |
| Homologação (diagrama de sequência) | Tela *Homologação*: aprovar ou rejeitar com justificativa; colaborador é notificado |
| **RNF01** Segurança | HTTPS opcional (certificado + HSTS), CPF criptografado com **AES-256-GCM**, senhas com bcrypt, JWT |
| **RNF02** Disponibilidade | `GET /api/health` para monitoramento de uptime |
| **RNF03** Tempo de resposta ≤ 2 s | Cabeçalho `X-Response-Time` em toda resposta, índices no banco, relatórios grandes assíncronos |
| **RNF04** Responsividade | Layout adapta para celular (menu vira barra inferior) |
| **RNF05** Modularidade / API REST | Um módulo por componente; API REST documentada abaixo |
| **RNF06** Auditabilidade | Tabela `logs_auditoria` (usuário, data/hora, ação) gravada na mesma transação; tela *Auditoria* |
| **RN01** Obrigatoriedade | Validada no front-end **e** na API |
| **RN02** Escopo MVP | Integrações externas ficaram fora (apenas preparadas via API REST) |

Detalhes e prints em [docs/EVIDENCIAS.md](docs/EVIDENCIAS.md). Matriz completa em [docs/RASTREABILIDADE.md](docs/RASTREABILIDADE.md).

## 🔌 API REST

Todas as rotas (exceto login e health) exigem `Authorization: Bearer <token>`.

| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| POST | `/api/auth/login` | público | Autentica e devolve token + perfil |
| GET | `/api/auth/me` | todos | Usuário logado |
| GET | `/api/apontamentos/categorias` | todos | Categorias de registro (RF01) |
| GET | `/api/apontamentos/formulario?categoria=` | todos | Habilita o formulário da categoria (RF01) |
| GET | `/api/registros` | todos* | Histórico com filtros e paginação (RF03) |
| GET | `/api/registros/:id` | todos* | Detalhe do registro |
| POST / PUT / DELETE | `/api/registros[/:id]` | todos* | Criar / alterar / excluir (RF02) |
| GET | `/api/homologacao/pendentes` | gestor, admin | Registros pendentes |
| PATCH | `/api/homologacao/:id` | gestor, admin | `{ decisao: APROVAR \| REJEITAR, justificativa }` |
| GET | `/api/relatorios/parametros` | gestor, admin | Setores, profissionais e formatos |
| POST | `/api/relatorios` | gestor, admin | Gera relatório (201 = pronto, 202 = segundo plano) |
| GET | `/api/relatorios/:id/arquivo` | gestor, admin | Download do arquivo |
| GET | `/api/dashboard?dias=7\|30\|90` | todos* | Dados do painel (RF05) |
| GET / PATCH | `/api/notificacoes` | todos | Notificações do usuário |
| GET | `/api/auditoria` | gestor, admin | Logs de auditoria |
| GET / POST / PUT | `/api/cadastros/{usuarios,setores,disciplinas}` | admin (leitura liberada) | Cadastros |
| GET / PUT | `/api/perfil` | todos | Dados do próprio usuário, resumo, telefone e avisos por e-mail |
| GET | `/api/perfil/cpf` | todos | CPF completo do próprio usuário |
| PUT | `/api/perfil/foto` | todos | Envia ou remove a foto (JPG, PNG ou WEBP, reduzida para 256 px) |
| PUT | `/api/perfil/senha` | todos | Troca a senha (exige a senha atual) |
| GET | `/api/health` | público | Disponibilidade |

\* o resultado é recortado pelo perfil: colaborador vê os próprios registros, gestor vê a equipe do seu setor, administrador vê tudo.

## 🚀 Publicar na Vercel

**Sistema no ar:** https://sigaf-coral.vercel.app (projeto `sigaf` na Vercel do Micael, ligado ao Supabase do projeto SIGAF).

O repositório já vem pronto para a Vercel publicar as telas e a API juntas: o [vercel.json](vercel.json) compila o front-end e transforma a API Express em uma função serverless ([api/index.js](api/index.js)).

**Publicar uma versão nova** (com o CLI logado na conta dona do projeto):

```bash
npx vercel deploy --prod
```

**Criar o projeto em outra conta:** crie o projeto antes com `npx vercel project create NOME` e depois rode `npx vercel link --yes --project NOME`. Se o projeto for criado pelo assistente da Vercel, ele detecta sozinho dois serviços (`frontend` e `backend`) e recusa o `vercel.json`; nesse caso, em Settings, deixe o Framework Preset como **Other**. Configuração no projeto da Vercel:

1. **Settings > Build and Deployment:** deixe o **Root Directory** vazio (raiz do repositório) e o **Framework Preset** como **Other**. Os comandos de instalação e de build vêm do `vercel.json`.
2. **Settings > Environment Variables** (marque Production e Preview):

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | String do Supabase em **Transaction pooler** (porta **6543**), com a senha codificada como no `.env` |
   | `DB_POOL_MAX` | `10` |
   | `JWT_SECRET` | Um texto aleatório longo, por exemplo o resultado de `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `ENCRYPTION_KEY` | **A mesma** usada no `backend/.env` quando os dados foram inseridos. Com outra chave os CPFs não abrem e o login falha |
   | `REPORT_ASYNC_THRESHOLD` | `100` (opcional) |

3. **Região das funções:** o `vercel.json` usa `pdx1` (Oregon, EUA), a mesma região do banco no Supabase. Se o banco mudar para São Paulo, troque para `"regions": ["gru1"]`.
4. Faça um novo deploy (Deployments > Redeploy) e teste em `https://SEU-PROJETO.vercel.app/api/health`, que deve responder `{"status":"ok","banco":"ok"}`.

Na Vercel os relatórios ficam na pasta temporária da função. Se o download cair numa instância que não tem o arquivo, ele é gerado de novo com os mesmos filtros.

## 🗄️ Banco de dados no Supabase

- As tabelas ficam no schema `public` do projeto **SIGAF** (organização JonathanWillian-hub). A estrutura está em [backend/src/database/schema.sql](backend/src/database/schema.sql).
- A API conecta direto no Postgres pela `DATABASE_URL` (Session pooler). O front-end nunca acessa o banco, só a API.
- **Segurança (RNF01):** o RLS (Row Level Security) está ligado nas 7 tabelas e não há políticas de acesso público. Na prática, a chave pública (`anon`) do Supabase não lê nem grava nada; só a API do SIGAF, que conecta como dona das tabelas, acessa os dados. Ao criar uma tabela nova, ligue o RLS nela também (`ALTER TABLE nome ENABLE ROW LEVEL SECURITY;`).

## 📝 Ajustes em relação ao documento

Pontos em que o código precisou ir um pouco além do diagrama de classes para atender aos fluxos descritos (sugerimos atualizar o diagrama na próxima versão da ERS):

1. **`RegistroAtividade`** ganhou `status` (PENDENTE / HOMOLOGADO / REJEITADO), `justificativa`, `homologadoPor` e `homologadoEm`, exigidos pelo diagrama de sequência de homologação, mas ausentes no diagrama de classes.
2. **`Usuario`** ganhou `senhaHash` (necessário para `autenticar()`) e `setor` (lotação), necessário para `Setor.listarProfissionais()` e para o gestor ver “a equipe sob sua supervisão” (RF05 A1).
3. **`Relatorio`** ganhou filtro opcional de `profissional` (RF04 pede “Profissional específico”) e o formato **CSV** (citado no caso de uso de Geração de Relatórios).
4. Foram criadas as tabelas `notificacoes` (Serviço de Notificação) e `logs_auditoria` (RNF06).
5. O limite para o relatório ir para segundo plano é configurável (`REPORT_ASYNC_THRESHOLD`, padrão 100 registros).
6. O envio de e-mail do Serviço de Notificação funciona se as variáveis `SMTP_*` forem preenchidas; sem elas, as notificações aparecem só no sino do sistema.
