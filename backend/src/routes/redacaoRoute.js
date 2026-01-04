const express = require('express');
const router = express.Router();
const { enviarRedacao, obterEstatisticas } = require('../controllers/redacaoController');

router.post('/enviar-redacao', enviarRedacao);
router.get('/estatisticas', obterEstatisticas);

module.exports = router;
