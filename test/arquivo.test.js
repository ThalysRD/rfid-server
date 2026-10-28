const request = require('supertest');

jest.mock('../infra/bancoDados', () => ({
    query: jest.fn(),
    getClient: jest.fn(),
    testConnection: jest.fn(),
    getPoolStats: jest.fn(),
    pool: {}
}));

const bancoDados = require('../infra/bancoDados');
const app = require('../app');

// Cliente de transação falso: registra cada comando enviado ao banco.
function clienteFalso({ falharNaInsercao = 0 } = {}) {
    let insercoes = 0;
    const cliente = {
        comandos: [],
        release: jest.fn(),
        query: jest.fn(async (sql, valores) => {
            cliente.comandos.push(sql.trim().split(/\s+/)[0]);
            if (sql.includes('INSERT')) {
                insercoes += 1;
                if (insercoes === falharNaInsercao) throw new Error('violação de restrição');
                return { rows: [{ id: insercoes, idTag: valores[0], idDispositivo: valores[1] }] };
            }
            return { rows: [] };
        })
    };
    return cliente;
}

const arquivo = (linhas) => Buffer.from(linhas.join('\n'), 'utf-8');

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/rfid/arquivo', () => {
    it('importa as linhas válidas dentro de uma transação', async () => {
        const cliente = clienteFalso();
        bancoDados.getClient.mockResolvedValueOnce(cliente);

        const resposta = await request(app)
            .post('/api/rfid/arquivo')
            .attach('arquivo', arquivo([
                '{"idTag":"A","idDispositivo":"esp32-01"}',
                '{"idTag":"B","idDispositivo":"esp32-01"}'
            ]), 'leituras.txt');

        expect(resposta.status).toBe(201);
        expect(resposta.body.transacao.status).toBe('confirmada');
        expect(resposta.body.validacao.leiturasInseridas).toBe(2);
        expect(cliente.comandos).toEqual(['BEGIN', 'INSERT', 'INSERT', 'COMMIT']);
        expect(cliente.release).toHaveBeenCalled();
    });

    it('ignora linhas que não são JSON e informa quais foram', async () => {
        bancoDados.getClient.mockResolvedValueOnce(clienteFalso());

        const resposta = await request(app)
            .post('/api/rfid/arquivo')
            .attach('arquivo', arquivo([
                '{"idTag":"A","idDispositivo":"esp32-01"}',
                'linha corrompida pela queda de energia'
            ]), 'leituras.txt');

        expect(resposta.status).toBe(201);
        expect(resposta.body.processamento.jsonsInvalidos).toBe(1);
        expect(resposta.body.errosProcessamento[0].indice).toBe(1);
    });

    it('desfaz tudo (ROLLBACK) se uma inserção falhar', async () => {
        const cliente = clienteFalso({ falharNaInsercao: 2 });
        bancoDados.getClient.mockResolvedValueOnce(cliente);

        const resposta = await request(app)
            .post('/api/rfid/arquivo')
            .attach('arquivo', arquivo([
                '{"idTag":"A","idDispositivo":"esp32-01"}',
                '{"idTag":"B","idDispositivo":"esp32-01"}'
            ]), 'leituras.txt');

        expect(resposta.status).toBe(500);
        expect(resposta.body.transacao.status).toBe('revertida');
        expect(cliente.comandos).toEqual(['BEGIN', 'INSERT', 'INSERT', 'ROLLBACK']);
        expect(cliente.release).toHaveBeenCalled();
    });

    it('devolve 400 quando nenhuma linha é JSON válido', async () => {
        const resposta = await request(app)
            .post('/api/rfid/arquivo')
            .attach('arquivo', arquivo(['nada aqui', 'nem aqui']), 'leituras.txt');

        expect(resposta.status).toBe(400);
        expect(bancoDados.getClient).not.toHaveBeenCalled();
    });

    it('devolve 400 quando nenhum arquivo é enviado', async () => {
        const resposta = await request(app).post('/api/rfid/arquivo');

        expect(resposta.status).toBe(400);
        expect(resposta.body.erro).toBe('Arquivo não foi enviado');
    });

    it('devolve 400 (e não 500) para arquivo que não é TXT', async () => {
        const resposta = await request(app)
            .post('/api/rfid/arquivo')
            .attach('arquivo', Buffer.from('%PDF-1.4'), { filename: 'leituras.pdf', contentType: 'application/pdf' });

        expect(resposta.status).toBe(400);
        expect(resposta.body.erro).toBe('Arquivo inválido');
    });
});
