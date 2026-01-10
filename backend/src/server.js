require('dotenv').config();
const express = require('express');
const cors = require('cors');

const redacaoRoutes = require('./routes/redacaoRoutes');
const cronogramaRoutes = require('./routes/cronogramaRoutes');
const simuladoRoutes = require('./routes/simuladoRoutes');
const authRoutes = require('./routes/authRoutes'); // <--- TEM QUE TER ISSO

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/redacao', redacaoRoutes);
app.use('/api/cronograma', cronogramaRoutes);
app.use('/api/simulados', simuladoRoutes);
app.use('/api/auth', authRoutes); // <--- E ISSO AQUI

app.get('/', (req, res) => {
    res.send('API do PH está ON! 🚀');
});

app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);
});
