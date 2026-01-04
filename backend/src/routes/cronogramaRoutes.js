const express = require('express');
const router = express.Router();
const cronogramaController = require('../controllers/cronogramaController');

// Middleware de Rate Limit (Se quiser aplicar só nessas rotas, importe aqui, 
// mas se for global, deixa no server.js. Vou assumir que você passa no server)

// As rotas aqui já assumem que começam com /api/cronograma (definiremos no server.js)
router.get('/dados', cronogramaController.getDadosUsuario);
router.post('/concluir', cronogramaController.concluirMissao);
router.post('/config', cronogramaController.salvarConfig);
router.post('/bonus', cronogramaController.registrarBonus);

module.exports = router;
