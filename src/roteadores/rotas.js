const express = require('express')
const pool = require('../conexao/conexao')
const {
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
} = require('../controladores/dindin')

const rotas = express()

rotas.post('/usuario', CadastrarUsuario)
rotas.post('/login', LogarUsuario)
rotas.get('/usuario', DetalharUsuario)
rotas.put('/usuario', AtualizarUsuario)
rotas.get('/categoria', ListarCategoria)
rotas.post('/transacao', CadastrarTransacao)
rotas.get('/transacao/extrato', ExtratoTransacoes)
rotas.get('/transacao/:id', DetalharTransacao)
rotas.get('/transacao', ListarTransacoes)
rotas.put('/transacao/:id', AtualizarTransacao)
rotas.delete('/transacao/:id', DeletarTransacao)

module.exports = rotas
