const bancoDados = require('../infra/bancoDados');

const controladorRfid = {
    criarLeitura: async (req, res) => {
        try {
            const leituras = Array.isArray(req.body) ? req.body : [req.body];

            console.log('Dados recebidos:', {
                totalLeituras: leituras.length,
                recebidoEm: new Date().toISOString()
            });

            // Validar todas as leituras
            const errosValidacao = [];
            const leiturasValidas = [];

            for (let i = 0; i < leituras.length; i++) {
                const leitura = leituras[i];
                const erros = [];

                if (!leitura.idTag) {
                    erros.push('idTag é obrigatório');
                }
                if (!leitura.nomeFuncionario) {
                    erros.push('nomeFuncionario é obrigatório');
                }
                if (!leitura.dataHoraLeitura) {
                    erros.push('dataHoraLeitura é obrigatório');
                }

                if (erros.length > 0) {
                    errosValidacao.push({
                        indice: i,
                        leitura: leitura,
                        erros: erros
                    });
                } else {
                    leiturasValidas.push(leitura);
                }
            }

            // Se há erros de validação, retornar todos os erros
            if (errosValidacao.length > 0) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Erro de validação em algumas leituras',
                    errosValidacao: errosValidacao,
                    contadorLeiturasValidas: leiturasValidas.length,
                    totalLeiturasRecebidas: leituras.length
                });
            }

            // Inserir todas as leituras válidas no banco
            const leiturasInseridas = [];
            const errosInsercao = [];

            for (let i = 0; i < leiturasValidas.length; i++) {
                const leitura = leiturasValidas[i];

                try {
                    const resultado = await bancoDados.query(`
                        INSERT INTO leituras_rfid 
                        (idTag, nomeFuncionario, dataHoraLeitura, rssi, localizacao, idDispositivo, criadoEm) 
                        VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
                        RETURNING *
                    `, [
                        leitura.idTag,
                        leitura.nomeFuncionario,
                        leitura.dataHoraLeitura,
                        leitura.rssi || null,
                        leitura.localizacao || 'desconhecido',
                        leitura.idDispositivo || 'esp32'
                    ]);

                    leiturasInseridas.push(resultado.rows[0]);
                    console.log(`Leitura ${i + 1} salva com sucesso`);

                } catch (erro) {
                    console.error(`Erro ao salvar leitura ${i + 1}:`, erro.message);
                    errosInsercao.push({
                        indice: i,
                        leitura: leitura,
                        erro: erro.message
                    });
                }
            }

            // Resposta com estatísticas completas
            const resposta = {
                sucesso: true,
                mensagem: `${leiturasInseridas.length} leituras RFID processadas com sucesso`,
                estatisticas: {
                    totalRecebido: leituras.length,
                    leiturasValidas: leiturasValidas.length,
                    insercoesBemSucedidas: leiturasInseridas.length,
                    erros: errosInsercao.length
                },
                dados: leiturasInseridas.map(linha => ({
                    id: linha.id,
                    idTag: linha.idtag,
                    nomeFuncionario: linha.nomefuncionario,
                    dataHoraLeitura: linha.datahoraleitura,
                    rssi: linha.rssi,
                    localizacao: linha.localizacao,
                    idDispositivo: linha.iddispositivo,
                    criadoEm: linha.criadoem
                }))
            };

            // Adicionar erros de inserção se houver
            if (errosInsercao.length > 0) {
                resposta.errosInsercao = errosInsercao;
                resposta.sucesso = leiturasInseridas.length > 0; // Sucesso parcial se pelo menos uma foi inserida
            }

            const codigoStatus = leiturasInseridas.length > 0 ? 201 : 500;
            res.status(codigoStatus).json(resposta);

        } catch (erro) {
            console.error('Erro ao salvar leitura RFID:', erro.message);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro interno do servidor',
                mensagem: erro.message
            });
        }
    },

    obterTodasLeituras: async (req, res) => {
        try {
            const { limite = 50, deslocamento = 0 } = req.query;

            const resultado = await bancoDados.query(`
                SELECT id, idTag, nomeFuncionario, dataHoraLeitura, rssi, localizacao, idDispositivo, criadoEm 
                FROM leituras_rfid 
                ORDER BY dataHoraLeitura DESC 
                LIMIT $1 OFFSET $2
            `, [limite, deslocamento]);

            res.json({
                sucesso: true,
                leituras: resultado.rows.map(linha => ({
                    id: linha.id,
                    idTag: linha.idtag,
                    nomeFuncionario: linha.nomefuncionario,
                    dataHoraLeitura: linha.datahoraleitura,
                    rssi: linha.rssi,
                    localizacao: linha.localizacao,
                    idDispositivo: linha.iddispositivo,
                    criadoEm: linha.criadoem
                })),
                total: resultado.rowCount,
                paginacao: {
                    limite: parseInt(limite),
                    deslocamento: parseInt(deslocamento)
                }
            });

        } catch (erro) {
            console.error('Erro ao buscar leituras:', erro.message);
            res.status(500).json({
                sucesso: false,
                erro: erro.message
            });
        }
    },

    obterLeiturasPorTag: async (req, res) => {
        try {
            const { idTag } = req.params;
            const { limite = 20 } = req.query;

            const resultado = await bancoDados.query(`
                SELECT id, idTag, nomeFuncionario, dataHoraLeitura, rssi, localizacao, idDispositivo, criadoEm 
                FROM leituras_rfid 
                WHERE idTag = $1 
                ORDER BY dataHoraLeitura DESC 
                LIMIT $2
            `, [idTag, limite]);

            res.json({
                sucesso: true,
                idTag,
                leituras: resultado.rows.map(linha => ({
                    id: linha.id,
                    idTag: linha.idtag,
                    nomeFuncionario: linha.nomefuncionario,
                    dataHoraLeitura: linha.datahoraleitura,
                    rssi: linha.rssi,
                    localizacao: linha.localizacao,
                    idDispositivo: linha.iddispositivo,
                    criadoEm: linha.criadoem
                })),
                contagem: resultado.rowCount
            });

        } catch (erro) {
            console.error('Erro ao buscar leituras por tag:', erro.message);
            res.status(500).json({
                sucesso: false,
                erro: erro.message
            });
        }
    },

    obterLeiturasPorFuncionario: async (req, res) => {
        try {
            const { nomeFuncionario } = req.params;
            const { limite = 20 } = req.query;

            const resultado = await bancoDados.query(`
                SELECT id, idTag, nomeFuncionario, dataHoraLeitura, rssi, localizacao, idDispositivo, criadoEm 
                FROM leituras_rfid 
                WHERE nomeFuncionario = $1 
                ORDER BY dataHoraLeitura DESC 
                LIMIT $2
            `, [nomeFuncionario, limite]);

            res.json({
                sucesso: true,
                nomeFuncionario,
                leituras: resultado.rows.map(linha => ({
                    id: linha.id,
                    idTag: linha.idtag,
                    nomeFuncionario: linha.nomefuncionario,
                    dataHoraLeitura: linha.datahoraleitura,
                    rssi: linha.rssi,
                    localizacao: linha.localizacao,
                    idDispositivo: linha.iddispositivo,
                    criadoEm: linha.criadoem
                })),
                contagem: resultado.rowCount
            });

        } catch (erro) {
            console.error('Erro ao buscar leituras por funcionário:', erro.message);
            res.status(500).json({
                sucesso: false,
                erro: erro.message
            });
        }
    },

    obterLeiturasPorPeriodo: async (req, res) => {
        try {
            const { dataInicio, dataFim } = req.query;
            const { limite = 50 } = req.query;

            if (!dataInicio || !dataFim) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'dataInicio e dataFim são obrigatórios'
                });
            }

            const resultado = await bancoDados.query(`
                SELECT id, idTag, nomeFuncionario, dataHoraLeitura, rssi, localizacao, idDispositivo, criadoEm 
                FROM leituras_rfid 
                WHERE dataHoraLeitura BETWEEN $1 AND $2 
                ORDER BY dataHoraLeitura DESC 
                LIMIT $3
            `, [dataInicio, dataFim, limite]);

            res.json({
                sucesso: true,
                periodoDatas: { dataInicio, dataFim },
                leituras: resultado.rows.map(linha => ({
                    id: linha.id,
                    idTag: linha.idtag,
                    nomeFuncionario: linha.nomefuncionario,
                    dataHoraLeitura: linha.datahoraleitura,
                    rssi: linha.rssi,
                    localizacao: linha.localizacao,
                    idDispositivo: linha.iddispositivo,
                    criadoEm: linha.criadoem
                })),
                contagem: resultado.rowCount
            });

        } catch (erro) {
            console.error('Erro ao buscar leituras por período:', erro.message);
            res.status(500).json({
                sucesso: false,
                erro: erro.message
            });
        }
    }
};

module.exports = controladorRfid;