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

const linhaDoBanco = (sobrescrever = {}) => ({
    id: 1,
    idTag: 'A1B2C3D4',
    idDispositivo: 'esp32-01',
    dataHoraLeitura: null,
    latitude: null,
    longitude: null,
    altitude: null,
    criadoEm: '2026-03-10T08:15:00.000Z',
    ...sobrescrever
});

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/rfid/leitura', () => {
    it('grava uma leitura válida e devolve 201', async () => {
        bancoDados.query.mockResolvedValueOnce({ rows: [linhaDoBanco()] });

        const resposta = await request(app)
            .post('/api/rfid/leitura')
            .send({ idTag: 'A1B2C3D4', idDispositivo: 'esp32-01' });

        expect(resposta.status).toBe(201);
        expect(resposta.body.sucesso).toBe(true);
        expect(resposta.body.dados).toHaveLength(1);
        expect(resposta.body.dados[0].idTag).toBe('A1B2C3D4');

        const [sql, valores] = bancoDados.query.mock.calls[0];
        expect(sql).toMatch(/INSERT INTO leituras_rfid/);
        expect(valores).toEqual(['A1B2C3D4', 'esp32-01', null, null, null, null]);
    });

    it('grava um lote em um único INSERT com parâmetros numerados', async () => {
        bancoDados.query.mockResolvedValueOnce({
            rows: [linhaDoBanco({ id: 1 }), linhaDoBanco({ id: 2, idTag: 'E5F6' })]
        });

        const resposta = await request(app)
            .post('/api/rfid/leitura')
            .send([
                { idTag: 'A1B2C3D4', idDispositivo: 'esp32-01', latitude: -5.83, longitude: -35.2 },
                { idTag: 'E5F6', idDispositivo: 'esp32-01' }
            ]);

        expect(resposta.status).toBe(201);
        expect(resposta.body.estatisticas.insercoesBemSucedidas).toBe(2);
        expect(bancoDados.query).toHaveBeenCalledTimes(1);

        const [sql, valores] = bancoDados.query.mock.calls[0];
        expect(sql).toContain('($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12)');
        expect(valores).toHaveLength(12);
    });

    it('recusa leitura sem idTag e sem idDispositivo, sem tocar no banco', async () => {
        const resposta = await request(app).post('/api/rfid/leitura').send({});

        expect(resposta.status).toBe(400);
        expect(resposta.body.errosValidacao[0].erros).toEqual([
            'idTag é obrigatório',
            'idDispositivo é obrigatório'
        ]);
        expect(bancoDados.query).not.toHaveBeenCalled();
    });

    it('recusa o lote inteiro se uma leitura tiver latitude fora do intervalo', async () => {
        const resposta = await request(app)
            .post('/api/rfid/leitura')
            .send([
                { idTag: 'A', idDispositivo: 'esp32-01' },
                { idTag: 'B', idDispositivo: 'esp32-01', latitude: 120 }
            ]);

        expect(resposta.status).toBe(400);
        expect(resposta.body.contadorLeiturasValidas).toBe(1);
        expect(resposta.body.errosValidacao[0].indice).toBe(1);
        expect(bancoDados.query).not.toHaveBeenCalled();
    });

    it('devolve 400 para JSON malformado', async () => {
        const resposta = await request(app)
            .post('/api/rfid/leitura')
            .set('Content-Type', 'application/json')
            .send('{"idTag": ');

        expect(resposta.status).toBe(400);
        expect(resposta.body.erro).toMatch(/JSON inválido/);
    });

    it('devolve 500 quando o banco falha', async () => {
        bancoDados.query.mockRejectedValueOnce(new Error('conexão recusada'));

        const resposta = await request(app)
            .post('/api/rfid/leitura')
            .send({ idTag: 'A', idDispositivo: 'esp32-01' });

        expect(resposta.status).toBe(500);
        expect(resposta.body.sucesso).toBe(false);
    });
});

describe('GET /api/rfid/leituras (paginação)', () => {
    it('usa página 1 e limite 50 por padrão', async () => {
        bancoDados.query
            .mockResolvedValueOnce({ rows: [linhaDoBanco()] })
            .mockResolvedValueOnce({ rows: [{ total: 1 }] });

        const resposta = await request(app).get('/api/rfid/leituras');

        expect(resposta.status).toBe(200);
        expect(resposta.body.paginacao).toEqual({ pagina: 1, limite: 50, total: 1, totalPaginas: 1 });
        expect(bancoDados.query.mock.calls[0][1]).toEqual([50, 0]);
    });

    it('calcula o deslocamento a partir de pagina e limite', async () => {
        bancoDados.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ total: 95 }] });

        const resposta = await request(app).get('/api/rfid/leituras?pagina=3&limite=20');

        expect(bancoDados.query.mock.calls[0][0]).toMatch(/LIMIT \$1 OFFSET \$2/);
        expect(bancoDados.query.mock.calls[0][1]).toEqual([20, 40]);
        expect(resposta.body.paginacao.totalPaginas).toBe(5);
    });

    it('aceita os nomes em inglês page e limit', async () => {
        bancoDados.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ total: 0 }] });

        await request(app).get('/api/rfid/leituras?page=2&limit=10');

        expect(bancoDados.query.mock.calls[0][1]).toEqual([10, 10]);
    });
});

describe('Consultas por tag, dispositivo e período', () => {
    it('filtra por tag usando parâmetro, sem concatenar SQL', async () => {
        bancoDados.query.mockResolvedValueOnce({ rows: [linhaDoBanco()], rowCount: 1 });

        const resposta = await request(app).get('/api/rfid/tag/A1B2C3D4');

        expect(resposta.status).toBe(200);
        expect(resposta.body.contagem).toBe(1);
        expect(bancoDados.query.mock.calls[0][0]).toMatch(/WHERE "idTag" = \$1/);
        expect(bancoDados.query.mock.calls[0][1]).toEqual(['A1B2C3D4']);
    });

    it('filtra por dispositivo', async () => {
        bancoDados.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const resposta = await request(app).get('/api/rfid/dispositivo/esp32-01');

        expect(resposta.status).toBe(200);
        expect(bancoDados.query.mock.calls[0][1]).toEqual(['esp32-01']);
    });

    it('exige dataInicio e dataFim', async () => {
        const resposta = await request(app).get('/api/rfid/periodo?dataInicio=2026-01-01T00:00:00Z');

        expect(resposta.status).toBe(400);
        expect(bancoDados.query).not.toHaveBeenCalled();
    });

    it('recusa data inválida', async () => {
        const resposta = await request(app).get('/api/rfid/periodo?dataInicio=ontem&dataFim=hoje');

        expect(resposta.status).toBe(400);
        expect(resposta.body.erro).toBe('Formato de data inválido');
    });

    it('recusa período com início depois do fim', async () => {
        const resposta = await request(app)
            .get('/api/rfid/periodo?dataInicio=2026-02-01T00:00:00Z&dataFim=2026-01-01T00:00:00Z');

        expect(resposta.status).toBe(400);
        expect(resposta.body.erro).toMatch(/anterior/);
    });

    it('consulta o período válido', async () => {
        bancoDados.query.mockResolvedValueOnce({ rows: [linhaDoBanco()], rowCount: 1 });

        const resposta = await request(app)
            .get('/api/rfid/periodo?dataInicio=2026-01-01T00:00:00Z&dataFim=2026-02-01T00:00:00Z');

        expect(resposta.status).toBe(200);
        expect(resposta.body.contagem).toBe(1);
    });
});
