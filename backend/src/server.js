// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// --- IMPORTANDO AS ROTAS ---
const redacaoRoutes = require('./routes/redacaoRoutes');
const cronogramaRoutes = require('./routes/cronogramaRoutes');
const simuladoRoutes = require('./routes/simuladoRoutes'); // <--- NOVO

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- LIGANDO AS ROTAS ---

app.use('/api/redacao', redacaoRoutes);
app.use('/api/cronograma', cronogramaRoutes);
app.use('/api/simulados', simuladoRoutes); // <--- NOVO: http://.../api/simulados


app.get('/', (req, res) => {
    res.send('API do PH está ON! 🚀');
});

app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);
    console.log(`   ➜ Rotas de Redação carregadas`);
    console.log(`   ➜ Rotas de Cronograma carregadas`);
    console.log(`   ➜ Rotas de Simulados carregadas`);
});
