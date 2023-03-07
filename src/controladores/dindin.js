const pool = require('../conexao/conexao')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const chaveSecreta = '#cortagiro'

async function VerificarToken(req) {
  const autorizacaoHeader = req.headers.authorization
  const tokenRecebido = autorizacaoHeader.split(' ')[1]

  let dadosToken = {}
  try {
    jwt.verify(tokenRecebido, chaveSecreta, (err, decoded) => {
      if (err) {
        console.error('Erro na validação do token:', err)
        return false
      } else {
        dadosToken.usuarioId = decoded.usuarioId
        dadosToken.exp = decoded.exp
        dadosToken.iat = decoded.iat
      }
    })
    const queryTexto = 'SELECT id FROM usuarios where id = $1'
    const valor = [dadosToken.usuarioId]
    const verificaID = await pool.query(queryTexto, valor)
    return verificaID.rows
  } catch (error) {
    console.log(error)
    return false
  }
}

const CadastrarUsuario = async (req, res) => {
  const { nome, email, senha } = req.body

  const saltRounds = 10
  const salt = bcrypt.genSaltSync(saltRounds)
  const hash = bcrypt.hashSync(senha, salt)

  const queryTexto =
    'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id'
  const values = [nome, email, hash]

  try {
    const result = await pool.query(queryTexto, values)

    const novoId = result.rows[0].id
    return res.status(201).json({ id: novoId, nome, email })
  } catch (error) {
    console.error(error)
    return res.status(403).json({
      mensagem: 'Já existe usuário cadastrado com o e-mail informado.',
    })
  }
}

const LogarUsuario = async (req, res) => {
  try {
    const { email, senha } = req.body

    const hash = await pool.query('SELECT * FROM usuarios WHERE email = $1', [
      email,
    ])
    const senhaCorreta = bcrypt.compareSync(senha, hash.rows[0].senha)

    if (!senhaCorreta) {
      return res.status(401).json({ mensagem: 'Email ou senha inválidos' })
    }
    const usuarioId = hash.rows[0].id
    const token = jwt.sign(
      {
        usuarioId,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
      },
      chaveSecreta
    )
    const envio = {
      usuario: {
        id: hash.rows[0].id,
        nome: hash.rows[0].nome,
        email: hash.rows[0].email,
      },
      token,
    }
    return res.status(200).json(envio)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ mensagem: 'Erro ao realizar login' })
  }
}

const DetalharUsuario = async (req, res) => {
  try {
    const resultado = await VerificarToken(req)
    if (!resultado) {
      return res.status(404).json({
        mensagem:
          'Para acessar este recurso um token de autenticação válido deve ser enviado',
      })
    }

    const queryTexto = 'SELECT id, nome, email FROM usuarios WHERE id = $1'

    const dadosUsuario = await pool.query(queryTexto, [resultado[0].id])

    return res.status(200).json(dadosUsuario.rows[0])
  } catch (error) {
    console.log(error)
    return res.status(404).json({
      mensagem:
        'Para acessar este recurso um token de autenticação válido deve ser enviado.',
    })
  }
}

const AtualizarUsuario = async (req, res) => {
  const { nome, email, senha } = req.body
  try {
    const resultado = await VerificarToken(req)
    if (!resultado) {
      return res.status(404).json({
        mensagem:
          'Para acessar este recurso um token de autenticação válido deve ser enviado',
      })
    }
    const saltRounds = 4
    const salt = bcrypt.genSaltSync(saltRounds)
    const hash = bcrypt.hashSync(senha, salt)

    const textQuery =
      'UPDATE usuarios SET nome = $1, email = $2, senha = $3 WHERE id = $4'
    const valores = [nome, email, hash, resultado[0].id]
    await pool.query(textQuery, valores)

    return res.json()
  } catch (error) {
    console.log(error)
    return res.status(404).json({
      mensagem: 'O e-mail informado já está sendo utilizado por outro usuário.',
    })
  }
}

const ListarCategoria = async (req, res) => {
  try {
    const resultado = await VerificarToken(req)
    if (!resultado) {
      return res.status(404).json({
        mensagem:
          'Para acessar este recurso um token de autenticação válido deve ser enviado',
      })
    }

    const textQuery = 'SELECT * FROM categorias'
    const categorias = await pool.query(textQuery)

    return res.json(categorias.rows)
  } catch (error) {
    return res.status(404).json({ mensagem: 'Servidor fora do ar' })
  }
}

