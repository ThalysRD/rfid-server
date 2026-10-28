-- Esquema usado pelos controladores (colunas em camelCase entre aspas).
CREATE TABLE IF NOT EXISTS leituras_rfid (
    "id" SERIAL PRIMARY KEY,
    "idTag" VARCHAR(255) NOT NULL,
    "idDispositivo" VARCHAR(255) NOT NULL,
    "dataHoraLeitura" TIMESTAMP,
    "latitude" DECIMAL(10, 8),
    "longitude" DECIMAL(11, 8),
    "altitude" DECIMAL(10, 2),
    "criadoEm" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leituras_rfid_idtag ON leituras_rfid("idTag");
CREATE INDEX IF NOT EXISTS idx_leituras_rfid_dispositivo ON leituras_rfid("idDispositivo");
CREATE INDEX IF NOT EXISTS idx_leituras_rfid_criado ON leituras_rfid("criadoEm");
CREATE INDEX IF NOT EXISTS idx_leituras_rfid_data_leitura ON leituras_rfid("dataHoraLeitura");
