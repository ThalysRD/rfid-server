# 📡 Servidor RFID - ESP32

API otimizada para gerenciamento de leituras RFID com ESP32 e PostgreSQL. Sistema de alta performance com suporte a coordenadas GPS e processamento em lote.

## 🚀 Características

- ✅ **API RESTful** em Node.js com Express
- ✅ **PostgreSQL otimizado** com pool de conexões inteligente
- ✅ **Bulk insert** - processamento rápido de múltiplas leituras
- ✅ **Suporte a GPS** - coordenadas geográficas (latitude, longitude, altitude)
- ✅ **Graceful shutdown** - encerramento seguro sem perda de dados
- ✅ **Retry logic** - reconexão automática ao banco de dados
- ✅ **Query optimization** - detecção de queries lentas
- ✅ **Health checks** - monitoramento completo do sistema
- ✅ **Rate limiting** - proteção contra abuso
- ✅ **Upload de arquivos** - processamento de leituras via TXT
- ✅ **Compatível com ESP32**

## ⚡ Performance

- **Bulk insert**: até **90% mais rápido** para múltiplas leituras
- **Queries paralelas**: otimização automática de consultas
- **Pool otimizado**: 2-20 conexões com reciclagem inteligente
- **Logging condicional**: mínimo overhead em produção

## 📁 Estrutura do Projeto

```
rfid-server/
├── controladores/
│   ├── controladorRFID.js      # Lógica de negócio RFID (com bulk insert)
│   ├── controladorSaude.js     # Health checks e status do sistema
│   └── controladorArquivo.js   # Upload e processamento de arquivos
├── infra/
│   └── bancoDados.js           # Pool PostgreSQL otimizado + retry logic
├── rotas/
│   └── index.js                # Definição e organização das rotas
├── middleware/                 # Middlewares (autenticação, etc)
├── server.js                   # Servidor principal + graceful shutdown
├── package.json
├── .env.example
└── README.md
```

## 🗄️ Estrutura do Banco de Dados

### Tabela: `leituras_rfid`

```sql
CREATE TABLE leituras_rfid (
    "id" SERIAL PRIMARY KEY,
    "idTag" VARCHAR(255) NOT NULL,
    "idDispositivo" VARCHAR(255) NOT NULL,
    "dataHoraLeitura" TIMESTAMP,
    "latitude" DECIMAL(10, 8),      -- Coordenada GPS (-90 a 90)
    "longitude" DECIMAL(11, 8),     -- Coordenada GPS (-180 a 180)
    "altitude" DECIMAL(10, 2),      -- Altitude em metros
    "criadoEm" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance otimizada
CREATE INDEX idx_leituras_rfid_idtag ON leituras_rfid("idTag");
CREATE INDEX idx_leituras_rfid_dispositivo ON leituras_rfid("idDispositivo");
CREATE INDEX idx_leituras_rfid_criado ON leituras_rfid("criadoEm");
CREATE INDEX idx_leituras_rfid_data_leitura ON leituras_rfid("dataHoraLeitura");
```

> **Importante**: Os nomes das colunas usam aspas duplas para preservar o camelCase no PostgreSQL.

## 🛠️ Instalação

1. **Clone o repositório:**

```bash
git clone https://github.com/ThalysRD/rfid-server.git
cd rfid-server
```

2. **Instale as dependências:**

```bash
npm install
```

3. **Configure as variáveis de ambiente:**

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# 🗄️ Banco de Dados PostgreSQL
PGHOST=seu-host-postgres
PGDATABASE=seu-banco-dados
PGUSER=seu-usuario
PGPASSWORD=sua-senha

# 🚀 Servidor
PORT=3000
NODE_ENV=production

# 🔒 CORS (separar múltiplas origens com vírgula)
CORS_ORIGIN=http://localhost:3000,https://seu-frontend.com

