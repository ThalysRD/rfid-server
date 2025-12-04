const { Pool } = require('pg');
require('dotenv').config();

const poolConexoes = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: 5432,
    ssl: {
        require: true,
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000, // 5 segundos para conectar
    idleTimeoutMillis: 30000, // 30 segundos de idle
    max: 20, // máximo de conexões
    min: 2, // mínimo de conexões mantidas
    maxUses: 7500, // reciclar conexão após 7500 usos
    allowExitOnIdle: false
});

// Event listeners para monitoramento do pool
poolConexoes.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
        console.log('Nova conexão criada no pool');
    }
});

poolConexoes.on('acquire', () => {
    if (process.env.POOL_DEBUG === 'true') {
        console.log('Cliente adquirido do pool');
    }
});

poolConexoes.on('error', (erro, cliente) => {
    console.error('Erro inesperado no pool:', erro.message);
});

poolConexoes.on('remove', () => {
    if (process.env.NODE_ENV === 'development') {
        console.log('Cliente removido do pool');
    }
});

async function testarConexao(tentativas = 3) {
    for (let i = 0; i < tentativas; i++) {
        try {
            const cliente = await poolConexoes.connect();
            await cliente.query('SELECT NOW()');
            console.log('Conectado ao banco de dados PostgreSQL');
            cliente.release();
            return true;
        } catch (erro) {
            console.error(`Tentativa ${i + 1}/${tentativas} - Erro ao conectar ao banco:`, erro.message);
            if (i < tentativas - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // backoff exponencial
            }
        }
    }
    return false;
}

async function consulta(texto, parametros) {
    const inicio = Date.now();
    try {
        let query, valores;
        
        if (typeof texto === 'object' && texto.text) {
            query = texto.text;
            valores = texto.values;
        } else {
            query = texto;
            valores = parametros;
        }

        const resposta = await poolConexoes.query(query, valores);
        
        // Log de queries lentas (> 1s)
        const duracao = Date.now() - inicio;
        if (duracao > 1000) {
            console.warn(`Query lenta (${duracao}ms):`, query.substring(0, 100));
        }
        
        return resposta;
    } catch (erro) {
        console.error('Erro na query:', erro.message);
        throw erro;
    }
}

async function obterClienteTransacao() {
    const cliente = await poolConexoes.connect();
    return cliente;
}

function obterEstatisticasPool() {
    return {
        total: poolConexoes.totalCount,
        idle: poolConexoes.idleCount,
        waiting: poolConexoes.waitingCount
    };
}

const bancoDados = {
    pool: poolConexoes,
    query: consulta,
    testConnection: testarConexao,
    getClient: obterClienteTransacao,
    getPoolStats: obterEstatisticasPool
};

module.exports = bancoDados;
module.exports.default = bancoDados;