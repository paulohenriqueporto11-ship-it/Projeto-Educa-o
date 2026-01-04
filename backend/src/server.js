// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// --- IMPORTANDO AS ROTAS (Aqui que eu tinha comido bola) ---
const redacaoRoutes = require('./src/routes/redacaoRoutes');
const cronogramaRoutes = require('./src/routes/cronogramaRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- LIGANDO AS ROTAS ---

// Tudo que for de redação vai começar com /api/redacao
// Ex: POST http://localhost:3000/api/redacao/corrigir
app.use('/api/redacao', redacaoRoutes);

// Tudo que for de cronograma vai começar com /api/cronograma
// Ex: POST http://localhost:3000/api/cronograma/gerar
app.use('/api/cronograma', cronogramaRoutes);


// Rota base só pra testar se o server ta vivo
app.get('/', (req, res) => {
    res.send('API do PH está ON! 🚀');
});

app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);
    console.log(`   ➜ Rotas de Redação carregadas`);
    console.log(`   ➜ Rotas de Cronograma carregadas`);
});