# 📊 Logging (opcional)
ENABLE_LOGGING=true
POOL_DEBUG=false
```

4. **Inicie o servidor:**

```bash
npm start
```

## 📚 Endpoints da API

### 🔍 Saúde do Sistema

| Método | Endpoint        | Descrição                   |
| ------ | --------------- | --------------------------- |
| GET    | `/api/saude`    | Verificar saúde do servidor |
| GET    | `/api/saude/bd` | Verificar conexão com banco |
| GET    | `/api/status`   | Status detalhado do sistema |

### 📡 Leituras RFID

| Método | Endpoint                               | Descrição                      | Observação                         |
| ------ | -------------------------------------- | ------------------------------ | ------------------------------------------------------------ 
| POST   | `/api/rfid/leitura`                    | Criar leitura(s) RFID          |
| POST   | `/api/rfid/arquivo`                    | Upload de arquivo TXT          | Modo padrão de operação do código atual do microcontrolador
| GET    | `/api/rfid/leituras`                   | Listar todas (paginado)        |
| GET    | `/api/rfid/tag/:idTag`                 | Leituras por tag específica    |
| GET    | `/api/rfid/dispositivo/:idDispositivo` | Leituras por dispositivo       |
| GET    | `/api/rfid/periodo`                    | Leituras por período de datas  |

## 📝 Exemplos de Uso

### 🔹 Leitura única (com GPS)

```bash
curl -X POST http://localhost:3000/api/rfid/leitura \
  -H "Content-Type: application/json" \
  -d '{
    "idTag": "A1B2C3D4E5F6",
    "idDispositivo": "esp32_001",
    "dataHoraLeitura": "2025-12-04T14:30:00Z",
    "latitude": -23.550520,
    "longitude": -46.633308,
    "altitude": 760.5
  }'
```

### 🔹 Múltiplas leituras (bulk insert - alta performance)

```bash
curl -X POST http://localhost:3000/api/rfid/leitura \
  -H "Content-Type: application/json" \
  -d '[
    {
      "idTag": "A1B2C3D4E5F6",
      "idDispositivo": "esp32_001",
      "dataHoraLeitura": "2025-12-04T14:30:00Z",
      "latitude": -23.550520,
      "longitude": -46.633308
    },
    {
      "idTag": "B2C3D4E5F6A1",
      "idDispositivo": "esp32_001",
      "dataHoraLeitura": "2025-12-04T14:31:15Z",
      "latitude": -23.550620,
      "longitude": -46.633408
    }
  ]'
```

### 🔹 Upload de arquivo TXT

```bash
curl -X POST http://localhost:3000/api/rfid/arquivo \
  -F "arquivo=@leituras.txt"
```

### 🔹 Buscar leituras com paginação

```bash
# Primeira página (50 registros)
curl "http://localhost:3000/api/rfid/leituras?limite=50&deslocamento=0"

