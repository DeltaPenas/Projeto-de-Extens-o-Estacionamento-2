# Sistema de Controle de Estacionamento — SEAGRI

Projeto de extensão universitária desenvolvido para auxiliar na organização do estacionamento da Secretaria de Estado da Agricultura e Pecuária de Alagoas. O objetivo é facilitar o controle de vagas, veículos, entradas e saídas, com duas páginas e **27 posições físicas: 18 superiores e 9 inferiores**.

## Estado atual

O frontend oferece Dashboard com indicadores de ocupação, consulta e busca local de veículos, mapa SVG interativo e painel com veículo, horário de entrada e registro ativo da vaga ocupada. O formulário de entrada oferece somente veículos disponíveis. A saída é solicitada pelo painel, com confirmação e envio automático do ID do registro. A associação usa `vaga.numero`; o ID do banco permanece separado.

A ocupação é consultada em `GET /vagas/status`: `true` significa ocupada e `false`, livre; `registroAtivo` identifica a movimentação aberta e o veículo, ou é `null` quando livre. Os indicadores consideram somente vagas cadastradas que correspondem às posições físicas do mapa. Falhas ou status incompletos mantêm os indicadores indisponíveis e as vagas afetadas em cinza. Entradas e saídas apresentam confirmação e refazem as consultas do mapa e dos indicadores. Não há dados mockados na aplicação; os cadastros são consultados no banco configurado.

Os fluxos de ocupante, entrada e saída foram verificados no navegador com as rotas reais e PostgreSQL em banco temporário. A consulta de status utiliza `listarComStatus()` e os erros de negócio da saída são tratados em JSON, com validação estrita do ID recebido. Os cadastros locais de demonstração foram preservados.

## Tecnologias e pré-requisitos

| Área               | Tecnologias do repositório                                        |
| ------------------ | ----------------------------------------------------------------- |
| Frontend           | Angular 21.2, TypeScript 5.9, Router, HttpClient, RxJS, CSS e SVG |
| Testes do frontend | Vitest e jsdom, executados pelo Angular CLI                       |
| Backend            | Node.js, Express 5.2, TypeScript 7.0 e `tsx`                      |
| Banco e ORM        | PostgreSQL e Prisma ORM/Client 6.19.3                             |

Instale Git, Node.js com npm e PostgreSQL com o cliente `psql`:

- **Node.js:** use a linha 22 LTS, versão 22.12 ou superior. O lockfile do Angular admite `^20.19.0 || ^22.12.0 || >=24.0.0`; os manifests não definem `engines` próprios.
- **npm:** `Front/package.json` declara `npm@11.8.0`. A validação anterior também funcionou com npm 10.9.9. Angular e Prisma são instalados localmente, sem instalação global.
- **PostgreSQL:** versão 15 ou superior, conforme `Back/.env.example`, com usuário autorizado a criar o banco e aplicar migrations.

Os lockfiles reproduzem as dependências de cada aplicação.

## Estrutura

```text
Back/src/
  routes/        # Rotas Express
  controller/    # Requisições e respostas HTTP
  service/       # Regras de negócio
  repository/    # Acesso ao banco com Prisma Client
  models/        # Classes de domínio existentes
  prisma/        # Schema, migrations e artefatos de banco
  server.ts      # API na porta 3000
Front/
  src/app/
    core/        # Interfaces, configuração física e services
    pages/       # Dashboard e Estacionamento
    shared/      # Mapa SVG, cards e ícones
  proxy.conf.json
  start.ps1
postman/         # Configuração de workspace; sem coleção de endpoints
```

O `package.json` da raiz tem apenas uma dependência de Express, sem scripts ou workspaces. Instale e execute `Back/` e `Front/` separadamente. Detalhes dos componentes estão em [Front/README.md](Front/README.md).

## Instalação e execução local

Os comandos usam PowerShell.

### 1. Clonar e instalar

No diretório em que deseja guardar o projeto:

