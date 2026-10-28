# Evidências de funcionamento do SIGAF

Prints tirados em 26/10/2026 com o sistema rodando localmente (API Node.js + Vue.js + banco relacional; na época em MariaDB, hoje em PostgreSQL no Supabase), em três sessões separadas: **Colaborador** (Carlos Mendes), **Gestor** (Patrícia Moura, Logística & Expedição) e **Administrador**. As telas seguem os fluxos dos diagramas de sequência da ERS v1.7.

## Autenticação e Painel (RF05)

| Print | O que comprova |
|---|---|
| [01-login.png](evidencias/01-login.png) | Tela de login (pré-condição de todos os RFs) |
| [02-rf05-dashboard-colaborador.png](evidencias/02-rf05-dashboard-colaborador.png) | Após o login o sistema leva direto ao Painel; **A1**: o colaborador vê *“Exibindo apenas os seus registros”* |
| [09-rf05-dashboard-gestor.png](evidencias/09-rf05-dashboard-gestor.png) | **A1**: gestor vê os registros da equipe, pendências de homologação e alertas de alocação crítica (igual ao protótipo) |
| [18-rf05-dashboard-administrador.png](evidencias/18-rf05-dashboard-administrador.png) | Administrador vê todos os setores |

## Registro de atividades (RF01 e RF02)

| Print | O que comprova |
|---|---|
| [03-rf01-novo-registro-categorias.png](evidencias/03-rf01-novo-registro-categorias.png) | RF01 passos 1-3: opções de categoria (Extraordinária, Substituição, Cobertura de Horário, Apoio Operacional) |
| [08-rf01-a1-cancelamento.png](evidencias/08-rf01-a1-cancelamento.png) | **RF01 A1**: cancelar descarta os dados e volta à tela anterior |
| [04-rf02-a1-campos-obrigatorios.png](evidencias/04-rf02-a1-campos-obrigatorios.png) | **RF02 A1**: campos obrigatórios vazios destacados em vermelho e submissão bloqueada |
| [05-rf02-a2-horario-inconsistente.png](evidencias/05-rf02-a2-horario-inconsistente.png) | **RF02 A2**: fim (08:00) antes do início (14:00) gera alerta de inconsistência |
| [06-rf02-registro-salvo.png](evidencias/06-rf02-registro-salvo.png) | RF02 passo 4: “Registro salvo com sucesso” |

## Consulta de histórico (RF03)

| Print | O que comprova |
|---|---|
| [10-rf03-historico-filtrado.png](evidencias/10-rf03-historico-filtrado.png) | Lista padronizada com filtros por período, tipo e profissional (“Mariana”) |
| [07-rf03-detalhe-registro.png](evidencias/07-rf03-detalhe-registro.png) | Detalhes completos de um registro específico |
| [11-rf03-a1-nenhum-registro.png](evidencias/11-rf03-a1-nenhum-registro.png) | **RF03 A1**: “Nenhum registro encontrado para os filtros informados” + sugestão de limpar a busca |
| [23-substituicoes.png](evidencias/23-substituicoes.png) | Tela de Substituições do protótipo (titular afastado × substituto em exercício) |

## Homologação (diagrama de sequência “Pendentes de Homologação”)

| Print | O que comprova |
|---|---|
| [12-homologacao-pendentes.png](evidencias/12-homologacao-pendentes.png) | Lista de pendentes da equipe, com Aprovar / Rejeitar |
| [13-homologacao-rejeitar-justificativa.png](evidencias/13-homologacao-rejeitar-justificativa.png) | Rejeição exige justificativa |
| [14-homologacao-confirmacao.png](evidencias/14-homologacao-confirmacao.png) | Confirmação de status atualizado |
| [15-notificacao-colaborador.png](evidencias/15-notificacao-colaborador.png) | Serviço de Notificação: o colaborador recebe o resultado (homologado / rejeitado com justificativa) |

## Relatórios (RF04)

| Print / arquivo | O que comprova |
|---|---|
| [16-rf04-relatorio-gerado.png](evidencias/16-rf04-relatorio-gerado.png) | Parâmetros (período, setor, profissional, formato) e download automático |
| [17-rf04-relatorio-pdf.png](evidencias/17-rf04-relatorio-pdf.png) e [relatorio-exemplo.pdf](evidencias/relatorio-exemplo.pdf) | PDF gerado com resumo consolidado e tabela |
| [relatorio-exemplo.xlsx](evidencias/relatorio-exemplo.xlsx) | Excel gerado (abas Registros e Resumo) |
| [19-rf04-a1-relatorio-segundo-plano.png](evidencias/19-rf04-a1-relatorio-segundo-plano.png) | **RF04 A1**: com 161 registros aparece “O relatório está sendo gerado em segundo plano…” e status *Processando* |
| [20-rf04-a1-relatorio-pronto-notificacao.png](evidencias/20-rf04-a1-relatorio-pronto-notificacao.png) | Notificação “Relatório pronto para download” |

## Requisitos não funcionais

| Evidência | O que comprova |
|---|---|
| [evidencias-backend.txt](evidencias/evidencias-backend.txt) | **RNF01** CPF criptografado (AES-256-GCM) e senha em bcrypt direto no banco; API respondendo em HTTPS com HSTS. **RNF03** tempos de poucos milissegundos. **RNF02** endpoint de saúde. Controle de acesso (403/401). |
| [22-cadastros-usuarios.png](evidencias/22-cadastros-usuarios.png) | **RNF01** CPF sempre exibido mascarado na interface |
| [21-rnf06-auditoria.png](evidencias/21-rnf06-auditoria.png) | **RNF06** logs com usuário, data/hora, ação, entidade e detalhes (ex.: rejeição com justificativa) |
| [24-rnf04-celular-dashboard.png](evidencias/24-rnf04-celular-dashboard.png) e [25-rnf04-celular-formulario.png](evidencias/25-rnf04-celular-formulario.png) | **RNF04** layout responsivo em celular (390 px), menu vira barra inferior |
| [testes-automatizados.txt](evidencias/testes-automatizados.txt) | 32 testes automatizados passando (unidade + integração da API) |
