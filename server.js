const express = require('express');
const cors = require('cors');
const { testConnection: testarConexao, pool } = require('./infra/bancoDados');
const rotas = require('./rotas');
require('dotenv').config();

const aplicacao = express();
const PORTA = process.env.PORT || 3000;

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

let servidor;

async function iniciarServidor() {
    try {
        console.log('🚀 Iniciando servidor RFID...');

        const bdConectado = await testarConexao();
        if (!bdConectado) {
            throw new Error('Falha na conexão com o banco de dados');
        }

        servidor = aplicacao.listen(PORTA, '0.0.0.0', () => {
            console.log('✅ SERVIDOR RFID INICIADO');
            console.log(`📡 Porta: ${PORTA}`);
            console.log(`🏥 Saúde: /api/saude`);
            console.log(`📝 API: /api/rfid/leitura`);
            console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'production'}`);
        });

        // Configurar graceful shutdown
        configurarGracefulShutdown();

    } catch (erro) {
        console.error('❌ Falha ao iniciar servidor:', erro.message);
        process.exit(1);
    }
}

function configurarGracefulShutdown() {
    const signals = ['SIGTERM', 'SIGINT'];
    
    signals.forEach(signal => {
        process.on(signal, async () => {
            console.log(`\n⚠️  ${signal} recebido. Encerrando graciosamente...`);
            
            // Parar de aceitar novas conexões
            servidor.close(async () => {
                console.log('🔒 Servidor HTTP fechado');
                
                // Encerrar pool de conexões do banco
                try {
                    await pool.end();
                    console.log('🗄️  Pool de conexões encerrado');
                } catch (erro) {
                    console.error('❌ Erro ao encerrar pool:', erro.message);
                }
                
                console.log('✅ Shutdown concluído');
                process.exit(0);
            });
            
            // Forçar shutdown após 10 segundos
            setTimeout(() => {
                console.error('⚠️  Shutdown forçado após timeout');
                process.exit(1);
            }, 10000);
        });
    });
    
    // Tratar erros não capturados
    process.on('uncaughtException', (erro) => {
        console.error('❌ Exceção não capturada:', erro);
        process.exit(1);
    });
    
    process.on('unhandledRejection', (razao, promise) => {
        console.error('❌ Promise rejeitada não tratada:', razao);
        process.exit(1);
    });
}

iniciarServidor();