```powershell
git clone https://github.com/DeltaPenas/Projeto-de-Extens-o-Estacionamento-2.git
cd Projeto-de-Extens-o-Estacionamento-2
cd Back
npm ci
cd ..\Front
npm ci
cd ..
```

O último comando retorna à raiz.

### 2. Configurar ambiente e PostgreSQL

Inicie o serviço PostgreSQL instalado no computador. No Windows, use o aplicativo Serviços; o nome do serviço depende da instalação. Se `psql` não for reconhecido, disponibilize a pasta `bin` da instalação no `PATH`.

Em um clone novo, a partir da raiz:

```powershell
cd Back
Copy-Item .env.example .env
```

Edite `Back/.env` com a conexão do seu ambiente:

```dotenv
DATABASE_URL="postgresql://<USUARIO>:<SENHA>@localhost:5432/estacionamento?schema=public"
```

Substitua os campos entre `< >`; são placeholders, não credenciais válidas. Caracteres reservados em usuário/senha precisam de codificação de URL. `.env` é ignorado pelo Git; se já existir, preserve sua configuração.

Ainda em `Back/`, crie o banco caso não exista:

```powershell
psql -h localhost -p 5432 -U postgres -d postgres -c "CREATE DATABASE estacionamento;"
```

`postgres` é o administrador padrão deste exemplo; substitua-o se necessário. A senha é solicitada pelo cliente. O usuário configurado em `DATABASE_URL` deve ter acesso ao banco.

### 3. Aplicar migrations e gerar o Prisma Client

Em `Back/`, após configurar `.env`:

```powershell
npx prisma validate --schema=src/prisma/schema.prisma
npx prisma migrate deploy --schema=src/prisma/schema.prisma
npx prisma generate --schema=src/prisma/schema.prisma
npx prisma migrate status --schema=src/prisma/schema.prisma
```

