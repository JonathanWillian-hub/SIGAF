// Sistema de Apontamentos (Diagrama de Sequência RF01 - Registro de Atividades e Substituições)
import { Router } from 'express';
import { query } from '../../config/db.js';
import { CategoriaAtividade, CategoriasComSubstituido, RotuloCategoria } from '../../domain/enums.js';
import { Setor } from '../../domain/Setor.js';
import { Disciplina } from '../../domain/Disciplina.js';
import { ErroApp } from '../../utils/erros.js';

const rotas = Router();

const DESCRICOES = {
  ATIVIDADE_EXTRAORDINARIA: 'Tarefas fora da rotina ou da jornada habitual (hora extra, demanda pontual).',
  SUBSTITUICAO: 'Assumir temporariamente as funções de outro profissional afastado.',
  COBERTURA_HORARIO: 'Cobrir um turno ou horário específico de outro profissional.',
  APOIO_OPERACIONAL: 'Reforço a outro setor ou equipe em uma operação específica.',
};

// Passos 5-6: "Solicita categorias disponíveis" -> "Retorna categorias de registro"
rotas.get('/categorias', (_req, res) => {
  res.json(Object.values(CategoriaAtividade).map((codigo) => ({
    codigo,
    rotulo: RotuloCategoria[codigo],
    descricao: DESCRICOES[codigo],
    exigeSubstituido: CategoriasComSubstituido.includes(codigo),
  })));
});

// Passos 9-10: "Envia categoria selecionada" -> "Habilita formulário correspondente"
rotas.get('/formulario', async (req, res) => {
  const { categoria } = req.query;
  if (!Object.values(CategoriaAtividade).includes(categoria)) {
    throw new ErroApp('Categoria inválida.', 422, { categoria: 'Selecione uma categoria.' });
  }
  const usuario = req.usuario;
  const exigeSubstituido = CategoriasComSubstituido.includes(categoria);

  // Colaborador só registra atividades próprias; gestor escolhe executor da sua equipe; admin, qualquer um.
  let executores;
  if (usuario.perfil === 'COLABORADOR') executores = [{ id: usuario.id, nome: usuario.nome, matricula: usuario.matricula }];
  else if (usuario.perfil === 'GESTOR' && usuario.setorId) {
    executores = await query('SELECT id, nome, matricula FROM usuarios WHERE ativo=1 AND (setor_id=? OR id=?) ORDER BY nome', [usuario.setorId, usuario.id]);
  } else executores = await query('SELECT id, nome, matricula FROM usuarios WHERE ativo=1 ORDER BY nome');

  const profissionais = exigeSubstituido
    ? await query('SELECT id, nome, matricula FROM usuarios WHERE ativo=1 ORDER BY nome')
    : [];

  res.json({
    categoria,
    rotulo: RotuloCategoria[categoria],
    campos: {
      executorId: { obrigatorio: true, travado: usuario.perfil === 'COLABORADOR' },
      substituidoId: { habilitado: exigeSubstituido, obrigatorio: exigeSubstituido },
      data: { obrigatorio: true },
      horarioInicio: { obrigatorio: true },
      horarioFim: { obrigatorio: true },
      setorId: { obrigatorio: true },
      disciplinaId: { obrigatorio: false },
      descricaoTarefas: { obrigatorio: true },
    },
    opcoes: {
      executores,
      profissionais,
      setores: await Setor.listar(),
      disciplinas: await Disciplina.listar(),
    },
    padrao: { executorId: usuario.id, setorId: usuario.setorId },
  });
});

export default rotas;