# Segunda página
curl "http://localhost:3000/api/rfid/leituras?limite=50&deslocamento=50"
```

### 🔹 Buscar por período (validação de datas)

```bash
curl "http://localhost:3000/api/rfid/periodo?dataInicio=2025-12-01T00:00:00Z&dataFim=2025-12-31T23:59:59Z&limite=100"
```

### 🔹 Buscar por tag específica

```bash
curl "http://localhost:3000/api/rfid/tag/A1B2C3D4E5F6?limite=20"
```

## 📋 Campos da Leitura RFID

### Campos Obrigatórios:

- `idTag` (string): Identificador único da tag RFID
- `idDispositivo` (string): Identificador do dispositivo ESP32

### Campos Opcionais:

- `dataHoraLeitura` (string): Data/hora da leitura em formato ISO 8601
- `latitude` (number): Latitude GPS (-90 a 90)
- `longitude` (number): Longitude GPS (-180 a 180)
- `altitude` (number): Altitude em metros

### Validações Automáticas:

✅ Coordenadas GPS validadas automaticamente  
✅ Formato de data ISO 8601  
✅ Limites máximos de registros por consulta (até 1000)  
✅ Sanitização de inputs  

> **Performance:** Use bulk insert (array) para enviar múltiplas leituras - até 90% mais rápido!

## 🔧 Desenvolvimento

### Scripts disponíveis:

```bash
npm start          # Inicia o servidor em produção
npm run dev        # Modo desenvolvimento com nodemon
npm run check      # Valida sintaxe de todos os arquivos
npm run setup      # Testa conexão com banco de dados
```

### Variáveis de Ambiente para Debug:

```bash
NODE_ENV=development    # Ativa logs detalhados
ENABLE_LOGGING=true     # Logging de requisições
POOL_DEBUG=true         # Debug do pool de conexões
```

### Estrutura das Respostas:

#### ✅ Sucesso (bulk insert):

```json
{
  "sucesso": true,
  "mensagem": "2 leituras RFID processadas com sucesso",
  "estatisticas": {
    "totalRecebido": 2,
    "leiturasValidas": 2,
    "insercoesBemSucedidas": 2
  },
  "dados": [
    {
      "id": 123,
      "idTag": "A1B2C3D4E5F6",
      "idDispositivo": "esp32_001",
      "dataHoraLeitura": "2025-12-04T14:30:00Z",
      "latitude": -23.55052,
      "longitude": -46.633308,
      "altitude": 760.5,
      "criadoEm": "2025-12-04T14:30:05.123Z"
    },
    {
      "id": 124,
      "idTag": "B2C3D4E5F6A1",
      "idDispositivo": "esp32_001",
      "dataHoraLeitura": "2025-12-04T14:31:15Z",
      "latitude": -23.55062,
      "longitude": -46.633408,
      "altitude": null,
      "criadoEm": "2025-12-04T14:31:18.456Z"
    }
  ]
}
```

#### ❌ Erro de Validação:

```json
{
  "sucesso": false,
  "erro": "Erro de validação em algumas leituras",
  "errosValidacao": [
    {
      "indice": 0,
      "leitura": { "idDispositivo": "esp32_001" },
      "erros": ["idTag é obrigatório"]
    }
  ],
  "contadorLeiturasValidas": 0,
  "totalLeiturasRecebidas": 1
}
```

#### ⚠️ Query Parameters Inválidos:

```json
{
  "sucesso": false,
  "erro": "dataInicio e dataFim são obrigatórios",
  "formato": "ISO 8601 (ex: 2024-01-01T00:00:00Z)"
}
```

## 🏷️ Configuração do ESP32

### Exemplo com GPS (recomendado):

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPS++.h>

const char* ssid = "SUA_REDE_WIFI";
const char* password = "SUA_SENHA_WIFI";
const char* serverURL = "http://seu-servidor:3000/api/rfid/leitura";

TinyGPSPlus gps;

void enviarLeituraRFID(String idTag, double lat, double lng, double alt) {
    if(WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(serverURL);
        http.addHeader("Content-Type", "application/json");

        StaticJsonDocument<300> doc;
        doc["idTag"] = idTag;
        doc["idDispositivo"] = "esp32_001";
        doc["dataHoraLeitura"] = "2025-12-04T14:30:00Z"; // Use RTC se disponível
        doc["latitude"] = lat;
        doc["longitude"] = lng;
        doc["altitude"] = alt;

        String jsonString;
        serializeJson(doc, jsonString);

        int httpResponseCode = http.POST(jsonString);

        if(httpResponseCode == 201) {
            Serial.println("✅ Leitura enviada com sucesso!");
        } else {
            Serial.printf("❌ Erro HTTP: %d\n", httpResponseCode);
        }

        http.end();
    }
}

// Exemplo otimizado: múltiplas leituras em um único POST (bulk insert)
void enviarMultiplasLeituras(String tags[], int numTags) {
    if(WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(serverURL);
        http.addHeader("Content-Type", "application/json");

        DynamicJsonDocument doc(2048);
        JsonArray array = doc.to<JsonArray>();

        for(int i = 0; i < numTags; i++) {
            JsonObject obj = array.createNestedObject();
            obj["idTag"] = tags[i];
            obj["idDispositivo"] = "esp32_001";
            
            if(gps.location.isValid()) {
                obj["latitude"] = gps.location.lat();
                obj["longitude"] = gps.location.lng();
                obj["altitude"] = gps.altitude.meters();
            }
        }

        String jsonString;
        serializeJson(doc, jsonString);

        int httpResponseCode = http.POST(jsonString);

        if(httpResponseCode == 201) {
            Serial.printf("✅ %d leituras enviadas!\n", numTags);
        }

        http.end();
    }
}
```

### Exemplo básico (sem GPS):

```cpp
void enviarLeituraSimples(String idTag) {
    HTTPClient http;
    http.begin(serverURL);
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"idTag\":\"" + idTag + "\",\"idDispositivo\":\"esp32_001\"}";
    
    int code = http.POST(payload);
    Serial.println(code == 201 ? "✅ OK" : "❌ Erro");
    
    http.end();
}
```

## 🔄 Mudanças Recentes

### v2.1 - Performance & Otimizações (Dezembro 2024)

#### ⚡ Performance
- ✅ **Bulk insert**: inserção de múltiplas leituras em uma única query (90% mais rápido)
- ✅ **Queries paralelas**: operações simultâneas no endpoint `/status`
- ✅ **Pool otimizado**: 2-20 conexões com reciclagem automática
- ✅ **Detecção de queries lentas**: alerta automático para queries > 1s
- ✅ **Limites inteligentes**: máximo 1000 registros por consulta

