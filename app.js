const express = require('express');
const cors = require('cors');
const multer = require('multer');
const rotas = require('./rotas');
const documentacao = require('./rotas/documentacao');

const aplicacao = express();

// Configuração CORS otimizada
const corsOptions = {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true,
    maxAge: 86400 // Cache preflight por 24h
};

aplicacao.use(cors(corsOptions));
aplicacao.use(express.json({ limit: '10mb' }));
aplicacao.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging otimizado - apenas em desenvolvimento ou quando habilitado
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_LOGGING === 'true') {
    aplicacao.use((req, res, next) => {
        const inicio = Date.now();
        res.on('finish', () => {
            const duracao = Date.now() - inicio;
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duracao}ms)`);
        });
        next();
    });
}

aplicacao.use('/api/docs', documentacao);
aplicacao.use('/api', rotas);

aplicacao.use((erro, req, res, next) => {
    // Erros de upload (tipo ou tamanho do arquivo) são do cliente, não do servidor.
    if (erro instanceof multer.MulterError || erro.message === 'Apenas arquivos TXT são permitidos') {
        return res.status(400).json({
            sucesso: false,
            erro: 'Arquivo inválido',
            mensagem: erro.message
        });
    }

    // JSON malformado no corpo da requisição.
    if (erro.type === 'entity.parse.failed') {
        return res.status(400).json({
            sucesso: false,
            erro: 'JSON inválido no corpo da requisição'
        });
    }

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

module.exports = aplicacao;
