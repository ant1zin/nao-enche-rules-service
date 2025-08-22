# 🔒 NÃO ENCHE - Rules Service

Serviço de gerenciamento de regras de privacidade para o sistema NÃO ENCHE. Este serviço é responsável por criar, gerenciar e avaliar regras de privacidade personalizadas para cada usuário.

## 🚀 Funcionalidades

### ✨ Gerenciamento de Regras de Privacidade
- **CRUD completo** de regras de privacidade
- **Validação inteligente** de configurações de regras
- **Sistema de prioridades** para ordenação de execução
- **Auditoria completa** de todas as alterações

### 🛡️ Padrões de Ameaças
- **Detecção de spam** com palavras-chave configuráveis
- **Identificação de phishing** com análise de URLs
- **Proteção contra malware** com verificação de extensões
- **Detecção de assédio** e conteúdo abusivo
- **Proteção de informações pessoais** (SSN, cartões, emails)

### 📋 Templates de Regras
- **Templates pré-configurados** para casos comuns
- **Categorização inteligente** por tipo de proteção
- **Personalização fácil** para necessidades específicas
- **Templates públicos e privados**

### 🔍 Avaliação de Regras
- **Processamento em tempo real** de mensagens
- **Análise de múltiplas regras** simultaneamente
- **Decisões inteligentes** baseadas em prioridade
- **Logs detalhados** de todas as avaliações

## 🏗️ Arquitetura

### Estrutura do Serviço
```
src/
├── app.js                 # Aplicação principal
├── middleware/            # Middlewares (metrics, error handling)
├── routes/               # Rotas da API
│   ├── health.js         # Health check
│   ├── rules.js          # Gerenciamento de regras
│   ├── privacy.js        # Regras específicas de privacidade
│   ├── threats.js        # Padrões de ameaças
│   └── patterns.js       # Templates de regras
├── services/             # Lógica de negócio
│   ├── DatabaseService.js # Conexão e operações do banco
│   └── RulesService.js   # Serviço principal de regras
└── utils/                # Utilitários
    ├── logger.js         # Sistema de logging
    └── validation.js     # Validação de dados
```

### Banco de Dados
- **PostgreSQL** com suporte a JSONB para configurações flexíveis
- **Tabelas principais:**
  - `privacy_rules` - Regras de privacidade dos usuários
  - `threat_patterns` - Padrões de ameaças conhecidas
  - `rule_templates` - Templates reutilizáveis
  - `rule_audit_log` - Log de auditoria completo

## 🚀 Instalação e Configuração

### Pré-requisitos
- Node.js 24+
- PostgreSQL 15+
- npm 10+

### 1. Clone o repositório
```bash
git clone <repository-url>
cd nao-enche-rules-service
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/nao_enche_rules_db

# Service Configuration
PORT=3008
NODE_ENV=development
LOG_LEVEL=info

# Security
JWT_SECRET=your-super-secret-key-here
ADMIN_TOKEN=your-admin-token-here

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Metrics
ENABLE_METRICS=true
```

### 4. Configure o banco de dados
```bash
# Execute a migração
npm run migrate

# (Opcional) Insira dados de teste
npm run seed

# Ou execute ambos
npm run db:setup
```

### 5. Inicie o serviço
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 📚 API Reference

### Endpoints Principais

#### 🔒 Regras de Privacidade
- `GET /api/v1/rules` - Listar regras do usuário
- `GET /api/v1/rules/:id` - Obter regra específica
- `POST /api/v1/rules` - Criar nova regra
- `PUT /api/v1/rules/:id` - Atualizar regra
- `DELETE /api/v1/rules/:id` - Deletar regra
- `POST /api/v1/rules/evaluate` - Avaliar regras contra mensagem

#### 🛡️ Padrões de Ameaças
- `GET /api/v1/threats` - Listar padrões de ameaças
- `GET /api/v1/threats/:id` - Obter padrão específico
- `GET /api/v1/threats/risk/:level` - Filtrar por nível de risco
- `GET /api/v1/threats/type/:type` - Filtrar por tipo

#### 📋 Templates de Regras
- `GET /api/v1/patterns` - Listar templates
- `GET /api/v1/patterns/:id` - Obter template específico
- `POST /api/v1/patterns/:id/create-rule` - Criar regra a partir do template
- `GET /api/v1/patterns/category/:category` - Filtrar por categoria

