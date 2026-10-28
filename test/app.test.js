const request = require('supertest');

jest.mock('../infra/bancoDados', () => ({
    query: jest.fn(),
    getClient: jest.fn(),
    testConnection: jest.fn(),
    getPoolStats: jest.fn(() => ({ total: 2, idle: 2, waiting: 0 })),
    pool: {}
}));

const bancoDados = require('../infra/bancoDados');
const app = require('../app');
const { lerPaginacao, validarLeitura } = require('../controladores/controladorRFID');

beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Rotas gerais', () => {
    it('GET /api/saude responde OK sem depender do banco', async () => {
        const resposta = await request(app).get('/api/saude');

        expect(resposta.status).toBe(200);
        expect(resposta.body.status).toBe('OK');
        expect(bancoDados.query).not.toHaveBeenCalled();
    });

    it('GET /api/saude/bd devolve 500 quando o banco está fora', async () => {
        bancoDados.testConnection.mockResolvedValueOnce(false);
        bancoDados.query.mockRejectedValueOnce(new Error('timeout'));

        const resposta = await request(app).get('/api/saude/bd');

        expect(resposta.status).toBe(500);
        expect(resposta.body.bancoDados.conectado).toBe(false);
    });

    it('rota inexistente devolve 404 em JSON', async () => {
        const resposta = await request(app).get('/api/nao-existe');

        expect(resposta.status).toBe(404);
        expect(resposta.body.caminho).toBe('/api/nao-existe');
    });

    it('serve a documentação OpenAPI', async () => {
        const json = await request(app).get('/api/docs/openapi.json');
        expect(json.status).toBe(200);
        expect(json.body.paths).toHaveProperty('/rfid/leitura');

        const pagina = await request(app).get('/api/docs/');
        expect(pagina.status).toBe(200);
        expect(pagina.text).toMatch(/swagger/i);
    });
});

describe('lerPaginacao', () => {
    it.each([
        [{}, { pagina: 1, limite: 50, deslocamento: 0 }],
        [{ pagina: '2', limite: '10' }, { pagina: 2, limite: 10, deslocamento: 10 }],
        [{ limite: '5000' }, { pagina: 1, limite: 200, deslocamento: 0 }],
        [{ pagina: '-3', limite: 'abc' }, { pagina: 1, limite: 50, deslocamento: 0 }],
        [{ page: '4', limit: '25' }, { pagina: 4, limite: 25, deslocamento: 75 }]
    ])('%j vira %j', (query, esperado) => {
        expect(lerPaginacao(query)).toEqual(esperado);
    });
});

describe('validarLeitura', () => {
    it('aceita leitura mínima', () => {
        expect(validarLeitura({ idTag: 'A', idDispositivo: 'B' })).toEqual([]);
    });

    it('aponta longitude fora do intervalo e altitude não numérica', () => {
        expect(validarLeitura({ idTag: 'A', idDispositivo: 'B', longitude: 200, altitude: '10' })).toEqual([
            'longitude deve estar entre -180 e 180',
            'altitude deve ser um número'
        ]);
    });
});
