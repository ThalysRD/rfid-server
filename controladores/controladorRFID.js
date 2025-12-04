const bancoDados = require('../infra/bancoDados');

// Funções auxiliares para reduzir duplicação de código
function validarLeitura(leitura) {
    const erros = [];

    // Campos obrigatórios
    if (!leitura.idTag) erros.push('idTag é obrigatório');
    if (!leitura.idDispositivo) erros.push('idDispositivo é obrigatório');

    // Validar ranges de coordenadas GPS (apenas se fornecidas)
    if (leitura.latitude !== undefined && leitura.latitude !== null) {
        if (leitura.latitude < -90 || leitura.latitude > 90) {
            erros.push('latitude deve estar entre -90 e 90');
        }
    }
    if (leitura.longitude !== undefined && leitura.longitude !== null) {
        if (leitura.longitude < -180 || leitura.longitude > 180) {
            erros.push('longitude deve estar entre -180 e 180');
        }
    }
    if (leitura.altitude !== undefined && leitura.altitude !== null) {
        if (typeof leitura.altitude !== 'number') {
            erros.push('altitude deve ser um número');
        }
    }

    return erros;
}

function mapearLeitura(linha) {
    return {
        id: linha.id,
        idTag: linha.idTag,
        idDispositivo: linha.idDispositivo,
        dataHoraLeitura: linha.dataHoraLeitura,
        latitude: linha.latitude,
        longitude: linha.longitude,
        altitude: linha.altitude,
        criadoEm: linha.criadoEm
    };
}

