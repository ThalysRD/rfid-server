const express = require('express');
const swaggerUi = require('swagger-ui-express');
const especificacao = require('../docs/openapi.json');

const roteador = express.Router();

// JSON bruto da especificação, útil para importar no Postman ou Insomnia.
roteador.get('/openapi.json', (req, res) => res.json(especificacao));
roteador.use('/', swaggerUi.serve, swaggerUi.setup(especificacao, {
    customSiteTitle: 'API RFID · Documentação'
}));

module.exports = roteador;