#### 🔒 Regras de Privacidade (Específicas)
- `GET /api/v1/privacy` - Listar regras de privacidade
- `GET /api/v1/privacy/active` - Apenas regras ativas
- `GET /api/v1/privacy/type/:type` - Filtrar por tipo
- `GET /api/v1/privacy/priority/:priority` - Filtrar por prioridade
- `PUT /api/v1/privacy/bulk` - Atualização em lote
- `DELETE /api/v1/privacy/bulk` - Remoção em lote
- `GET /api/v1/privacy/stats/:userId` - Estatísticas das regras
- `GET /api/v1/privacy/export/:userId` - Exportar regras

### Exemplos de Uso

#### Criar uma Regra de Filtro por Palavras-chave
```bash
curl -X POST http://localhost:3008/api/v1/rules \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "rule_type": "keyword_filter",
    "rule_name": "Block Spam",
    "rule_description": "Block messages with spam keywords",
    "rule_config": {
      "keywords": ["buy now", "limited time", "act fast"],
      "max_occurrences": 2,
      "action": "block"
    },
    "priority": 1
  }'
```

#### Avaliar Regras contra uma Mensagem
```bash
curl -X POST http://localhost:3008/api/v1/rules/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-123",
    "message": {
      "text": "Buy now! Limited time offer!",
      "sender": "spammer@example.com",
      "channel": "whatsapp"
    }
  }'
```

#### Obter Estatísticas das Regras
```bash
curl -X GET http://localhost:3008/api/v1/privacy/stats/user-123
```

## 🧪 Testes e Desenvolvimento

### Scripts Disponíveis
```bash
# Desenvolvimento
npm run dev              # Inicia com nodemon
npm run lint             # Verifica código
npm run lint:fix         # Corrige problemas de linting
npm run format           # Formata código
npm run format:check     # Verifica formatação

# Banco de dados
npm run migrate          # Executa migrações
npm run seed             # Insere dados de teste
npm run db:setup         # Migra + seed

# Produção
npm start                # Inicia o serviço
npm run build            # Build (não aplicável para Node.js)
```

### Estrutura de Dados de Teste
O script de seed cria:
- **5 usuários de teste** (user-001, user-002, etc.)
- **6 regras de privacidade** de exemplo
- **8 padrões de ameaças** pré-configurados
- **6 templates de regras** reutilizáveis
- **3 logs de auditoria** de exemplo

## 🚀 Deploy

### Docker
```bash
# Build da imagem
docker build -t nao-enche/rules-service:latest .

# Executar container
docker run -p 3008:3008 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  nao-enche/rules-service:latest
```

### Kubernetes
```bash
# Aplicar manifests
kubectl apply -f k8s/base/

# Verificar status
kubectl get pods -n nao-enche-business
kubectl logs -f deployment/rules-service -n nao-enche-business
```

## 📊 Monitoramento

### Health Check
- **Endpoint:** `/health`
- **Verifica:** Conexão com banco de dados, status do serviço
- **Resposta:** Status, uptime, versão, timestamp

### Métricas
- **Prometheus** integrado para coleta de métricas
- **Métricas disponíveis:** Requests, latência, erros, regras processadas

### Logs
- **Winston** para logging estruturado
- **Níveis:** error, warn, info, debug
- **Arquivos:** error.log, combined.log, audit.log
- **Formato:** JSON com timestamp e metadados

## 🔐 Segurança

### Autenticação
- **JWT** para autenticação de usuários
- **Admin tokens** para operações administrativas
- **Validação** de entrada com Joi

### Rate Limiting
- **Limite padrão:** 100 requests por 15 minutos
- **Configurável** via variáveis de ambiente
- **Por IP** para prevenir abuso

### Validação
- **Joi schemas** para validação de entrada
- **Sanitização** de dados sensíveis
- **Prevenção** de SQL injection

## 🤝 Contribuição

### Padrões de Código
- **ESLint** para qualidade de código
- **Prettier** para formatação consistente
- **Conventional Commits** para mensagens de commit

### Estrutura de Commits
```
feat: add new rule evaluation endpoint
fix: resolve database connection issue
docs: update API documentation
test: add unit tests for RulesService
refactor: improve rule validation logic
```

## 📝 Licença

Este projeto faz parte do sistema NÃO ENCHE e está sob licença proprietária.

## 🆘 Suporte

Para suporte técnico ou dúvidas:
- **Issues:** GitHub Issues
- **Documentação:** README e comentários no código
- **Equipe:** Time de desenvolvimento NÃO ENCHE

---

**🔒 NÃO ENCHE Rules Service** - Protegendo sua privacidade, uma regra por vez.