Os comandos usam o Prisma 6 instalado por `npm ci`. `migrate deploy` aplica as migrations existentes; `generate` gera o Client separadamente. A migration inicial cria as três tabelas, **sem cadastrar as 27 vagas**. [Referência do Prisma 6](https://www.prisma.io/docs/orm/v6/reference/prisma-cli-reference#migrate-deploy).

O schema efetivo está indicado em `Back/package.json`. Há artefatos de Prisma Next divergentes em `Back/`, sem uso pelos repositories atuais. O fluxo acima utiliza `src/prisma/schema.prisma`, em vez dos comandos de Prisma Next de `Back/prisma-next.md`. Divergências em bancos já existentes devem ser reconciliadas pela equipe antes de aplicar migrations.

### 4. Iniciar o backend

Em `Back/`, mantenha este terminal aberto:

```powershell
node --env-file=.env ./node_modules/tsx/dist/cli.mjs watch src/server.ts
```

O comando usa o executável declarado pelo pacote `tsx` e carrega `.env` explicitamente pelo Node. O script **`npm run dev`** também existe (`tsx watch src/server.ts`) e pode ser usado com o ambiente configurado. A opção [`--env-file`](https://nodejs.org/api/cli.html#--env-filefile) disponibiliza as variáveis ao processo sem alterar o código.

API: **http://localhost:3000**. A porta é fixa em `Back/src/server.ts`; não há rota `GET /` nem health check. Uma consulta existente, após iniciar a API:

```powershell
Invoke-RestMethod http://localhost:3000/vagas
```

As consultas de vagas, ocupação e veículos podem ser verificadas com a API e o PostgreSQL locais. Os cadastros disponíveis dependem do banco configurado; não há seed versionado de vagas ou veículos.

### 5. Iniciar o frontend

Em outro terminal, a partir da raiz:

```powershell
cd Front
npm start
```

Abra **http://localhost:4200**: `/` é o Dashboard e `/estacionamento` é o Mapa. Encerre os servidores com `Ctrl+C` nos respectivos terminais.

Alternativa no Windows, também em `Front/`:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

O script usa Node/npm instalados ou um runtime portátil já presente em `.tools/`, instala dependências se o pacote de build estiver ausente e executa `npm start`. **O runtime portátil não acompanha o clone**: `.tools/` é ignorado pelo Git. Uma instalação comum de Node/npm atende ao fluxo principal.

### 6. Build e testes

Em `Front/`:

```powershell
npm run build
npm test -- --watch=false
```

Saída do build: `Front/dist/estacionamento/`. Os testes cobrem navegação, consulta compartilhada, busca de veículos, associação entre número e ID, cores do mapa, indicadores, entrada, detalhes do ocupante, confirmação e saída pelo registro ativo, filtro de veículos disponíveis, atualização e tratamento de falhas. Fixtures ficam restritas aos testes.

Em `Back/`, execute `npm test` para rodar os 15 testes de regressão dos controllers de status e saída. Eles verificam o contrato, IDs inválidos e erros `400`, `404`, `409` e `500`, substituindo os services durante o teste, sem consultar ou alterar o banco. Não há scripts de build ou start de produção no backend.

A verificação de tipos com `npx tsc --noEmit` ainda aponta uma dependência ausente (`@prisma/orm-postgres/runtime`) no artefato antigo `src/prisma/db.ts`. Esse arquivo de Prisma Next não é utilizado pelas rotas atuais, que usam Prisma Client 6; a pendência não impede a execução da API nem dos testes de controllers.

## Integração e principais rotas

O Angular centraliza o HTTP em `Front/src/app/core/services/`, com URLs relativas e sem prefixo `/api`. O proxy de `angular.json` encaminha `/vagas`, `/vagas/**`, `/carros`, `/carros/**` e `/registros/**` para `http://127.0.0.1:3000`, preservando caminhos. A interface chama `GET /vagas`, `GET /vagas/status`, `GET /carros`, `POST /registros/entrada` e `POST /registros/saida`.

| Rotas existentes                                        | Situação                                                              |
| ------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET /vagas`, `GET /vagas/:id`                          | ID e número; sem ocupação                                             |
| `GET /vagas/status`                                     | ID, número, status e registro ativo com veículo; integrado ao mapa e aos indicadores |
| `POST /vagas`, `PUT /vagas/:id`, `DELETE /vagas/:id`    | Cadastro, alteração e exclusão implementados no código                |
| `GET /carros`, `GET /carros/:id`                        | Consulta de veículos                                                  |
| `POST /carros`, `PUT /carros/:id`, `DELETE /carros/:id` | Cadastro, alteração e exclusão implementados no código                |
| `POST /registros/entrada`                               | Integrado com `{ carroid, vagaid }`; concorrência pendente no backend |
| `POST /registros/saida`                                 | Integrado com `{ registroId }` inteiro e positivo; erros de negócio em JSON |

O proxy só funciona no desenvolvimento. Em produção, encaminhe as rotas à API na mesma origem ou configure outra origem com CORS. Não há autenticação ou configuração de CORS na API atual.

## Limitações e próximas entregas

- Os detalhes do ocupante e a saída exigem um registro ativo válido e correspondente à vaga. Dados ausentes ou inconsistentes desabilitam a saída. Para filtrar os veículos de entrada, a consulta deve cobrir todos os cadastros, inclusive vagas fora do mapa; informações incompletas bloqueiam a seleção.
- O backend permite reutilizar vagas após a saída, mas ainda precisa garantir uma entrada ativa por vaga e por veículo em requisições simultâneas. O bloqueio de envio duplicado no frontend se aplica somente à sessão atual.
- A confirmação da última movimentação mostra registro, vaga, veículo e horários retornados pela operação. Ela fica apenas na sessão e não substitui a consulta do ocupante atual. Falhas na atualização preservam a confirmação, sem repetir o envio.
- A página de cadastro de veículos continua para uma entrega própria.
- Não há endpoint de histórico nem seed versionado dos cadastros.
- Uma posição só aparece como “Não cadastrada” após consulta bem-sucedida sem registro correspondente. Falhas permanecem como cadastro não verificado.
- O botão Atualizar refaz as consultas; não há atualização automática. O estado compartilhado mantém mapa e Dashboard coerentes ao navegar entre as páginas.
