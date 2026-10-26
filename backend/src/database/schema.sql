-- =====================================================================
-- SIGAF - Sistema de Registro e Gestão de Atividades Funcionais
-- Esquema do banco de dados (MySQL / MariaDB)
-- Baseado no Diagrama de Classes da ERS v1.7
-- =====================================================================

CREATE DATABASE IF NOT EXISTS {{DB_NAME}}
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE {{DB_NAME}};

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS logs_auditoria;
DROP TABLE IF EXISTS notificacoes;
DROP TABLE IF EXISTS relatorios;
DROP TABLE IF EXISTS registros_atividade;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS disciplinas;
DROP TABLE IF EXISTS setores;
SET FOREIGN_KEY_CHECKS = 1;

-- Classe Setor (id, nome, codigo)
CREATE TABLE setores (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nome    VARCHAR(120) NOT NULL,
  codigo  VARCHAR(20)  NOT NULL UNIQUE,
  ativo   TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Classe Disciplina (id, nome, descricao)
CREATE TABLE disciplinas (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  nome      VARCHAR(120) NOT NULL,
  descricao VARCHAR(255) NULL,
  ativo     TINYINT(1)   NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Classe Usuario (id, nome, matricula, cpf, email, perfil : PerfilUsuario)
-- cpf é dado sensível -> gravado criptografado com AES-256-GCM (RNF01)
CREATE TABLE usuarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  matricula   VARCHAR(20)  NOT NULL UNIQUE,
  cpf         VARCHAR(255) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  senha_hash  VARCHAR(100) NOT NULL,
  perfil      ENUM('COLABORADOR','GESTOR','ADMINISTRADOR') NOT NULL DEFAULT 'COLABORADOR',
  setor_id    INT NULL,
  ativo       TINYINT(1)   NOT NULL DEFAULT 1,
  criado_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuario_setor FOREIGN KEY (setor_id) REFERENCES setores(id)
) ENGINE=InnoDB;

-- Classe RegistroAtividade
--   executor 1 -> Usuario | substituido 0..1 -> Usuario
--   disciplina 0..1 -> Disciplina | setor 1 -> Setor
CREATE TABLE registros_atividade (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  categoria          ENUM('ATIVIDADE_EXTRAORDINARIA','SUBSTITUICAO','COBERTURA_HORARIO','APOIO_OPERACIONAL') NOT NULL,
  data               DATE         NOT NULL,
  horario_inicio     TIME         NOT NULL,
  horario_fim        TIME         NOT NULL,
  descricao_tarefas  TEXT         NOT NULL,
  data_criacao       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  executor_id        INT          NOT NULL,
  substituido_id     INT          NULL,
  disciplina_id      INT          NULL,
  setor_id           INT          NOT NULL,
  criado_por_id      INT          NOT NULL,
  -- Homologação (Diagrama de Sequência "Pendentes de Homologação")
  status             ENUM('PENDENTE','HOMOLOGADO','REJEITADO') NOT NULL DEFAULT 'PENDENTE',
  justificativa      VARCHAR(500) NULL,
  homologado_por_id  INT          NULL,
  homologado_em      DATETIME     NULL,
  CONSTRAINT fk_reg_executor    FOREIGN KEY (executor_id)    REFERENCES usuarios(id),
  CONSTRAINT fk_reg_substituido FOREIGN KEY (substituido_id) REFERENCES usuarios(id),
  CONSTRAINT fk_reg_disciplina  FOREIGN KEY (disciplina_id)  REFERENCES disciplinas(id),
  CONSTRAINT fk_reg_setor       FOREIGN KEY (setor_id)       REFERENCES setores(id),
  CONSTRAINT fk_reg_criado_por  FOREIGN KEY (criado_por_id)  REFERENCES usuarios(id),
  CONSTRAINT fk_reg_homologador FOREIGN KEY (homologado_por_id) REFERENCES usuarios(id),
  CONSTRAINT ck_reg_horario CHECK (horario_fim > horario_inicio),
  INDEX idx_reg_data (data),
  INDEX idx_reg_setor (setor_id),
  INDEX idx_reg_executor (executor_id),
  INDEX idx_reg_status (status),
  INDEX idx_reg_categoria (categoria)
) ENGINE=InnoDB;

-- Classe Relatorio (id, formato, dataInicioFiltro, dataFimFiltro, status, dataGeracao, arquivoUrl)
--   solicitante 1 -> Usuario | filtro setor 0..1 -> Setor
CREATE TABLE relatorios (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  formato             ENUM('PDF','EXCEL','CSV') NOT NULL,
  data_inicio_filtro  DATE        NOT NULL,
  data_fim_filtro     DATE        NOT NULL,
  status              ENUM('PROCESSANDO','CONCLUIDO','ERRO') NOT NULL DEFAULT 'PROCESSANDO',
  data_geracao        DATETIME    NULL,
  arquivo_url         VARCHAR(255) NULL,
  total_registros     INT         NULL,
  solicitante_id      INT         NOT NULL,
  setor_id            INT         NULL,
  profissional_id     INT         NULL,
  criado_em           DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rel_solicitante  FOREIGN KEY (solicitante_id)  REFERENCES usuarios(id),
  CONSTRAINT fk_rel_setor        FOREIGN KEY (setor_id)        REFERENCES setores(id),
  CONSTRAINT fk_rel_profissional FOREIGN KEY (profissional_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Serviço de Notificação (alertas ao colaborador / relatório pronto)
CREATE TABLE notificacoes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT          NOT NULL,
  titulo      VARCHAR(160) NOT NULL,
  mensagem    VARCHAR(500) NOT NULL,
  link        VARCHAR(255) NULL,
  lida        TINYINT(1)   NOT NULL DEFAULT 0,
  criada_em   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_not_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_not_usuario (usuario_id, lida)
) ENGINE=InnoDB;

-- RNF06 - Logs auditáveis (usuário, data/hora, ação)
CREATE TABLE logs_auditoria (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT          NULL,
  acao        ENUM('CRIACAO','ALTERACAO','ELIMINACAO','LOGIN','HOMOLOGACAO','REJEICAO','RELATORIO') NOT NULL,
  entidade    VARCHAR(60)  NOT NULL,
  entidade_id INT          NULL,
  detalhes    TEXT         NULL,
  ip          VARCHAR(60)  NULL,
  data_hora   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_log_data (data_hora)
) ENGINE=InnoDB;
