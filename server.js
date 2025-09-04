const express = require('express');
const cors = require('cors');
const { testConnection: testarConexao } = require('./infra/bancoDados');
const rotas = require('./rotas');
require('dotenv').config();

const aplicacao = express();
const PORTA = process.env.PORT || 3000;

aplicacao.use(cors());
aplicacao.use(express.json({ limit: '10mb' }));
aplicacao.use(express.urlencoded({ extended: true, limit: '10mb' }));

aplicacao.use((req, res, next) => {
    const dataHora = new Date().toISOString();
    console.log(`[${dataHora}] ${req.method} ${req.path}`);
    next();
});

aplicacao.use('/api', rotas);

aplicacao.use((erro, req, res, next) => {
    console.error('Erro não tratado:', erro);
    res.status(500).json({
        sucesso: false,
        erro: 'Erro interno do servidor',
        mensagem: process.env.NODE_ENV === 'development' ? erro.message : 'Erro interno'
    });
});

aplicacao.use('*', (req, res) => {
    res.status(404).json({
        sucesso: false,
        erro: 'Rota não encontrada',
        caminho: req.originalUrl
    });
});

async function iniciarServidor() {
    try {
        console.log('Iniciando servidor RFID...');

        const bdConectado = await testarConexao();
        if (!bdConectado) {
            throw new Error('Falha na conexão com o banco de dados');
        }

        aplicacao.listen(PORTA, '0.0.0.0', () => {
            console.log('SERVIDOR RFID INICIADO');
            console.log(`Porta: ${PORTA}`);
            console.log(`Verificação de Saúde: /api/saude`);
            console.log(`Endpoint POST: /api/rfid/leitura`);
        });

    } catch (erro) {
        console.error('Falha ao iniciar servidor:', erro.message);
        process.exit(1);
    }
}

iniciarServidor();