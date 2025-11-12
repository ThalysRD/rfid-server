const express = require('express');
const roteador = express.Router();
const multer = require('multer');

const controladorRfid = require('../controladores/controladorRFID');
const controladorSaude = require('../controladores/controladorSaude');
const controladorArquivo = require('../controladores/controladorArquivo');

// Configurar multer para upload em memória
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.includes('text') || file.originalname.endsWith('.txt')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos TXT são permitidos'), false);
        }
    }
});

roteador.get('/saude', controladorSaude.verificarSaude);
roteador.get('/saude/bd', controladorSaude.verificarBancoDados);
roteador.get('/status', controladorSaude.status);

roteador.post('/rfid/leitura', controladorRfid.criarLeitura);
roteador.get('/rfid/leituras', controladorRfid.obterTodasLeituras);
roteador.get('/rfid/tag/:idTag', controladorRfid.obterLeiturasPorTag);
roteador.get('/rfid/dispositivo/:idDispositivo', controladorRfid.obterLeiturasPorDispositivo);
roteador.get('/rfid/periodo', controladorRfid.obterLeiturasPorPeriodo);

roteador.post('/rfid/arquivo', upload.single('arquivo'), controladorArquivo.processarArquivoTxt);

roteador.get('/', (req, res) => {
    res.json({
        mensagem: 'API Servidor RFID - ESP32',
        versao: '2.0.0',
        endpoints: {
            saude: '/api/saude',
            saudeBd: '/api/saude/bd',
            status: '/api/status',
            postLeitura: 'POST /api/rfid/leitura',
            postArquivo: 'POST /api/rfid/arquivo',
            getLeituras: 'GET /api/rfid/leituras',
            getPorTag: 'GET /api/rfid/tag/:idTag',
            getPorDispositivo: 'GET /api/rfid/dispositivo/:idDispositivo',
            getPorPeriodo: 'GET /api/rfid/periodo'
        }
    });
});

module.exports = roteador;
