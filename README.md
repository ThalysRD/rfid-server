# 📡 Servidor RFID - ESP32

API completa para gerenciamento de leituras RFID com ESP32 e PostgreSQL. Todos os nomes de variáveis, funções e endpoints estão em português para melhor compreensão.

## 🚀 Características

- ✅ API RESTful em Node.js com Express
- ✅ Banco de dados PostgreSQL
- ✅ Suporte a leituras únicas e em lote
- ✅ Validação completa de dados
- ✅ Sistema de saúde e monitoramento
- ✅ Estrutura de código totalmente em português
- ✅ Compatível com ESP32

## 📁 Estrutura do Projeto

```
rfid-server/
├── controladores/
│   ├── controladorRfid.js      # Controlador das leituras RFID
│   └── controladorSaude.js     # Controlador de saúde do sistema
├── infra/
│   └── bancoDados.js           # Configuração do banco PostgreSQL
├── rotas/
│   └── index.js                # Definição das rotas da API
├── server.js                   # Servidor principal
├── package.json
└── README.md
```

## 🗄️ Estrutura do Banco de Dados

### Tabela: `leituras_rfid`

```sql
CREATE TABLE leituras_rfid (
    id SERIAL PRIMARY KEY,
    id_tag VARCHAR(50) NOT NULL,
    nome_funcionario VARCHAR(255) NOT NULL,
    data_e_hora_leitura TIMESTAMP NOT NULL,
    rssi INTEGER,
    local VARCHAR(100),
    id_dispositivo VARCHAR(50),
    criado_em TIMESTAMP DEFAULT NOW()
);
```

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
PGHOST=seu-host-postgres
PGDATABASE=seu-banco-dados
PGUSER=seu-usuario
PGPASSWORD=sua-senha
PORT=3000
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

| Método | Endpoint                                 | Descrição                   |
| ------ | ---------------------------------------- | --------------------------- |
| POST   | `/api/rfid/leitura`                      | Criar leitura(s) RFID       |
| POST   | `/api/rfid/lote`                         | Criar múltiplas leituras    |
| GET    | `/api/rfid/leituras`                     | Listar todas as leituras    |
| GET    | `/api/rfid/tag/:idTag`                   | Leituras por tag específica |
| GET    | `/api/rfid/funcionario/:nomeFuncionario` | Leituras por funcionário    |
| GET    | `/api/rfid/periodo`                      | Leituras por período        |

## 📝 Exemplos de Uso

### 🔹 Leitura única

```bash
curl -X POST http://localhost:3000/api/rfid/leitura \
  -H "Content-Type: application/json" \
  -d '{
    "idTag": "A1B2C3D4E5F6",
    "nomeFuncionario": "João Silva",
    "dataHoraLeitura": "2025-09-04T14:30:00Z",
    "rssi": -45,
    "localizacao": "entrada",
    "idDispositivo": "esp32_001"
  }'
```

### 🔹 Múltiplas leituras

```bash
curl -X POST http://localhost:3000/api/rfid/leitura \
  -H "Content-Type: application/json" \
  -d '[
    {
      "idTag": "A1B2C3D4E5F6",
      "nomeFuncionario": "João Silva",
      "dataHoraLeitura": "2025-09-04T14:30:00Z",
      "rssi": -45,
      "localizacao": "entrada",
      "idDispositivo": "esp32_001"
    },
    {
      "idTag": "1234567890AB",
      "nomeFuncionario": "Maria Santos",
      "dataHoraLeitura": "2025-09-04T14:31:15Z",
      "rssi": -52,
      "localizacao": "saida",
      "idDispositivo": "esp32_002"
    }
  ]'
```

### 🔹 Buscar leituras por período

```bash
curl "http://localhost:3000/api/rfid/periodo?dataInicio=2025-09-01&dataFim=2025-09-30&limite=100"
```

## 📋 Campos da Leitura RFID

### Obrigatórios:

- `idTag` (string): Identificador da tag RFID
- `nomeFuncionario` (string): Nome do funcionário
- `dataHoraLeitura` (string): Data/hora da leitura (ISO 8601)

### Opcionais:

- `rssi` (number): Intensidade do sinal (-100 a 0)
- `localizacao` (string): Local da leitura (padrão: "desconhecido")
- `idDispositivo` (string): ID do dispositivo ESP32 (padrão: "esp32")

## 🔧 Desenvolvimento

### Scripts disponíveis:

```bash
npm start          # Inicia o servidor
npm run dev        # Inicia em modo desenvolvimento
npm run check      # Verifica sintaxe dos arquivos
npm run setup      # Testa conexão com banco
```

### Estrutura das Respostas:

#### ✅ Sucesso:

```json
{
  "sucesso": true,
  "mensagem": "1 leituras RFID processadas com sucesso",
  "estatisticas": {
    "totalRecebido": 1,
    "leiturasValidas": 1,
    "insercoesBemSucedidas": 1,
    "erros": 0
  },
  "dados": [
    {
      "id": 123,
      "idTag": "A1B2C3D4E5F6",
      "nomeFuncionario": "João Silva",
      "dataHoraLeitura": "2025-09-04T14:30:00Z",
      "rssi": -45,
      "localizacao": "entrada",
      "idDispositivo": "esp32_001",
      "criadoEm": "2025-09-04T14:30:05Z"
    }
  ]
}
```

#### ❌ Erro:

```json
{
  "sucesso": false,
  "erro": "Erro de validação em algumas leituras",
  "errosValidacao": [
    {
      "indice": 0,
      "leitura": {...},
      "erros": ["idTag é obrigatório"]
    }
  ]
}
```

## 🏷️ Configuração do ESP32

### Exemplo de código Arduino para ESP32:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "SUA_REDE_WIFI";
const char* password = "SUA_SENHA_WIFI";
const char* serverURL = "http://seu-servidor:3000/api/rfid/leitura";

void enviarLeituraRFID(String idTag, String nomeFuncionario) {
    if(WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(serverURL);
        http.addHeader("Content-Type", "application/json");

        StaticJsonDocument<200> doc;
        doc["idTag"] = idTag;
        doc["nomeFuncionario"] = nomeFuncionario;
        doc["dataHoraLeitura"] = "2025-09-04T14:30:00Z";
        doc["idDispositivo"] = "esp32_001";
        doc["localizacao"] = "entrada";

        String jsonString;
        serializeJson(doc, jsonString);

        int httpResponseCode = http.POST(jsonString);

        if(httpResponseCode > 0) {
            String response = http.getString();
            Serial.println("Resposta: " + response);
        }

        http.end();
    }
}
```

## 🔍 Monitoramento

### Verificar saúde:

```bash
curl http://localhost:3000/api/saude
```

### Status do banco:

```bash
curl http://localhost:3000/api/saude/bd
```

## 📊 Logs

O servidor registra automaticamente:

- 📝 Todas as requisições HTTP
- ✅ Leituras salvas com sucesso
- ❌ Erros de validação e banco
- 🔍 Conexões com banco de dados

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📧 Contato

- **Desenvolvedor:** ThalysRD
- **GitHub:** [https://github.com/ThalysRD](https://github.com/ThalysRD)

---

⭐ Se este projeto foi útil para você, considere dar uma estrela no repositório!
