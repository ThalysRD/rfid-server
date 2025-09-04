const express = require('express');
const roteador = express.Router();

const controladorRfid = require('../controladores/controladorRfid');
const controladorSaude = require('../controladores/controladorSaude');

roteador.get('/saude', controladorSaude.verificarSaude);
roteador.get('/saude/bd', controladorSaude.verificarBancoDados);
roteador.get('/status', controladorSaude.status);

roteador.post('/rfid/leitura', controladorRfid.criarLeitura);
roteador.post('/rfid/lote', controladorRfid.criarLeitura);
roteador.get('/rfid/leituras', controladorRfid.obterTodasLeituras);
roteador.get('/rfid/tag/:idTag', controladorRfid.obterLeiturasPorTag);
roteador.get('/rfid/funcionario/:nomeFuncionario', controladorRfid.obterLeiturasPorFuncionario);
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
            postLote: 'POST /api/rfid/lote (mesmo que /leitura - múltiplas leituras)',
            getLeituras: 'GET /api/rfid/leituras',
            getPorTag: 'GET /api/rfid/tag/:idTag',
            getPorFuncionario: 'GET /api/rfid/funcionario/:nomeFuncionario',
            getPorPeriodo: 'GET /api/rfid/periodo?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD'
        },
        exemploLeituraUnica: {
            url: '/api/rfid/leitura',
            metodo: 'POST',
            descricao: 'Enviar uma única leitura RFID',
            corpo: {
                idTag: '1234567890',
                nomeFuncionario: 'João Silva',
                dataHoraLeitura: '2025-09-04T10:30:00Z',
                rssi: -45,
                localizacao: 'entrada',
                idDispositivo: 'esp32_001'
            }
        },
        exemploLeiturasMultiplas: {
            url: '/api/rfid/leitura',
            metodo: 'POST',
            descricao: 'Enviar múltiplas leituras RFID em um único POST',
            corpo: [
                {
                    idTag: '1234567890',
                    nomeFuncionario: 'João Silva',
                    dataHoraLeitura: '2025-09-04T10:30:00Z',
                    rssi: -45,
                    localizacao: 'entrada',
                    idDispositivo: 'esp32_001'
                },
                {
                    idTag: '0987654321',
                    nomeFuncionario: 'Maria Santos',
                    dataHoraLeitura: '2025-09-04T10:31:15Z',
                    rssi: -52,
                    localizacao: 'entrada',
                    idDispositivo: 'esp32_001'
                }
            ]
        }
    });
});

module.exports = roteador;