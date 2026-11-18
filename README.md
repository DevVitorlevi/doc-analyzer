# Doc Analyzer

API para gerenciamento e análise de documentos. Permite autenticação com Google, envio de arquivos, extração de texto, análise com IA e armazenamento dos documentos.

## Tecnologias

- Node.js
- TypeScript
- Fastify
- PostgreSQL
- Prisma ORM
- Google OAuth 2.0
- OpenAI API
- Backblaze B2 / armazenamento compatível com Amazon S3
- Vitest
- Swagger / OpenAPI

## Requisitos

- Node.js 20.16 ou superior
- npm
- Docker e Docker Compose
- Credenciais de um cliente OAuth 2.0 do Google
- Chave de API da OpenAI
- Bucket e credenciais de um serviço de armazenamento compatível com S3

## Instalação

Clone o repositório:

```bash
git clone <REPOSITORY_URL>
cd doc-analyzer
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

Configure as variáveis descritas na seção [Variáveis de ambiente](#variáveis-de-ambiente).

## Variáveis de ambiente

A aplicação utiliza as seguintes variáveis no arquivo `.env`:

| Variável               | Descrição                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `NODE_ENV`             | Ambiente de execução (`development`, `test` ou `production`).                                    |
| `PORT`                 | Porta HTTP da API. Padrão: `3333`.                                                               |
| `API_URL`              | URL pública/base da API.                                                                         |
| `WEB_URL`              | URL da aplicação web utilizada na configuração de CORS e nos redirecionamentos OAuth.            |
| `DATABASE_URL`         | URL de conexão com o PostgreSQL principal.                                                       |
| `TEST_DATABASE_URL`    | URL do banco reservado aos testes de integração.                                                 |
| `GOOGLE_CLIENT_ID`     | Client ID do OAuth 2.0 do Google.                                                                |
| `GOOGLE_CLIENT_SECRET` | Client Secret do OAuth 2.0 do Google.                                                            |
| `GOOGLE_REDIRECT_URI`  | URI de callback registrada no Google Cloud.                                                      |
| `SESSION_SECRET`       | Segredo usado para assinar os tokens de sessão. Deve possuir pelo menos 32 caracteres.           |
| `S3_ENDPOINT`          | Endpoint do serviço compatível com S3. Opcional para serviços que usam o endpoint padrão da AWS. |
| `S3_REGION`            | Região do bucket.                                                                                |
| `S3_ACCESS_KEY_ID`     | Identificador da chave de acesso ao armazenamento.                                               |
| `S3_SECRET_ACCESS_KEY` | Chave secreta de acesso ao armazenamento.                                                        |
| `S3_BUCKET`            | Nome do bucket utilizado para armazenar documentos.                                              |
| `OPENAI_API_KEY`       | Chave de API da OpenAI.                                                                          |
| `OPENAI_MODEL`         | Modelo utilizado na análise. Padrão: `gpt-4o-mini`.                                              |
| `OPENAI_TIMEOUT_MS`    | Tempo limite das requisições à OpenAI, em milissegundos.                                         |
| `MAX_FILE_SIZE_MB`     | Tamanho máximo permitido para upload, em MB. Padrão: `10`.                                       |
| `MAX_TEXT_CHARS`       | Quantidade máxima de caracteres do texto encaminhado para análise.                               |

Não versione arquivos `.env` com credenciais reais. Utilize `.env.example` apenas como referência de configuração.

## Banco de dados

O projeto utiliza PostgreSQL e disponibiliza dois serviços no Docker Compose: um banco de desenvolvimento e outro isolado para testes de integração.

Inicie os bancos:

```bash
docker compose up -d postgres postgres_test
```

O banco principal fica disponível em:

```text
localhost:5432
```

O banco de testes fica disponível em:

```text
localhost:5433
```

As credenciais e os nomes dos bancos locais estão definidos no `docker-compose.yml`.

### Prisma

Gere o Prisma Client:

```bash
npx prisma generate --schema apps/api/prisma/schema.prisma
```

Execute as migrations no banco configurado em `DATABASE_URL`:

```bash
npx prisma migrate dev --schema apps/api/prisma/schema.prisma
```

Para consultar o estado das migrations:

```bash
npx prisma migrate status --schema apps/api/prisma/schema.prisma
```

**Atenção:** antes de executar migrations, confira se `DATABASE_URL` aponta para o banco desejado. Não utilize o banco de testes para executar migrations de desenvolvimento.

## Google OAuth

A autenticação utiliza OAuth 2.0 do Google.

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie ou selecione um projeto.
3. Configure a tela de consentimento OAuth.
4. Crie uma credencial do tipo OAuth Client ID para aplicação Web.
5. Cadastre a URI de redirecionamento:

```text
http://localhost:3333/auth/google/callback
```

6. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` no `.env`.

O fluxo utiliza os escopos `openid`, `email` e `profile`. Após a autenticação, a API cria a sessão por meio de um cookie HTTP-only.

## Armazenamento de arquivos

Os documentos originais são armazenados em um serviço compatível com a API S3.

Configure:

- `S3_ENDPOINT`, quando o provedor exigir endpoint próprio;
- `S3_REGION`;
- `S3_ACCESS_KEY_ID`;
- `S3_SECRET_ACCESS_KEY`;
- `S3_BUCKET`.

O projeto pode utilizar Backblaze B2 com a API S3 ou outro serviço compatível.

