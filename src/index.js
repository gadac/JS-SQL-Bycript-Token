const express = require('express')
const rotas = require('./roteadores/rotas')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())
app.use(rotas)

app.listen(3000, () => {
  console.log('Servidor iniciado na porta 3000')
})