#### 🔒 Segurança & Confiabilidade
- ✅ **Graceful shutdown**: encerramento seguro com SIGTERM/SIGINT
- ✅ **Retry logic**: reconexão automática ao banco (3 tentativas + backoff)
- ✅ **Validação rigorosa**: coordenadas GPS, datas, limites
- ✅ **CORS configurável**: controle de origens permitidas
- ✅ **Logging condicional**: mínimo overhead em produção

#### 🆕 Novas Features
- ✅ **Suporte a GPS**: latitude, longitude e altitude
- ✅ **Upload de arquivos**: processamento de leituras via TXT
- ✅ **Estatísticas do pool**: monitoramento de conexões ativas
- ✅ **Health check avançado**: uptime, memória, versões
- ✅ **Validação de período**: valida range de datas

### v2.0 - Sistema Simplificado

- ✅ **Dados essenciais**: foco em `idTag`, `idDispositivo`, `dataHoraLeitura`
- ✅ **Rota unificada**: uma única rota para leituras únicas e múltiplas
- ✅ **API mais limpa**: estrutura simplificada e organizada

## 🔍 Monitoramento

### Health Checks:

```bash
# Saúde básica do servidor
curl http://localhost:3000/api/saude

# Resposta:
{
  "status": "OK",
  "dataHora": "2025-12-04T18:30:00.123Z",
  "tempoAtivo": "3600s",
  "memoria": {
    "rss": "50MB",
    "heapTotal": "20MB",
    "heapUsed": "15MB",
    "external": "2MB"
  },
  "versaoNode": "v20.10.0"
}
```

```bash
# Status detalhado do sistema
curl http://localhost:3000/api/status

# Resposta:
{
  "atualizado_em": "2025-12-04T18:30:00.123Z",
  "servidor": {
    "ambiente": "production",
    "versao_node": "v20.10.0",
    "uptime": "3600s"
  },
  "dependencias": {
    "banco_dados": {
      "versao": "PostgreSQL 15.3",
      "max_conexoes": 100,
      "conexoes_ativas": 5,
      "pool": {
        "total": 10,
        "idle": 8,
        "waiting": 0
      }
    }
  }
}
```

### Métricas de Performance:

- **Queries lentas**: automaticamente logadas (> 1s)
- **Pool de conexões**: monitoramento em tempo real
- **Tempo de resposta**: incluído nos logs de requisição
- **Uptime**: disponível em `/api/saude`

## 📊 Logs e Debug

### Logs Automáticos:

O servidor registra automaticamente:

- 📝 **Requisições HTTP** (método, rota, status, duração)
- ✅ **Leituras processadas** com estatísticas
- ❌ **Erros de validação** com detalhes
- 🔄 **Reconexões** ao banco de dados
- ⚠️ **Queries lentas** (> 1 segundo)
- 🚫 **Tentativas de acesso** sem autorização
- 💾 **Pool de conexões** (debug mode)

### Exemplo de Logs:

```
🚀 Iniciando servidor RFID...
✅ Conectado ao banco de dados PostgreSQL
✅ SERVIDOR RFID INICIADO
📡 Porta: 3000
🏥 Saúde: /api/saude
📝 API: /api/rfid/leitura
🌍 Ambiente: production

[2025-12-04T18:30:15.123Z] POST /api/rfid/leitura - 201 (45ms)
✅ 5 leituras salvas via bulk insert

[2025-12-04T18:31:20.456Z] GET /api/rfid/leituras - 200 (12ms)

⚠️ Query lenta (1523ms): SELECT * FROM leituras_rfid WHERE...
```


## ❓ FAQ

**P: Como otimizar para muitas leituras simultâneas?**  
R: Use bulk insert (envie array de leituras) e aumente o pool de conexões no `.env`.

**P: O servidor perde dados ao reiniciar?**  
R: Não! O graceful shutdown garante que todas as conexões sejam fechadas adequadamente.

**P: Como adicionar autenticação?**  
R: Descomente o middleware de autenticação em `/rotas/index.js` e configure API keys.

**P: Posso usar MySQL ao invés de PostgreSQL?**  
R: Não recomendado. O código usa features específicas do PostgreSQL.

**P: Como fazer backup do banco?**  
R: Use `pg_dump` ou ferramentas do seu provedor (Vercel, Neon, Supabase).

**P: O GPS é obrigatório?**  
R: Não! Latitude, longitude e altitude são campos opcionais.
---