const ListarTransacoes = async (req, res) => {
  try {
    const resultado = await VerificarToken(req)
    if (!resultado) {
      return res.status(404).json({
        mensagem:
          'Para acessar este recurso um token de autenticação válido deve ser enviado',
      })
    }
    const dadosDeSaido = []

    const queryTexto = 'SELECT * FROM transacoes WHERE usuario_id = $1'
    const valores = [resultado[0].id]
    const totasAsTransacoes = await pool.query(queryTexto, valores)

    const todasAsCategorias = await pool.query('SELECT * FROM categorias')

    for (let index = 0; index < totasAsTransacoes.rows.length; index++) {
      let idCategoria = totasAsTransacoes.rows[index].categoria_id
      dadosDeSaido.push({
        id: totasAsTransacoes.rows[index].id,
        tipo: totasAsTransacoes.rows[index].tipo,
        descricao: totasAsTransacoes.rows[index].descricao,
        valor: totasAsTransacoes.rows[index].valor,
        data: totasAsTransacoes.rows[index].data,
        usuario_id: totasAsTransacoes.rows[index].usuario_id,
        categoria_id: idCategoria,
        categoria_nome: todasAsCategorias.rows[idCategoria].descricao,
      })
    }

    return res.json(dadosDeSaido)
  } catch (error) {
    console.log(error)
  }
}

const CadastrarTransacao = async (req, res) => {
  const resultado = await VerificarToken(req)
  if (!resultado) {
    return res.status(404).json({
      mensagem:
        'Para acessar este recurso um token de autenticação válido deve ser enviado',
    })
  }
  const usuario_id = resultado[0].id

  try {
    const { tipo, descricao, valor, data, categoria_id } = req.body

    if (!tipo && !descricao && !valor && !data && !categoria_id) {
      return res.status(400).json({
        mensagem: 'Todos os campos obrigatórios devem ser informados.',
      })
    }

    const validarCategoria = await pool.query(
      'SELECT * FROM categorias WHERE id = $1',
      [categoria_id]
    )

    if (!validarCategoria.rows) {
      return res
        .status(404)
        .json({ mensagem: 'Categoria_id informado não foi encontrado' })
    }

    if (tipo !== 'entrada' && tipo !== 'saida') {
      return res.status(400).json({
        mensagem: 'O dado tipo informado está incorreto entrada/saida',
      })
    }

    const queryTexto =
      'INSERT INTO transacoes (descricao, valor, data, categoria_id, usuario_id, tipo) VALUES( $1, $2, $3, $4, $5, $6) RETURNING id, tipo, descricao, valor, data, usuario_id, categoria_id'

    const valores = [descricao, valor, data, categoria_id, usuario_id, tipo]

    const transacaoCadastrada = await pool.query(queryTexto, valores)

    return res.status(201).json({
      id: transacaoCadastrada.rows[0].id,
      tipo,
      descricao,
      valor,
      data,
      usuario_id,
      categoria_id,
      categoria_nome: validarCategoria.rows[0].descricao,
    })
  } catch (error) {
    console.log(error)
    return res
      .status(400)
      .json({ mensagem: 'Erro inesperado ao cadastrar transação' })
  }
}

const DetalharTransacao = async (req, res) => {
  const resultado = await VerificarToken(req)
  if (!resultado) {
    return res.status(404).json({
      mensagem:
        'Para acessar este recurso um token de autenticação válido deve ser enviado',
    })
  }
  try {
    const { id } = req.params
    const idUsuario = resultado[0].id

    const queryTexto =
      'SELECT * FROM transacoes WHERE usuario_id = $1 AND id = $2'
    const transacoes = await pool.query(queryTexto, [idUsuario, id])

    return res.json(transacoes.rows)
  } catch (error) {
    console.log(error)
    return res.status(404).json({ mensagem: 'Transação não encontrada.' })
  }
}