Para validar a configuração do armazenamento, execute:

```bash
npm run smoke:storage -w apps/api
```

O teste de integração com o provedor depende de credenciais e de um bucket acessível.

## Executando a API

Com o `.env` preenchido e o banco principal iniciado, execute:

```bash
npm run dev
```

A API ficará disponível em:

```text
http://localhost:3333
```

Verifique a disponibilidade:

```bash
curl http://localhost:3333/health
```

## Documentação da API

A documentação interativa é disponibilizada pelo Swagger UI:

```text
http://localhost:3333/documentation
```

A especificação OpenAPI em JSON fica disponível em:

```text
http://localhost:3333/documentation/json
```

A documentação descreve os endpoints, parâmetros, payloads, respostas, erros e autenticação por cookie.

## Endpoints

| Método   | Endpoint                | Autenticação | Descrição                                         |
| -------- | ----------------------- | ------------ | ------------------------------------------------- |
| `GET`    | `/health`               | Não          | Verifica a disponibilidade da API.                |
| `GET`    | `/auth/google`          | Não          | Inicia o fluxo OAuth do Google.                   |
| `GET`    | `/auth/google/callback` | Não          | Processa o retorno do OAuth.                      |
| `GET`    | `/me`                   | Sim          | Retorna o usuário autenticado.                    |
| `POST`   | `/auth/logout`          | Sim          | Encerra a sessão.                                 |
| `POST`   | `/documents`            | Sim          | Envia um documento para análise.                  |
| `GET`    | `/documents`            | Sim          | Lista os documentos do usuário.                   |
| `GET`    | `/documents/:id`        | Sim          | Retorna os detalhes de um documento.              |
| `POST`   | `/documents/:id/retry`  | Sim          | Tenta processar novamente um documento com falha. |
| `DELETE` | `/documents/:id`        | Sim          | Exclui um documento.                              |

### Upload de documentos

O endpoint `POST /documents` recebe `multipart/form-data` com:

- `title`: título do documento;
- `instruction`: instrução para a análise;
- `file`: arquivo a ser enviado.

Os formatos suportados são PDF, DOCX e TXT. O limite de tamanho é configurável por `MAX_FILE_SIZE_MB`.

A criação do documento retorna HTTP `201`. Caso a análise falhe depois da persistência, o documento continua disponível com status `FAILED` e informações sobre a falha.

### Estados de processamento

| Status       | Descrição                        |
| ------------ | -------------------------------- |
| `PROCESSING` | Documento em processamento.      |
| `COMPLETED`  | Análise concluída.               |
| `FAILED`     | Processamento ou análise falhou. |

O reprocessamento é permitido somente para documentos com status `FAILED`.

### Autenticação

As rotas protegidas utilizam o cookie de sessão `doc_analyzer_session`, configurado como HTTP-only. Não é necessário enviar um token Bearer manualmente.

## Testes

O projeto utiliza Vitest para testes unitários e de integração.

### Testes unitários

```bash
npm run test:unit -w apps/api
```

### Testes de integração

Os testes de integração exigem o banco exclusivo de testes.

Crie o arquivo `.env.test` na raiz do projeto com:

```env
TEST_DATABASE_URL=postgresql://doc_analyzer:doc_analyzer@localhost:5433/doc_analyzer_test
```

Inicie o banco de testes:

```bash
docker compose up -d postgres_test
```

Execute os testes:

```bash
npm run test:integration -w apps/api
```

A infraestrutura de testes valida se a conexão está direcionada ao banco local reservado para testes. Não altere essa proteção para apontar os testes de integração ao banco de desenvolvimento ou de produção.

### Todos os testes

```bash
npm test
```

## Verificações estáticas

Execute o ESLint:

```bash
npm run lint
```

Execute o TypeScript:

```bash
npm run typecheck
```

## Scripts da API

| Script                                 | Descrição                                |
| -------------------------------------- | ---------------------------------------- |
| `npm run dev`                          | Inicia a API em modo de desenvolvimento. |
| `npm run typecheck -w apps/api`        | Verifica os tipos TypeScript da API.     |
| `npm run test:unit -w apps/api`        | Executa os testes unitários.             |
| `npm run test:integration -w apps/api` | Executa os testes de integração.         |
| `npm run smoke:storage -w apps/api`    | Valida a integração com o armazenamento. |
| `npm run smoke:openai -w apps/api`     | Valida a integração com a OpenAI.        |

## Estrutura do projeto

```text
doc-analyzer/
├── apps/
│   └── api/
│       ├── openapi.json
│       ├── prisma/
│       │   ├── migrations/
│       │   └── schema.prisma
│       ├── scripts/
│       ├── src/
│       │   ├── config/
│       │   ├── integrations/
│       │   ├── modules/
│       │   ├── repositories/
│       │   ├── shared/
│       │   ├── app.ts
│       │   └── server.ts
│       └── tests/
│           ├── helpers/
│           ├── integration/
│           └── unit/
├── docker-compose.yml
├── package.json
└── README.md
```

## Segurança

- Segredos e credenciais devem permanecer em arquivos de ambiente fora do controle de versão.
- A sessão utiliza cookie HTTP-only.
- As rotas de documentos verificam a autenticação e o acesso do usuário ao recurso.
- Os testes de integração possuem proteção para impedir o uso acidental do banco de desenvolvimento.
- As URLs de acesso aos arquivos são temporárias e assinadas pelo serviço de armazenamento.
