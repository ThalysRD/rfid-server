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
    connectionTimeoutMillis: 0,
    idleTimeoutMillis: 0,
    max: 20
});

async function testarConexao() {
    try {
        const cliente = await poolConexoes.connect();
        console.log('Conectado ao banco de dados PostgreSQL');
        cliente.release();
        return true;
    } catch (erro) {
        console.error('Erro ao conectar ao banco:', erro.message);
        return false;
    }
}

async function consulta(texto, parametros) {
    try {
        if (typeof texto === 'object' && texto.text) {
            const resposta = await poolConexoes.query(texto.text, texto.values);
            return resposta;
        }

        const resposta = await poolConexoes.query(texto, parametros);
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

const bancoDados = {
    pool: poolConexoes,
    query: consulta,
    testConnection: testarConexao,
    getClient: obterClienteTransacao
};

module.exports = bancoDados;
module.exports.default = bancoDados;