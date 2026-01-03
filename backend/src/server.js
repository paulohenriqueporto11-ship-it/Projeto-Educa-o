// src/server.js
const express = require('express');
const cors = require('cors');
const { enviarRedacao } = require('./controllers/redacaoController');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Permite o Frontend acessar
app.use(express.json());

// Rota de Teste
app.get('/', (req, res) => {
    res.send('API de Correção de Redação Online! 🚀');
});

// Rota principal da aplicação
app.post('/api/enviar-redacao', enviarRedacao);

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
