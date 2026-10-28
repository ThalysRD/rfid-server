const { testConnection: testarConexao, pool } = require('./infra/bancoDados');
require('dotenv').config();
const aplicacao = require('./app');

const PORTA = process.env.PORT || 3000;

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
            console.log(`📚 Documentação: /api/docs`);
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

if (require.main === module) {
    iniciarServidor();
}

module.exports = aplicacao;
