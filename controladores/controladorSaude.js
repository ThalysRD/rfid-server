const bancoDados = require('../infra/bancoDados');

const controladorSaude = {
    verificarSaude: (req, res) => {
        const memoriaUsada = process.memoryUsage();
        const memoriaFormatada = {
            rss: `${Math.round(memoriaUsada.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoriaUsada.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoriaUsada.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memoriaUsada.external / 1024 / 1024)}MB`
        };
        
        res.json({
            status: 'OK',
            dataHora: new Date().toISOString(),
            tempoAtivo: `${Math.floor(process.uptime())}s`,
            memoria: memoriaFormatada,
            versaoNode: process.version
        });
    },

    verificarBancoDados: async (req, res) => {
        try {
            const estaConectado = await bancoDados.testConnection();
            const statusBd = await bancoDados.query('SELECT NOW() as horario_atual');

            res.json({
                status: 'OK',
                bancoDados: {
                    conectado: estaConectado,
                    horarioAtual: statusBd.rows[0].horario_atual
                }
            });
        } catch (erro) {
            res.status(500).json({
                status: 'ERRO',
                bancoDados: {
                    conectado: false,
                    erro: erro.message
                }
            });
        }
    },

    status: async (req, res) => {
        try {
            const atualizadoEm = new Date().toISOString();

            // Executar queries em paralelo para melhor performance
            const [versaoBd, maxConexoes, conexoesAbertas] = await Promise.all([
                bancoDados.query("SHOW server_version;"),
                bancoDados.query("SHOW max_connections;"),
                bancoDados.query({
                    text: `SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1;`,
                    values: [process.env.PGDATABASE]
                })
            ]);

            const poolStats = bancoDados.getPoolStats();

            res.status(200).json({
                atualizado_em: atualizadoEm,
                servidor: {
                    ambiente: process.env.NODE_ENV || 'production',
                    versao_node: process.version,
                    uptime: `${Math.floor(process.uptime())}s`
                },
                dependencias: {
                    banco_dados: {
                        versao: versaoBd.rows[0].server_version,
                        max_conexoes: parseInt(maxConexoes.rows[0].max_connections),
                        conexoes_ativas: conexoesAbertas.rows[0].count,
                        pool: poolStats
                    }
                }
            });

        } catch (erro) {
            console.error('❌ Erro ao obter status do banco:', erro);
            res.status(500).json({
                atualizado_em: new Date().toISOString(),
                erro: 'Erro ao obter status do banco de dados',
                mensagem: process.env.NODE_ENV === 'development' ? erro.message : 'Erro interno'
            });
        }
    }
};

module.exports = controladorSaude;