const AtualizarTransacao = async (req, res) => {
  const resultado = await VerificarToken(req)
  if (!resultado) {
    return res.status(404).json({
      mensagem:
        'Para acessar este recurso um token de autenticação válido deve ser enviado',
    })
  }

  try {
    const { id } = req.params
    const { descricao, valor, data, categoria_id, tipo } = req.body
    const idUsuario = resultado[0].id

    if (!tipo && !descricao && !valor && !data && !categoria_id) {
      return res.status(400).json({
        mensagem: 'Todos os campos obrigatórios devem ser informados.',
      })
    }

    const VerificarTransacaoID = await pool.query(
      'SELECT * FROM transacoes WHERE id = $1',
      [id]
    )

    if (!VerificarTransacaoID.rows) {
      return res.status(404).json({
        mensagem:
          'A Transação mencionado não foi encontrado em nossos servidores',
      })
    }

    const VerificarCategoria = await pool.query(
      'SELECT * FROM categorias WHERE id = $1',
      [categoria_id]
    )
    if (!VerificarCategoria.rows) {
      return res.status(404).json({
        mensagem:
          'A Categoria_id mencionado não foi encontrado em nossos servidores',
      })
    }
    if (tipo !== 'saida' && tipo !== 'entrada') {
      return res.status(400).json({
        mensagem:
          'O dado enviado para categoria (TIPO) não está no formato adquado como: entrada/saida',
      })
    }

    const queryTexto =
      'UPDATE transacoes SET descricao = $1, valor = $2, data = $3, categoria_id = $4, tipo = $5 WHERE id = $6'
    const valores = [descricao, valor, data, categoria_id, tipo, id]
    await pool.query(queryTexto, valores)

    return res.json()
  } catch (error) {
    console.log(error)
    return res
      .status(500)
      .json({ mensagem: 'falhas causadas pelo servidor, tente mais tarde' })
  }
}

const DeletarTransacao = async (req, res) => {
  try {
    const resultado = await VerificarToken(req)
    if (!resultado) {
      return res.status(404).json({
        mensagem:
          'Para acessar este recurso um token de autenticação válido deve ser enviado',
      })
    }

    const ValidarTransacao = await pool.query(
      'SELECT * FROM transacoes WHERE id = $1 AND usuario_id = $2',
      [req.params.id, resultado[0].id]
    )

    if (!ValidarTransacao) {
      return res.status(404).json({
        mensagem:
          'O id da transação informado não foi encontrado em nossos servidores',
      })
    }
    const queryTexto =
      'DELETE FROM transacoes WHERE id = $1 AND usuario_id = $2'
    await pool.query(queryTexto, [req.params.id, resultado[0].id])

    return res.json()
  } catch (error) {
    console.log(error)
    return res.status(500).json({ mensagem: 'Falhas causadas pelo servidor' })
  }
}

const ExtratoTransacoes = async (req, res) => {
  try {
    const resultado = await VerificarToken(req)
    if (!resultado) {
      return res.status(404).json({
        mensagem:
          'Para acessar este recurso um token de autenticação válido deve ser enviado',
      })
    }

    const entrada = await pool.query(
      'SELECT valor FROM transacoes WHERE usuario_id = $1 and tipo = $2',
      [resultado[0].id, 'entrada']
    )

    const saida = await pool.query(
      'SELECT valor FROM transacoes WHERE usuario_id = $1 and tipo = $2',
      [resultado[0].id, 'saida']
    )
    let somaEntrada = 0
    let somaSaida = 0

    for (let i = 0; i < entrada.rows.length; i++) {
      somaEntrada = parseInt(entrada.rows[i].valor) + somaEntrada
    }

    for (let i = 0; i < saida.rows.length; i++) {
      somaSaida = parseInt(saida.rows[i].valor) + somaSaida
    }

    return res.json({
      entrada: somaEntrada,
      saida: somaSaida,
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ mensagem: 'Falhas causadas pelo servidor' })
  }
}

module.exports = {
  CadastrarUsuario,
  LogarUsuario,
  DetalharUsuario,
  AtualizarUsuario,
  ListarCategoria,
  CadastrarTransacao,
  ListarTransacoes,
  DetalharTransacao,
  AtualizarTransacao,
  DeletarTransacao,
  ExtratoTransacoes,
}
