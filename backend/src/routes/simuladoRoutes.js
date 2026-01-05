// src/routes/simuladoRoutes.js
const express = require('express');
const router = express.Router();
const { buscarProgresso, salvarProgresso } = require('../controllers/simuladoController');

// Rota: GET /api/simulados/progresso/user_123
router.get('/progresso/:userId', buscarProgresso);

// Rota: POST /api/simulados/concluir
router.post('/concluir', salvarProgresso);

module.exports = router;
