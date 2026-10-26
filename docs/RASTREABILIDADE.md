# Matriz de Rastreabilidade do SIGAF

| Requisito | Back-end | Front-end | Teste automatizado | Evidência |
|---|---|---|---|---|
| RF01 Registro de atividades e substituições | `modules/apontamentos/apontamentos.routes.js` (categorias, formulário) | `views/NovoRegistroView.vue` (etapa 1) | `api.test.js`: lista as 4 categorias | 03, 08 |
| RF01 A1 Cancelamento | `domain/RegistroAtividade.js#cancelar` | `domain/RegistroAtividade.js#cancelar` + `NovoRegistroView#cancelar` | `unidade.test.js`: cancelar() descarta | 08 |
| RF02 Detalhamento | `domain/RegistroAtividade.js#validar/#salvar`, `modules/registros/registros.routes.js` (POST/PUT) | `views/NovoRegistroView.vue` (etapa 2) | `api.test.js`: registro válido é salvo | 05, 06 |
| RF02 A1 Campos obrigatórios | `RegistroAtividade#validar` (422 + campos) | classe `.campo.erro` (vermelho) | `unidade.test.js` + `api.test.js`: A1 | 04 |
| RF02 A2 Inconsistência de horário | `RegistroAtividade#validarHorarios` + CHECK no banco | alerta “Inconsistência de horário” | `unidade.test.js` + `api.test.js`: A2 | 05 |
| RF03 Consulta de histórico | `modules/registros/registros.repository.js` (filtros), GET `/registros`, `/registros/:id` | `views/AtividadesView.vue`, `components/RegistroDetalhe.vue` | `api.test.js`: filtro por categoria | 07, 10 |
| RF03 A1 Nenhum registro | mensagem na resposta da API | estado vazio + “Limpar busca” | `api.test.js`: A1 nenhum registro | 11 |
| RF04 Relatórios | `domain/Relatorio.js#solicitarGeracao/#baixarArquivo`, `modules/relatorios/processador.js` | `views/RelatoriosView.vue` | `api.test.js`: volume normal | 16, 17 |
| RF04 A1 Segundo plano | `Relatorio#solicitarGeracao` (202 + `setImmediate` + notificação) | aviso + status “Processando” | `api.test.js`: volume excedente (202) | 19, 20 |
| RF05 Painel centralizado | `modules/dashboard/dashboard.routes.js` | `views/DashboardView.vue` | `api.test.js`: login devolve perfil | 02, 09, 18 |
| RF05 A1 Visão por perfil | `domain/Usuario.js#visualizarDashboard` | textos de escopo no painel | `unidade.test.js`: visualizarDashboard; `api.test.js`: gestor só vê equipe | 02, 09, 18 |
| Homologação (DS) | `modules/homologacao/homologacao.routes.js` | `views/HomologacaoView.vue` | `api.test.js`: Homologação + notificação | 12-15 |
| RNF01 Segurança | `utils/criptografia.js` (AES-256-GCM), bcrypt, JWT, `server.js` (HTTPS), Helmet/HSTS | token no `services/api.js` | `unidade.test.js`: Criptografia | 22, evidencias-backend.txt |
| RNF02 Disponibilidade | `GET /api/health` | Não se aplica | Não se aplica | evidencias-backend.txt |
| RNF03 Tempo de resposta | `middlewares/comuns.js#tempoResposta`, índices em `schema.sql` | Não se aplica | `api.test.js`: < 2 segundos | evidencias-backend.txt |
| RNF04 Responsividade | Não se aplica | `style.css`, `AppLayout.vue` (media queries) | Não se aplica | 24, 25 |
| RNF05 Modularidade / REST | `src/modules/*`, `app.js` | `services/api.js` | Não se aplica | README (tabela da API) |
| RNF06 Auditoria | `modules/auditoria/auditoria.service.js` (mesma transação), tabela `logs_auditoria` | `views/AuditoriaView.vue` | `api.test.js`: homologação na auditoria | 21 |
| RN01 Obrigatoriedade | `RegistroAtividade#validar` | `domain/RegistroAtividade.js#validar` | `unidade.test.js` | 04 |
| RN02 Escopo MVP | integrações externas não implementadas | Não se aplica | Não se aplica | Não se aplica |

## Do diagrama de classes para o código

| Classe (ERS) | Arquivo | Métodos do diagrama |
|---|---|---|
| `Usuario` | `backend/src/domain/Usuario.js` | `autenticar(): boolean`, `visualizarDashboard()` |
| `Setor` | `backend/src/domain/Setor.js` | `listarProfissionais(): list` |
| `Disciplina` | `backend/src/domain/Disciplina.js` | Não se aplica |
| `RegistroAtividade` | `backend/src/domain/RegistroAtividade.js` (+ espelho no front) | `validarHorarios(): boolean`, `salvar(): boolean`, `cancelar(): void` |
| `Relatorio` | `backend/src/domain/Relatorio.js` | `solicitarGeracao(): void`, `baixarArquivo(): byte[]` |
| `<<enum>> PerfilUsuario`, `<<enum>> CategoriaAtividade` | `backend/src/domain/enums.js` | Não se aplica |

## Dos diagramas de sequência para o código

| Participante do diagrama | Implementação |
|---|---|
| Interface de Apontamentos / Formulário de Atividade | `frontend/src/views/NovoRegistroView.vue` |
| Sistema de Apontamentos | `backend/src/modules/apontamentos` |
| Sistema de Registro / API de Registros | `backend/src/modules/registros` |
| Serviço de Autorização / Autenticação e Controle de Acesso | `backend/src/middlewares/autenticacao.js` + `modules/auth` |
| Módulo de Relatórios / Processador de Relatórios | `frontend/src/views/RelatoriosView.vue` / `backend/src/modules/relatorios/processador.js` |
| Interface do Dashboard | `frontend/src/views/DashboardView.vue` |
| Interface de Gestão (homologação) | `frontend/src/views/HomologacaoView.vue` |
| Serviço de Notificação | `backend/src/modules/notificacoes/notificacao.service.js` |
| Base de Dados | MySQL, em `backend/src/database/schema.sql` |
