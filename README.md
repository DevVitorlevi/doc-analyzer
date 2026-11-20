# Jus Digital Document Analyzer

Aplicativo web full-stack para autenticação com Google OAuth 2.0, envio de arquivos (`PDF`, `DOCX` e `TXT`), extração de texto, análise com Inteligência Artificial (`gpt-4o-mini`) e gerenciamento de documentos com armazenamento compatível com S3 (Backblaze B2).

---

## Sumário

1. [Visão Geral e Arquitetura](#visão-geral-e-arquitetura)
2. [Frontend (`apps/web`)](#frontend-appsweb)
3. [Backend (`apps/api`)](#backend-appsapi)
4. [Banco de Dados e Persistência](#banco-de-dados-e-persistência)
5. [Autenticação Google OAuth 2.0](#autenticação-google-oauth-20)
6. [Armazenamento de Arquivos: Backblaze B2 (S3-Compatible)](#armazenamento-de-arquivos-backblaze-b2-s3-compatible)
7. [Configuração Equivalente na AWS S3](#configuração-equivalente-na-aws-s3)
8. [API e Principais Fluxos](#api-e-principais-fluxos)
9. [Instalação, Configuração e Execução Local](#instalação-configuração-e-execução-local)
10. [Variáveis de Ambiente](#variáveis-de-ambiente)
11. [Testes Automatizados (Unitários, Componentes, Integração e E2E)](#testes-automatizados-unitários-componentes-integração-e-e2e)
12. [Deploy em Produção (Vercel + Railway)](#deploy-em-produção-vercel--railway)
13. [Decisões Técnicas e Limitações Conhecidas](#decisões-técnicas-e-limitações-conhecidas)

---

## 1. Visão Geral e Arquitetura

O **Jus Digital Document Analyzer** centraliza o envio e a análise de documentos (`PDF`, `DOCX` e `TXT`, limite padrão de `10 MB`) orientados por instrução do usuário via IA, mantendo isolamento de dados por usuário e armazenamento seguro de arquivos em bucket privado.

### Componentes da Arquitetura

- **Frontend (`apps/web`)**: Single Page Application (SPA) em React, TypeScript (`strict: true`) e Vite, com estilização via Tailwind CSS v4, tokens visuais em CSS variables, fonte **Geist** autohospedada, `@tanstack/react-query` para estado de servidor e primitivas acessíveis do Radix UI. Hospedado na **Vercel**.
- **Backend (`apps/api`)**: API REST em Node.js (`>= 20.16`) com TypeScript e Fastify, utilizando Prisma ORM e PostgreSQL, integração com Google OAuth 2.0, extração de texto, análise via OpenAI (`gpt-4o-mini`) e storage S3-compatível via `@aws-sdk/client-s3`. Hospedado no **Railway**.
- **Banco de Dados**: PostgreSQL gerenciado via Prisma ORM (`apps/api/prisma/schema.prisma`), com instâncias separadas para desenvolvimento e testes de integração no Docker Compose.
- **Serviços Externos**: Google OAuth 2.0 (autenticação), Backblaze B2 (armazenamento de objetos compatível com S3) e OpenAI API (análise de conteúdo).

### Fluxo Geral de uma Solicitação

```mermaid
flowchart LR
    U[Usuário / Navegador] --> W[Frontend apps/web\nVercel]
    W -->|Cookie HTTP-only\nvia same-origin rewrite| A[Backend apps/api\nRailway]
    A <--> DB[(PostgreSQL\nPrisma ORM)]
    A <--> B2[(Backblaze B2\nBucket Privado S3)]
    A <--> OAI[OpenAI API\ngpt-4o-mini]
    W -.->|Navegação OAuth| A
    A <--> G[Google OAuth 2.0]
```

1. O usuário acessa a aplicação web e inicia o login com Google via `/auth/google`.
2. Após o callback OAuth, o backend cria/atualiza o usuário no PostgreSQL e grava o cookie de sessão `doc_analyzer_session` (`HttpOnly`).
3. No upload (`POST /documents`), o frontend envia `multipart/form-data` (`title`, `instruction` e `file`) com `credentials: 'include'`.
4. O backend valida o arquivo, envia o objeto para o bucket privado no Backblaze B2, persiste os metadados no PostgreSQL, extrai o texto e solicita a análise à OpenAI.
5. O documento fica disponível na listagem e pode ser visualizado (`GET /documents/:id`), reprocessado quando `FAILED` (`POST /documents/:id/retry`) ou excluído (`DELETE /documents/:id`).

---

## 2. Frontend (`apps/web`)

- **Stack e Bibliotecas**: React, TypeScript (`strict: true`), Vite (porta `5173` em desenvolvimento com `strictPort`), Tailwind CSS v4, Radix UI (`Dialog`, `AlertDialog`, `DropdownMenu`), `lucide-react`, `sonner`, `@tanstack/react-query` e `pdfjs-dist` (`5.4.149` para renderização da capa da primeira página de PDF na prévia de upload).
- **Identidade Visual**: Tokens da paleta obrigatória (`#30A46C` primária, `#FCFCFD` superfície, `#D9D9E0` bordas, `#5BB98B` verde secundário, `#E5484D` erro, `#34C759` sucesso), tokens adicionais em `src/styles/tokens.css` e fonte **Geist** autohospedada (sem requisição a CDN).
- **Estrutura de Diretórios**:
  - `src/app/`: inicialização da aplicação, `providers.tsx`, `query-client.ts`, `router.tsx` (`/`, `/login`, `/app/documentos`, `*`) e tratamento de expiração de sessão (`401`).
  - `src/features/auth/`: `api.ts`, hook de sessão (`GET /me`), `RequireAuth.tsx` e `LoginPage.tsx`.
  - `src/features/documents/`: `types.ts`, `api.ts`, `queries.ts`, hooks de seleção/picker/drop/exclusão, `DocumentsPage.tsx` e componentes (`DocumentsEmptyState`, `DocumentGrid`, `DocumentCard`, `SelectionBar`, `UploadModal`, `AnalysisModal`, `ConfirmDeleteDialog`, `FilePreviewBlock`).
  - `src/components/layout/` e `src/components/ui/`: `AppShell`, `Sidebar` e componentes UI adaptados.
  - `src/lib/`: `http.ts` (`ApiError`, `credentials: 'include'`, tratamento de `204`), `errors.ts` (mapeamento por código para mensagens em PT-BR), `format.ts`, `file-validation.ts`, `pdf-cover.ts` e `utils.ts`.
  - `src/test/` e `e2e/`: setup do Vitest/RTL/MSW e suíte Playwright (`e2e/doc-analyzer.spec.ts`).
- **Comunicação com a API e Erros**: Componentes não chamam `fetch` diretamente; passam por hooks e serviços da feature sobre `lib/http.ts`. Erros são traduzidos por código via `lib/errors.ts`, sem expor mensagens brutas do servidor. Em `401` fora do `GET /me` inicial, o cache é limpo, o usuário retorna a `/login` e recebe notificação de sessão expirada.
- **Fluxos de Documentos**: Suporte a seleção de arquivo por input e drag-and-drop na área de documentos, validação prévia de formato (`PDF`, `DOCX`, `TXT`) e tamanho (`<= 10 MB`), modal de upload com campos obrigatórios (`title` 1–120, `instruction` 1–2000), grade com seleção individual/múltipla, modal de análise (texto puro com quebras preservadas; sem exibir a instrução), retry para documentos `FAILED` e exclusão única ou sequencial de vários itens.

---

## 3. Backend (`apps/api`)

- **Linguagem e Frameworks**: Node.js (`>= 20.16`), TypeScript, Fastify, Prisma ORM e PostgreSQL.
- **Organização**:
  - `src/config/env.ts` e `src/app.ts`: carregamento de variáveis de ambiente, registro de plugins (incluindo CORS e rotas) e inicialização do Fastify.
  - `src/modules/auth/`, `src/modules/documents/` e `src/modules/health/`: rotas, controladores, schemas e serviços de autenticação, documentos e saúde.
  - `src/repositories/document-repository.ts`: acesso a dados de documentos via Prisma.
  - `src/integrations/storage/`, `src/integrations/text-extraction/` e `src/integrations/openai/`: integração com storage S3-compatível, extração de texto e análise com IA.
  - `src/shared/`: conexão de banco, tratamento padronizado de erros e logger.
- **Regras de Negócio e Segurança**:
  - Sessão baseada no cookie `doc_analyzer_session` (`HttpOnly`), sem envio manual de token Bearer.
  - Isolamento por usuário autenticado (`401` sem sessão; `404` para recurso inexistente ou pertencente a outro usuário).
  - Validação de tipo de arquivo (`PDF`, `DOCX`, `TXT`), tamanho (`MAX_FILE_SIZE_MB`, padrão `10`) e limites de `title` (`1..120`) e `instruction` (`1..2000`).
  - Reprocessamento (`POST /documents/:id/retry`) restrito a documentos com status `FAILED` (retorna `409` em conflito de estado).
  - Erros estruturados no formato `{ error: { code, message } }`.

---

## 4. Banco de Dados e Persistência

- **Tecnologia**: PostgreSQL com Prisma ORM (`apps/api/prisma/schema.prisma`) e migrações em `apps/api/prisma/migrations/` (ex.: `20261117184442_init`).
- **Entidades e Relacionamentos**:
  - Usuários autenticados via Google OAuth (`User`) e documentos vinculados ao usuário (`Document`).
  - Cada registro de documento armazena metadados (`id`, `title`, `instruction`, `originalName`, `mimeType`, `sizeBytes`, `createdAt`), estado do processamento (`PROCESSING`, `COMPLETED`, `FAILED`), resultado da análise (`analysis`, `truncated`), informações de falha (`errorCode`, `errorMessage`) e a referência ao objeto armazenado no bucket.
- **Ambientes de Banco**: O `docker-compose.yml` provê `postgres` (desenvolvimento, porta `5432`) e `postgres_test` (testes de integração, porta `5433`).
- **Exclusão e Integridade**: Na exclusão de um documento (`DELETE /documents/:id`), o backend remove o objeto correspondente no storage e o registro correspondente no banco de dados (não há transação distribuída atômica única entre storage externo e banco relacional).

---

## 5. Autenticação Google OAuth 2.0

1. **Configuração no Google Cloud Console**:
   - Criar projeto, configurar a tela de consentimento OAuth (escopos `openid`, `email` e `profile`) e criar uma credencial **OAuth Client ID** do tipo aplicação Web.
   - Registrar as URIs de redirecionamento autorizadas (`GOOGLE_REDIRECT_URI`):
     - Local: `http://localhost:3333/auth/google/callback`
     - Produção: `https://doc-analyzerapi-production.up.railway.app/auth/google/callback`
2. **Credenciais**: Definir `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no ambiente do backend (nunca expor no frontend ou no Git).
3. **Fluxo e Sessão**:
   - O frontend redireciona o navegador para `${VITE_API_URL}/auth/google` (ou `/auth/google` quando `VITE_API_URL` está vazio com proxy same-origin).
   - O backend valida o `state` OAuth e o `code` no callback (`/auth/google/callback`), persiste o usuário e emite o cookie HTTP-only `doc_analyzer_session`.
   - `GET /me` retorna `200` com `{ id, name, email, picture }` quando autenticado, ou `401` `{ error: { code, message } }` quando não autenticado.
   - `POST /auth/logout` encerra a sessão (`204`).
   - _Observação de fluxo de falha OAuth_: quando o callback falha (ex.: `state` inválido ou ausência de `code`/`error`), a API responde `400`/`401` em JSON na própria URL de callback sem redirecionar automaticamente para a SPA.

---

## 6. Armazenamento de Arquivos: Backblaze B2 (S3-Compatible)

### 6.1 O que é o Backblaze B2 e Por que Foi Escolhido

O **Backblaze B2** é um serviço de armazenamento de objetos em nuvem com **compatibilidade com a API S3**. Ele permite armazenar arquivos binários como objetos identificados por chave dentro de buckets, mantendo custos competitivos de armazenamento e transferência.

No desafio técnico, o enunciado prevê o uso de armazenamento compatível com S3 e orienta que participantes que não consigam criar conta na AWS (por exemplo, por exigência de cartão de crédito) podem utilizar o **Backblaze B2** com o SDK oficial da AWS, documentando a configuração equivalente na AWS S3.

### 6.2 Passo a Passo de Configuração no Backblaze B2

1. **Criar conta**: Cadastre-se no Backblaze B2 e acesse o painel de armazenamento de objetos / buckets.
2. **Criar bucket**: Crie um bucket dedicado aos documentos da aplicação (ex.: `doc-analyzer-bucket`).
3. **Manter bucket privado**: Mantenha o bucket como **Private** (sem acesso público irrestrito).
4. **Identificar região e endpoint S3**: Localize o endpoint S3 compatível do bucket/conta (ex.: `https://s3.us-west-004.backblazeb2.com`) e a região correspondente (ex.: `us-west-004`).
5. **Criar Application Key**: Gere uma chave de aplicação no B2 anotando o **Key ID** (`S3_ACCESS_KEY_ID`) e a **Application Key** (`S3_SECRET_ACCESS_KEY`) no momento da criação.
6. **Aplicar permissões mínimas**: Restrinja a chave ao bucket da aplicação e às permissões necessárias de leitura, gravação e exclusão de objetos.
7. **Configurar variáveis no backend**: Preencha `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` e `S3_BUCKET` no ambiente da API.

### 6.3 Integração com o SDK Oficial da AWS (`@aws-sdk/client-s3`)

Como o Backblaze B2 expõe uma API compatível com o protocolo Amazon S3, o backend em Node.js utiliza o SDK oficial da AWS (`@aws-sdk/client-s3`) apontando `endpoint` para a variável de ambiente `S3_ENDPOINT`, `region` para `S3_REGION` e `credentials` para `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY`.

A configuração por variável de ambiente (`S3_ENDPOINT`) permite alternar o endpoint de destino sem reescrever a lógica de comandos S3 (`PutObject`, `GetObject`, `DeleteObject` e geração de URLs pré-assinadas, conforme implementado em `apps/api/src/integrations/storage/`).

### 6.4 Upload, Acesso e Presigned URLs

1. O usuário envia o arquivo via `POST /documents` (`multipart/form-data`).
2. O backend valida sessão, tipo (`PDF`, `DOCX`, `TXT`), tamanho e campos (`title`, `instruction`).
3. O backend envia o arquivo para o bucket privado no Backblaze B2 e grava o registro no PostgreSQL.
4. Quando o backend precisa acessar o arquivo para processamento ou gerar acesso temporário em `GET /documents/:id` (`DocumentDetailResponse.fileUrl`), utiliza **presigned URLs** (URLs assinadas temporariamente com validade padrão de `300` segundos, segundo a especificação OpenAPI).
5. **Cuidados com Presigned URLs**:
   - Permitem acesso temporário e autenticado por assinatura a um objeto de um bucket privado sem tornar o bucket público nem expor chaves estáticas ao cliente.
   - Têm prazo de expiração limitado e **não** devem ser armazenadas permanentemente nem gravadas em logs.
   - No frontend atual (`SDD` PD-02 opção A), a interface exibe ícone de tipo, tamanho e extensão (e capa da primeira página de PDF gerada no cliente no modal de upload), sem depender de `fileUrl` para renderizar a grade.

### 6.5 Segurança e Boas Práticas

- Manter o bucket **privado** e utilizar credenciais com **privilégio mínimo** restritas ao bucket necessário.
- Nunca expor `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` ou `OPENAI_API_KEY` no frontend (`apps/web`) ou em arquivos `.env` versionados.
- Evitar registrar URLs assinadas, cookies de sessão, e-mails ou conteúdos de documentos/análises em logs.

### 6.6 CORS (API vs. Bucket)

- **CORS da API**: Configurado no backend (`apps/api/src/app.ts`) para controlar origens (`WEB_URL`), credenciais e métodos HTTP permitidos (incluindo `DELETE` em preflight).
- **CORS do Bucket**: Necessário apenas quando um navegador faz requisições diretas ao endpoint do storage (por exemplo, se uma URL pré-assinada for consumida diretamente no navegador). Caso configure o CORS no bucket B2, restrinja às origens da aplicação (ex.: `http://localhost:5173` e `https://doc-analyzer-delta.vercel.app`), métodos e headers necessários. A validação em navegador de acesso direto ao bucket via `fileUrl` não faz parte do fluxo padrão habilitado no frontend (`PD-02 = A`).

### 6.7 Exclusão e Consistência

Ao excluir um documento via `DELETE /documents/:id`:

1. A operação remove o objeto associado no storage e o registro correspondente no banco de dados.
2. Caso o documento não exista ou não pertença ao usuário autenticado, a API responde `404` (`NOT_FOUND`). Falhas de armazenamento podem retornar `502` (`STORAGE_ERROR`).
3. Como operações em storage externo e banco relacional não compartilham uma transação ACID única, o tratamento de erros e os testes (`documents-delete-service.test.ts` e `document-delete.test.ts`) cobrem o comportamento em falhas e ausências.

### 6.8 Troubleshooting do Storage

| Sintoma / Cenário                     | Causas Prováveis                                                  | Verificação / Ação                                                                   |
| ------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Endpoint incorreto / falha de conexão | `S3_ENDPOINT` mal formatado ou sem protocolo `https://`           | Conferir `S3_ENDPOINT` (ex.: `https://s3.us-west-004.backblazeb2.com`) e `S3_REGION` |
| Credenciais inválidas                 | `S3_ACCESS_KEY_ID` ou `S3_SECRET_ACCESS_KEY` incorretos/revogados | Recriar a chave de aplicação no B2 e atualizar o ambiente                            |
| Permissões insuficientes              | Chave sem permissão para o bucket ou sem ação necessária          | Ajustar escopo da chave ao bucket e permissões de leitura/escrita/exclusão           |
| Bucket inexistente                    | Nome divergente em `S3_BUCKET` ou bucket em outra conta/região    | Conferir nome exato do bucket e a região correspondente                              |
| Erro em upload ou presigned URL       | Falha de rede, clock skew ou expiração da URL (`~300s`)           | Verificar conectividade, horário do host e gerar nova URL via `GET /documents/:id`   |
| Erro de CORS no navegador             | Origem não autorizada ou método/header bloqueado                  | Conferir CORS da API (`WEB_URL` e métodos) e, se aplicável, CORS do bucket           |
| Falha na exclusão                     | Objeto inexistente ou erro no provedor (`502`)                    | Verificar logs da API e estado do objeto/registro no banco                           |

---

## 7. Configuração Equivalente na AWS S3

A integração atual do projeto utiliza o **Backblaze B2** via API compatível com S3. Para utilizar **Amazon S3** diretamente:

1. **Criar Bucket e Região**: No console da AWS S3, crie o bucket na região desejada (`S3_REGION`, ex.: `us-east-1`) mantendo o **Block all public access** ativado (bucket privado).
2. **Configurar IAM (Menor Privilégio)**: Crie um usuário IAM ou IAM Role com política restrita ao ARN do bucket (`arn:aws:s3:::NOME_DO_BUCKET` e `arn:aws:s3:::NOME_DO_BUCKET/*`) contendo apenas as ações necessárias (`s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`).
3. **Variáveis de Ambiente na AWS**:
   - `S3_REGION`: Região do bucket AWS (ex.: `us-east-1`).
   - `S3_ENDPOINT`: Endpoint regional da AWS (ex.: `https://s3.us-east-1.amazonaws.com`) ou omitido conforme a configuração do cliente S3.
   - `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY`: Credenciais IAM.
   - `S3_BUCKET`: Nome do bucket S3.
4. **CORS e Presigned URLs**: Se houver acesso direto do navegador via presigned URL, configure a regra CORS no bucket S3 permitindo a origem da aplicação e os métodos/headers necessários. A geração de presigned URLs segue o mesmo padrão do SDK S3.
5. **O que Muda vs. o que Permanece Igual**: Como o backend já utiliza o SDK oficial da AWS (`@aws-sdk/client-s3`), os comandos S3 e o fluxo da aplicação permanecem iguais; a adaptação concentra-se na infraestrutura AWS e nas variáveis de ambiente de endpoint/região/credenciais/bucket.

> **Pontuação no desafio**: A integração direta com a AWS S3 concede bônus de `+5 pontos`. A adoção do Backblaze B2 compatível com S3 atendendo aos requisitos do desafio não gera penalidade, apenas não recebe esse bônus específico.

---

## 8. API e Principais Fluxos

A especificação contratual completa está em `apps/api/openapi.json` e disponível em `/documentation` e `/documentation/json`.

### Endpoints

| Método   | Rota                    | Auth   | Respostas Principais                                                 | Descrição                                               |
| -------- | ----------------------- | ------ | -------------------------------------------------------------------- | ------------------------------------------------------- |
| `GET`    | `/health`               | Não    | `200`                                                                | Verifica disponibilidade da API                         |
| `GET`    | `/auth/google`          | Não    | `302`                                                                | Inicia autenticação Google OAuth                        |
| `GET`    | `/auth/google/callback` | Não    | `302`, `400`, `401`                                                  | Processa callback OAuth e define cookie de sessão       |
| `GET`    | `/me`                   | Cookie | `200` (`UserResponse`), `401`                                        | Retorna usuário autenticado                             |
| `POST`   | `/auth/logout`          | Cookie | `204`, `401`                                                         | Encerra sessão e remove cookie                          |
| `POST`   | `/documents`            | Cookie | `201` (`DocumentResponse`), `400`, `401`, `413`, `415`, `500`, `502` | Envia arquivo (`multipart/form-data`) e executa análise |
| `GET`    | `/documents`            | Cookie | `200` (`DocumentListItem[]`), `401`, `500`                           | Lista documentos do usuário                             |
| `GET`    | `/documents/:id`        | Cookie | `200` (`DocumentDetailResponse`), `400`, `401`, `404`, `500`, `502`  | Retorna detalhes do documento e `fileUrl` assinada      |
| `POST`   | `/documents/:id/retry`  | Cookie | `200` (`DocumentResponse`), `400`, `401`, `404`, `409`, `500`        | Reprocessa documento com status `FAILED`                |
| `DELETE` | `/documents/:id`        | Cookie | `204`, `400`, `401`, `404`, `500`, `502`                             | Exclui documento do storage e do banco                  |

### Formato Padrão de Erro

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Mensagem descritiva do erro"
  }
}
```

Códigos previstos na especificação:

- **Erros da API (`ApiErrorCode`)**: `UNAUTHORIZED`, `VALIDATION_ERROR`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `NOT_FOUND`, `CONFLICT`, `STORAGE_ERROR`, `INTERNAL_ERROR`.
- **Erros de processamento (`DocumentProcessingErrorCode`)**: `UNREADABLE_FILE`, `AI_TIMEOUT`, `AI_RATE_LIMIT`, `AI_ERROR`, `STORAGE_ERROR`, `INTERNAL_ERROR`.

### Principais Fluxos

1. **Login**: Navegação para `/auth/google` -> consentimento no Google -> `/auth/google/callback` -> cookie `doc_analyzer_session` -> redirecionamento ao frontend -> `GET /me` (`200`) -> `/app/documentos`.
2. **Upload e Análise**: Seleção via picker ou drag-and-drop -> validação de formato/tamanho -> preenchimento de `title` e `instruction` -> `POST /documents` (`multipart/form-data` com `title`, `instruction` e `file`) -> resposta `201` com status `COMPLETED`, `FAILED` ou `PROCESSING` -> atualização da listagem.
3. **Listagem e Seleção**: `GET /documents` exibe os itens do usuário. Selecionar cards habilita a barra de ações: com 1 item selecionado aparecem **Visualizar análise** e **Excluir documentos**; com 2 ou mais itens aparece **Excluir documentos**.
4. **Visualização da Análise**: Abre modal consultando `GET /documents/:id` e exibe título e análise em texto puro (sem exibir a instrução).
5. **Retry**: Para documentos `FAILED`, o botão de tentar novamente chama `POST /documents/:id/retry` e atualiza detalhe e lista (`404` fecha/atualiza lista; `409` notifica conflito e atualiza).
6. **Exclusão Única e Múltipla**: Confirmação prévia (`ConfirmDeleteDialog`). Para múltiplos itens, o frontend executa chamadas `DELETE /documents/:id` sequenciais (uma por vez), tratando `404` como já removido, mantendo selecionados os itens que falharem e atualizando a lista ao final.
7. **Logout**: `POST /auth/logout` limpa cache/sessão no cliente e redireciona para `/login`.

---

## 9. Instalação, Configuração e Execução Local

### Pré-requisitos

- **Node.js** `>= 20.16`
- **npm**
- **Docker** e **Docker Compose**
- Credenciais de Google OAuth 2.0, chave da OpenAI (`OPENAI_API_KEY`) e credenciais/bucket de armazenamento S3-compatível (Backblaze B2)

### Passo a Passo

1. **Clonar o repositório**:

   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd doc-analyzer
   ```

2. **Instalar dependências**:

   ```bash
   npm install
   ```

3. **Configurar arquivos de ambiente**:

   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   ```

   Preencha as variáveis em `.env` (e `.env.test` para testes de integração). Não versione arquivos `.env` reais.

4. **Subir os bancos PostgreSQL com Docker Compose**:

   ```bash
   docker compose up -d postgres postgres_test
   ```

   - Banco de desenvolvimento: `localhost:5432`
   - Banco de testes de integração: `localhost:5433`

5. **Gerar Prisma Client e executar migrações**:

   ```bash
   npx prisma generate --schema apps/api/prisma/schema.prisma
   npx prisma migrate dev --schema apps/api/prisma/schema.prisma
   ```

6. **Iniciar Backend e Frontend**:
   - **API** (`http://localhost:3333`):
     ```bash
     npm run dev
     ```
   - **Frontend** (`http://localhost:5173`):
     ```bash
     npm run dev -w apps/web
     ```
     Para login local com Google OAuth, configure a API com `WEB_URL=http://localhost:5173` e `GOOGLE_REDIRECT_URI=http://localhost:3333/auth/google/callback`, utilizando `localhost` (em vez de `127.0.0.1`) no navegador.

---

## 10. Variáveis de Ambiente

### Backend (`.env` / `.env.test` na raiz)

| Variável               | Serviço             | Finalidade                                              | Obrigatória                | Exemplo Seguro                                            |
| ---------------------- | ------------------- | ------------------------------------------------------- | -------------------------- | --------------------------------------------------------- |
| `NODE_ENV`             | API                 | Ambiente (`development`, `test`, `production`)          | Sim                        | `development`                                             |
| `PORT`                 | API                 | Porta HTTP da API                                       | Não (padrão `3333`)        | `3333`                                                    |
| `API_URL`              | API / OAuth         | URL base pública da API                                 | Sim                        | `http://localhost:3333`                                   |
| `WEB_URL`              | API / CORS / OAuth  | URL da aplicação web para CORS e redirecionamento       | Sim                        | `http://localhost:5173`                                   |
| `DATABASE_URL`         | PostgreSQL / Prisma | Conexão do banco principal                              | Sim                        | `postgresql://user:pass@localhost:5432/doc_analyzer`      |
| `TEST_DATABASE_URL`    | PostgreSQL / Testes | Conexão do banco exclusivo de testes de integração      | Para testes de integração  | `postgresql://user:pass@localhost:5433/doc_analyzer_test` |
| `GOOGLE_CLIENT_ID`     | Google OAuth        | Client ID da aplicação Web no Google Cloud              | Sim                        | `seu-client-id.apps.googleusercontent.com`                |
| `GOOGLE_CLIENT_SECRET` | Google OAuth        | Client Secret do OAuth 2.0                              | Sim                        | `GOCSPX-exemplo`                                          |
| `GOOGLE_REDIRECT_URI`  | Google OAuth        | URI de callback cadastrada no Google Cloud              | Sim                        | `http://localhost:3333/auth/google/callback`              |
| `SESSION_SECRET`       | Sessão / Cookies    | Chave secreta para assinatura de sessão (mín. 32 chars) | Sim                        | `chave-de-sessao-com-pelo-menos-32-caracteres`            |
| `S3_ENDPOINT`          | Backblaze B2 / S3   | Endpoint S3-compatível                                  | Conforme provedor          | `https://s3.us-west-004.backblazeb2.com`                  |
| `S3_REGION`            | Backblaze B2 / S3   | Região do bucket                                        | Sim                        | `us-west-004`                                             |
| `S3_ACCESS_KEY_ID`     | Backblaze B2 / S3   | Identificador da chave de acesso                        | Sim                        | `K000exemplo`                                             |
| `S3_SECRET_ACCESS_KEY` | Backblaze B2 / S3   | Chave secreta de acesso                                 | Sim                        | `K000segredoexemplo`                                      |
| `S3_BUCKET`            | Backblaze B2 / S3   | Nome do bucket privado                                  | Sim                        | `doc-analyzer-bucket`                                     |
| `OPENAI_API_KEY`       | OpenAI              | Chave de API da OpenAI                                  | Sim                        | `sk-exemplo`                                              |
| `OPENAI_MODEL`         | OpenAI              | Modelo utilizado na análise                             | Não (padrão `gpt-4o-mini`) | `gpt-4o-mini`                                             |
| `OPENAI_TIMEOUT_MS`    | OpenAI              | Tempo limite da requisição à OpenAI (ms)                | Conforme config            | `60000`                                                   |
| `MAX_FILE_SIZE_MB`     | Upload              | Tamanho máximo de arquivo em MB                         | Não (padrão `10`)          | `10`                                                      |
| `MAX_TEXT_CHARS`       | Extração / IA       | Limite máximo de caracteres extraídos para análise      | Conforme config            | `50000`                                                   |

### Frontend (`apps/web/.env` e `apps/web/.env.e2e`)

| Variável             | Serviço        | Finalidade                                                                             | Obrigatória | Exemplo Seguro             |
| -------------------- | -------------- | -------------------------------------------------------------------------------------- | ----------- | -------------------------- |
| `VITE_API_URL`       | Frontend       | Base da API (`http://localhost:3333` local; vazio em produção com rewrite same-origin) | Sim         | `http://localhost:3333`    |
| `E2E_BASE_URL`       | Playwright E2E | URL do frontend sob teste                                                              | Para E2E    | `http://localhost:5173`    |
| `E2E_API_URL`        | Playwright E2E | URL da API para verificações diretas nos testes E2E                                    | Para E2E    | `http://localhost:3333`    |
| `E2E_SESSION_COOKIE` | Playwright E2E | Valor do cookie `doc_analyzer_session` de uma sessão autenticada (nunca versionar)     | Para E2E    | `<cookie-de-sessao-local>` |

> Variáveis `VITE_*` ficam embutidas no bundle público do frontend: nunca armazene segredos nelas. `.env`, `apps/web/.env` e `apps/web/.env.e2e` devem permanecer fora do controle de versão.

---

## 11. Testes Automatizados (Unitários, Componentes, Integração e E2E)

### Verificações Estáticas e Build

```bash
npm run typecheck
npm run lint
npm run build -w apps/web
npm run build -w apps/api
```

### Backend (`apps/api`)

- **Testes unitários**:
  ```bash
  npm run test:unit -w apps/api
  ```
- **Testes de integração** (requer `.env.test` apontando para o banco exclusivo de testes e `postgres_test` ativo):
  ```bash
  docker compose up -d postgres_test
  npm run test:integration -w apps/api
  ```

### Frontend (`apps/web`)

- **Testes unitários e de componentes** (Vitest + React Testing Library + MSW):
  ```bash
  npm run test -w apps/web
  ```
- **Testes E2E com Playwright** (contra stack local ou produção):
  1. Copie `apps/web/.env.e2e.example` para `apps/web/.env.e2e` (arquivo ignorado pelo Git) e preencha `E2E_BASE_URL`, `E2E_API_URL` e `E2E_SESSION_COOKIE` (copiado de um login real via DevTools -> Application -> Cookies).
  2. Execute a suíte:
     ```bash
     npm run test:e2e -w apps/web
     ```
     Os cenários limpam os documentos criados (`E2E-*`) e não automatizam o login interativo do Google (verificado manualmente).

---

## 12. Deploy em Produção (Vercel + Railway)

- **Frontend (Vercel)**: Publicado em `https://doc-analyzer-delta.vercel.app` como build estático com fallback de SPA (`apps/web/vercel.json`). Configurado com `VITE_API_URL` vazio e rewrites same-origin (`/health`, `/me`, `/auth/*`, `/documents*`) encaminhando para a API no Railway, mantendo o cookie de sessão como _first-party_ no domínio do frontend.
- **Backend (Railway)**: Publicado em `https://doc-analyzerapi-production.up.railway.app` com build (`npm run build -w apps/api`) e start (`npm run start`).
- **Configuração de Produção e OAuth**:
  - `WEB_URL` configurado com a URL do frontend (`https://doc-analyzer-delta.vercel.app`).
  - `API_URL` configurado com a URL da API (`https://doc-analyzerapi-production.up.railway.app`).
  - `GOOGLE_REDIRECT_URI` e URIs autorizadas no Google Cloud Console configuradas para o callback de autenticação.
- **Verificação de Saúde**:
  ```bash
  curl https://doc-analyzerapi-production.up.railway.app/health
  ```
- **Pós-processo**: Ao encerrar o uso dos ambientes de avaliação/demonstração, desative ou remova os recursos de nuvem criados.

---

## 13. Decisões Técnicas e Limitações Conhecidas

- **Proxy Same-Origin via Rewrites na Vercel**: Evita restrições de cookies _cross-site_ entre domínios distintos do frontend e da API em navegadores modernos, sem exigir alterações no código de cookies da API.
- **Autenticação por Cookie HTTP-Only e `GET /me`**: Impede acesso a tokens de sessão via JavaScript (`localStorage`/`sessionStorage`) e verifica a sessão ativamente pelo backend.
- **Exclusão Sequencial no Frontend**: A exclusão de múltiplos documentos dispara `DELETE /documents/:id` em sequência (sem endpoint de lote), continuando após falhas individuais, mantendo selecionados os itens que falharem e invalidando a lista ao término.
- **Sem Polling Contínuo**: A atualização da lista e de status (`PROCESSING` / `COMPLETED` / `FAILED`) ocorre após mutações, ao abrir detalhes/retry ou ao revalidar consultas (inclusive ao retornar o foco à janela).
- **Limitações Conhecidas**:
  - Sem paginação, busca, filtros, ordenação, tags, pastas ou edição/renomeação de documentos.
  - Em falhas no callback OAuth, a resposta de erro JSON da API na rota de callback não é interceptada pela SPA.
  - A exclusão entre storage externo e banco de dados não ocorre sob uma única transação distribuída.
