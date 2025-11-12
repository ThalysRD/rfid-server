const bancoDados = require('../infra/bancoDados');

const controladorArquivo = {
    processarArquivoTxt: async (req, res) => {
        try {
            // Verificar se arquivo foi enviado
            if (!req.file) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Arquivo não foi enviado',
                    mensagem: 'Por favor, envie um arquivo TXT contendo JSONs'
                });
            }

            // Verificar se é arquivo TXT
            if (!req.file.mimetype.includes('text') && !req.file.originalname.endsWith('.txt')) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Tipo de arquivo inválido',
                    mensagem: 'Por favor, envie um arquivo .txt',
                    tipoRecebido: req.file.mimetype
                });
            }

            // Converter buffer para string
            const conteudoArquivo = req.file.buffer.toString('utf-8');
            
            console.log('Arquivo recebido:', {
                nome: req.file.originalname,
                tamanho: req.file.size,
                linhas: conteudoArquivo.split('\n').length,
                recebidoEm: new Date().toISOString()
            });

            // Separar por linhas e processar JSONs
            const linhas = conteudoArquivo
                .split('\n')
                .map(linha => linha.trim())
                .filter(linha => linha.length > 0);

            const jsonsProcessados = [];
            const errosProcessamento = [];

            // Processar cada linha como um JSON
            for (let i = 0; i < linhas.length; i++) {
                try {
                    const json = JSON.parse(linhas[i]);
                    jsonsProcessados.push({
                        indice: i,
                        json: json,
                        valido: true
                    });
                } catch (erro) {
                    errosProcessamento.push({
                        indice: i,
                        linha: linhas[i],
                        erro: erro.message
                    });
                }
            }

            console.log('JSONs processados:', {
                total: linhas.length,
                validos: jsonsProcessados.length,
                invalidos: errosProcessamento.length
            });

            // Se não há JSONs válidos, retornar erro
            if (jsonsProcessados.length === 0) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Nenhum JSON válido encontrado no arquivo',
                    mensagem: 'O arquivo TXT deve conter JSONs válidos, um por linha',
                    errosProcessamento: errosProcessamento,
                    totalLinhas: linhas.length
                });
            }

            // Validar e inserir JSONs no banco de dados
            const leituras = jsonsProcessados
                .filter(item => item.valido)
                .map(item => item.json);

            const leiturasValidas = [];
            const errosValidacao = [];

            for (let i = 0; i < leituras.length; i++) {
                const leitura = leituras[i];
                const erros = [];

                // Validar campos obrigatórios
                if (!leitura.idTag) {
                    erros.push('idTag é obrigatório');
                }
                if (!leitura.idDispositivo) {
                    erros.push('idDispositivo é obrigatório');
                }

                // Validar ranges de coordenadas GPS (apenas se fornecidas)
                if (leitura.latitude !== undefined && leitura.latitude !== null) {
                    if (typeof leitura.latitude !== 'number' || leitura.latitude < -90 || leitura.latitude > 90) {
                        erros.push('latitude deve estar entre -90 e 90');
                    }
                }
                if (leitura.longitude !== undefined && leitura.longitude !== null) {
                    if (typeof leitura.longitude !== 'number' || leitura.longitude < -180 || leitura.longitude > 180) {
                        erros.push('longitude deve estar entre -180 e 180');
                    }
                }
                if (leitura.altitude !== undefined && leitura.altitude !== null) {
                    if (typeof leitura.altitude !== 'number') {
                        erros.push('altitude deve ser um número');
                    }
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

            // Inserir leituras válidas no banco
            const leiturasInseridas = [];
            const errosInsercao = [];

            for (let i = 0; i < leiturasValidas.length; i++) {
                const leitura = leiturasValidas[i];

                try {
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

                    leiturasInseridas.push(resultado.rows[0]);
                    console.log(`Leitura ${i + 1} do arquivo inserida com sucesso`);

                } catch (erro) {
                    console.error(`Erro ao inserir leitura ${i + 1} do arquivo:`, erro.message);
                    errosInsercao.push({
                        indice: i,
                        leitura: leitura,
                        erro: erro.message
                    });
                }
            }

            // Preparar resposta detalhada
            const resposta = {
                sucesso: true,
                mensagem: `Arquivo processado: ${leiturasInseridas.length} leituras inseridas`,
                arquivo: {
                    nome: req.file.originalname,
                    tamanho: req.file.size,
                    processadoEm: new Date().toISOString()
                },
                processamento: {
                    linhasProcessadas: linhas.length,
                    jsonsValidos: jsonsProcessados.length,
                    jsonsInvalidos: errosProcessamento.length
                },
                validacao: {
                    leiturasValidas: leiturasValidas.length,
                    leiturasInvalidas: errosValidacao.length,
                    leiturasInseridas: leiturasInseridas.length,
                    errosInsercao: errosInsercao.length
                },
                dados: leiturasInseridas.map(linha => ({
                    id: linha.id,
                    idTag: linha.idTag,
                    idDispositivo: linha.idDispositivo,
                    dataHoraLeitura: linha.dataHoraLeitura,
                    latitude: linha.latitude,
                    longitude: linha.longitude,
                    altitude: linha.altitude,
                    criadoEm: linha.criadoEm
                }))
            };

            // Adicionar detalhes de erros se houver
            if (errosProcessamento.length > 0) {
                resposta.errosProcessamento = errosProcessamento;
            }
            if (errosValidacao.length > 0) {
                resposta.errosValidacao = errosValidacao;
            }
            if (errosInsercao.length > 0) {
                resposta.errosInsercao = errosInsercao;
            }

            const codigoStatus = leiturasInseridas.length > 0 ? 201 : 500;
            res.status(codigoStatus).json(resposta);

        } catch (erro) {
            console.error('Erro ao processar arquivo TXT:', erro.message);
            res.status(500).json({
                sucesso: false,
                erro: 'Erro interno ao processar arquivo',
                mensagem: erro.message
            });
        }
    }
};

module.exports = controladorArquivo;
