const bancoDados = require('../infra/bancoDados');

const controladorSaude = {
    verificarSaude: (req, res) => {
        res.json({
            status: 'OK',
            dataHora: new Date().toISOString(),
            tempoAtivo: process.uptime(),
            memoria: process.memoryUsage()
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

            const resultadoVersaoBd = await bancoDados.query("SHOW server_version;");
            const valorVersaoBd = resultadoVersaoBd.rows[0].server_version;

            const resultadoMaxConexoesBd = await bancoDados.query("SHOW max_connections;");
            const valorMaxConexoesBd = resultadoMaxConexoesBd.rows[0].max_connections;

            const nomeBancoDados = process.env.PGDATABASE;

            const resultadoConexoesAbertasBd = await bancoDados.query({
                text: `SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1;`,
                values: [nomeBancoDados],
            });

            const valorConexoesAbertasBd = resultadoConexoesAbertasBd.rows[0].count;

            res.status(200).json({
                atualizado_em: atualizadoEm,
                dependencias: {
                    banco_dados: {
                        versao: valorVersaoBd,
                        max_conexoes: parseInt(valorMaxConexoesBd),
                        conexoes_abertas: valorConexoesAbertasBd,
                    },
                },
            });

        } catch (erro) {
            console.error('❌ Erro ao obter status do banco:', erro);
            res.status(500).json({
                atualizado_em: new Date().toISOString(),
                erro: 'Erro ao obter status do banco de dados',
                mensagem: erro.message
            });
        }
    }
};

module.exports = controladorSaude;