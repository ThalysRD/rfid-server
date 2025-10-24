const express = require('express');
const roteador = express.Router();

const controladorRfid = require('../controladores/controladorRFID');
const controladorSaude = require('../controladores/controladorSaude');

roteador.get('/saude', controladorSaude.verificarSaude);
roteador.get('/saude/bd', controladorSaude.verificarBancoDados);
roteador.get('/status', controladorSaude.status);

roteador.post('/rfid/leitura', controladorRfid.criarLeitura);
roteador.get('/rfid/leituras', controladorRfid.obterTodasLeituras);
roteador.get('/rfid/tag/:idTag', controladorRfid.obterLeiturasPorTag);
roteador.get('/rfid/dispositivo/:idDispositivo', controladorRfid.obterLeiturasPorDispositivo);
roteador.get('/rfid/periodo', controladorRfid.obterLeiturasPorPeriodo);

roteador.get('/', (req, res) => {
    res.json({
        mensagem: 'API Servidor RFID - ESP32',
        versao: '1.0.0',
        endpoints: {
            saude: '/api/saude',
            saudeBd: '/api/saude/bd',
            status: '/api/status',
            postLeitura: 'POST /api/rfid/leitura (única leitura ou múltiplas)',
            getLeituras: 'GET /api/rfid/leituras',
            getPorTag: 'GET /api/rfid/tag/:idTag',
            getPorDispositivo: 'GET /api/rfid/dispositivo/:idDispositivo',
            getPorPeriodo: 'GET /api/rfid/periodo?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD'
        },
        exemploLeituraUnica: {
            url: '/api/rfid/leitura',
            metodo: 'POST',
            descricao: 'Enviar uma única leitura RFID (GPS é opcional)',
            corpo: {
                idTag: 'A1B2C3D4E5F6',
                idDispositivo: 'esp32_001',
                dataHoraLeitura: '2025-09-04T14:30:00-03:00',
                latitude: -3.7319,
                longitude: -38.5267,
                altitude: 45.230
            }
        },
        exemploLeiturasMultiplas: {
            url: '/api/rfid/leitura',
            metodo: 'POST',
            descricao: 'Enviar múltiplas leituras RFID (GPS é opcional)',
            corpo: [
                {
                    idTag: 'A1B2C3D4E5F6',
                    idDispositivo: 'esp32_001',
                    dataHoraLeitura: '2025-09-04T14:30:00-03:00',
                    latitude: -3.7319,
                    longitude: -38.5267,
                    altitude: 45.230
                },
                {
                    idTag: 'B2C3D4E5F6A1',
                    idDispositivo: 'esp32_002',
                    dataHoraLeitura: '2025-09-04T14:31:15-03:00'
                }
            ]
        },
        exemploMinimo: {
            url: '/api/rfid/leitura',
            metodo: 'POST',
            descricao: 'Enviar leitura RFID com apenas campos obrigatórios',
            corpo: {
                idTag: 'A1B2C3D4E5F6',
                idDispositivo: 'esp32_001'
            }
        }
    });
});

module.exports = roteador;