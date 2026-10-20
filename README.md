# API RFID — Node.js e PostgreSQL

API para receber e consultar leituras RFID de dispositivos, incluindo coordenadas e horário. Projeto de formação no contexto educacional do EmbarcaTech, integrado a um [dashboard Next.js](https://github.com/ThalysRD/Dashboard-RFID).

## Recursos implementados

- Recebimento de uma leitura ou lote JSON.
- Importação de arquivo TXT com Multer, limitada a 10 MB.
- Consulta paginada, por tag, dispositivo ou período.
- Endpoints de saúde, consulta de banco e status.
- Validação dos campos e acesso ao PostgreSQL por pool de conexões.

## Rotas

| Método | Endpoint |
|---|---|
| GET | `/api/saude`, `/api/saude/bd`, `/api/status` |
| POST | `/api/rfid/leitura` |
| POST | `/api/rfid/arquivo` (multipart, campo `arquivo`) |
| GET | `/api/rfid/leituras?page=1` |
| GET | `/api/rfid/tag/:idTag` |
| GET | `/api/rfid/dispositivo/:idDispositivo` |
| GET | `/api/rfid/periodo?dataInicio=...&dataFim=...` |

## Preparar ambiente

Use Node/npm compatíveis com `package.json` e uma instância PostgreSQL com SSL compatível com `infra/bancoDados.js`.

```sh
npm ci
```

Configure um `.env` local conforme `.env.example`, com `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PORT` e `CORS_ORIGIN`. Use credenciais próprias. `infra/bancoDados.js` carrega esse arquivo com dotenv e fixa a conexão na porta 5432.

O banco precisa conter o esquema `leituras_rfid` esperado pelos controladores. A cópia atual não inclui `database/schema.sql`, embora haja um script `bd:schema` que o referencia; prepare o esquema antes de iniciar e não trate esse script como migração pronta. As instruções de esquema e exemplos históricos foram preservadas em [docs/README_ANTERIOR.md](docs/README_ANTERIOR.md), como referência a conferir com o código.

```sh
npm start
```

Após configurar o banco, consulte `GET http://localhost:3000/api/saude`.

## Contrato de leitura

Os nomes dos campos de entrada, mapeamentos e verificações estão em `controladores/controladorRFID.js`. Para TXT, consulte o parser em `controladores/controladorArquivo.js`; o formato não equivale a CSV genérico. O frontend consome `id`, `idTag`, `idDispositivo`, `dataHoraLeitura`, `latitude`, `longitude` e `altitude`.

## Limites e verificação

Não há autenticação implementada nas rotas, nem suíte automatizada: `npm test` é um placeholder. O script `check` precisa de revisão de nome/capitalização de arquivo e não substitui testes. Não se declaram ganhos de performance, latência ou capacidade de usuários sem medições. Revise validação de certificados e restrinja o acesso antes de um deploy com dados reais.

A API, o banco e os serviços externos não foram executados nesta revisão documental. EmbarcaTech é residência educacional remunerada, sem vínculo de emprego; o projeto é apresentado como formação.