const controladorRfid = {
    criarLeitura: async (req, res) => {
        try {
            const leituras = Array.isArray(req.body) ? req.body : [req.body];

            if (process.env.NODE_ENV === 'development') {
                console.log('Dados recebidos:', {
                    totalLeituras: leituras.length,
                    recebidoEm: new Date().toISOString()
                });
            }

            // Validar todas as leituras usando função auxiliar
            const errosValidacao = [];
            const leiturasValidas = [];

            leituras.forEach((leitura, i) => {
                const erros = validarLeitura(leitura);
                if (erros.length > 0) {
                    errosValidacao.push({ indice: i, leitura, erros });
                } else {
                    leiturasValidas.push(leitura);
                }
            });

            // Se há erros de validação, retornar todos os erros
            if (errosValidacao.length > 0) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Erro de validação em algumas leituras',
                    errosValidacao,
                    contadorLeiturasValidas: leiturasValidas.length,
                    totalLeiturasRecebidas: leituras.length
                });
            }

            // Usar bulk insert para melhor performance quando houver múltiplas leituras
            let leiturasInseridas = [];
            
            if (leiturasValidas.length > 1) {
                // Bulk insert - muito mais rápido para múltiplas inserções
                const valores = [];
                const placeholders = [];
                
                leiturasValidas.forEach((leitura, i) => {
                    const base = i * 6;
                    placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
                    valores.push(
                        leitura.idTag,
                        leitura.idDispositivo,
                        leitura.dataHoraLeitura || null,
                        leitura.latitude || null,
                        leitura.longitude || null,
                        leitura.altitude || null
                    );
                });

                const query = `
                    INSERT INTO leituras_rfid 
                    ("idTag", "idDispositivo", "dataHoraLeitura", "latitude", "longitude", "altitude") 
                    VALUES ${placeholders.join(', ')}
                    RETURNING *
                `;

                const resultado = await bancoDados.query(query, valores);
                leiturasInseridas = resultado.rows;
                console.log(`${leiturasInseridas.length} leituras salvas via bulk insert`);
                
            } else if (leiturasValidas.length === 1) {
                // Insert único
                const leitura = leiturasValidas[0];
                const resultado = await bancoDados.query(`
                    INSERT INTO leituras_rfid 
                    ("idTag", "idDispositivo", "dataHoraLeitura", "latitude", "longitude", "altitude") 
                    VALUES ($1, $2, $3, $4, $5, $6) 
                    RETURNING *
                `, [
                    leitura.idTag,
                    leitura.idDispositivo,
                    leitura.dataHoraLeitura || null,
                    leitura.latitude || null,
                    leitura.longitude || null,
                    leitura.altitude || null
                ]);
                leiturasInseridas = resultado.rows;
            }

            res.status(201).json({
                sucesso: true,
                mensagem: `${leiturasInseridas.length} leituras RFID processadas com sucesso`,
                estatisticas: {
                    totalRecebido: leituras.length,
                    leiturasValidas: leiturasValidas.length,
                    insercoesBemSucedidas: leiturasInseridas.length
                },
                dados: leiturasInseridas.map(mapearLeitura)
            });

        } catch (erro) {
            console.error('Erro ao salvar leitura RFID:', erro.message);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro interno do servidor',
                mensagem: process.env.NODE_ENV === 'development' ? erro.message : 'Erro ao processar leituras'
            });
        }
    },

    obterTodasLeituras: async (req, res) => {
        try {
            const limite = Math.min(parseInt(req.query.limite) || 50, 1000); // Máximo 1000
            const deslocamento = parseInt(req.query.deslocamento) || 0;

            const resultado = await bancoDados.query(`
                SELECT "id", "idTag", "idDispositivo", "dataHoraLeitura", "latitude", "longitude", "altitude", "criadoEm" 
                FROM leituras_rfid 
                ORDER BY "criadoEm" DESC 
                LIMIT $1 OFFSET $2
            `, [limite, deslocamento]);

            res.json({
                sucesso: true,
                leituras: resultado.rows.map(mapearLeitura),
                total: resultado.rowCount,
                paginacao: {
                    limite,
                    deslocamento
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
            const limite = Math.min(parseInt(req.query.limite) || 20, 1000);

            if (!idTag || idTag.trim() === '') {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'idTag inválido'
                });
            }

            const resultado = await bancoDados.query(`
                SELECT "id", "idTag", "idDispositivo", "dataHoraLeitura", "latitude", "longitude", "altitude", "criadoEm" 
                FROM leituras_rfid 
                WHERE "idTag" = $1 
                ORDER BY "criadoEm" DESC 
                LIMIT $2
            `, [idTag, limite]);

            res.json({
                sucesso: true,
                idTag,
                leituras: resultado.rows.map(mapearLeitura),
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

    obterLeiturasPorDispositivo: async (req, res) => {
        try {
            const { idDispositivo } = req.params;
            const limite = Math.min(parseInt(req.query.limite) || 20, 1000);

            if (!idDispositivo || idDispositivo.trim() === '') {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'idDispositivo inválido'
                });
            }

            const resultado = await bancoDados.query(`
                SELECT "id", "idTag", "idDispositivo", "dataHoraLeitura", "latitude", "longitude", "altitude", "criadoEm" 
                FROM leituras_rfid 
                WHERE "idDispositivo" = $1 
                ORDER BY "criadoEm" DESC 
                LIMIT $2
            `, [idDispositivo, limite]);

            res.json({
                sucesso: true,
                idDispositivo,
                leituras: resultado.rows.map(mapearLeitura),
                contagem: resultado.rowCount
            });

        } catch (erro) {
            console.error('Erro ao buscar leituras por dispositivo:', erro.message);
            res.status(500).json({
                sucesso: false,
                erro: erro.message
            });
        }
    },

    obterLeiturasPorPeriodo: async (req, res) => {
        try {
            const { dataInicio, dataFim } = req.query;
            const limite = Math.min(parseInt(req.query.limite) || 50, 1000);

            if (!dataInicio || !dataFim) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'dataInicio e dataFim são obrigatórios',
                    formato: 'ISO 8601 (ex: 2024-01-01T00:00:00Z)'
                });
            }

            // Validar formato de data
            const inicio = new Date(dataInicio);
            const fim = new Date(dataFim);
            
            if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Formato de data inválido',
                    formato: 'ISO 8601 (ex: 2024-01-01T00:00:00Z)'
                });
            }

            if (inicio > fim) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'dataInicio deve ser anterior a dataFim'
                });
            }

            const resultado = await bancoDados.query(`
                SELECT "id", "idTag", "idDispositivo", "dataHoraLeitura", "latitude", "longitude", "altitude", "criadoEm" 
                FROM leituras_rfid 
                WHERE "criadoEm" BETWEEN $1 AND $2 
                ORDER BY "criadoEm" DESC 
                LIMIT $3
            `, [dataInicio, dataFim, limite]);

            res.json({
                sucesso: true,
                periodo: { dataInicio, dataFim },
                leituras: resultado.rows.map(mapearLeitura),
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