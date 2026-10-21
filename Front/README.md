# Estacionamento SEAGRI — Frontend

MVP Angular com Dashboard (`/`) e Estacionamento (`/estacionamento`).
Requisitos, instalação, execução, proxy e comandos de build/testes estão no
[README principal](../README.md#instalação-e-execução-local).

## Organização dos componentes

```text
src/app/
  core/
    models/parking.ts              # Contratos atuais e estados visuais
    parking-layout.ts              # Numeração, alinhamento e dimensões físicas
    services/                      # HTTP e estado compartilhado das consultas
  pages/
    dashboard/                     # Indicadores e veículos cadastrados
    parking/                       # Mapa, painel, formulário e confirmação de entrada
  shared/
    icon/                          # Ícones SVG sem dependência externa
    metric-card/                   # Cards reutilizáveis
    parking-map/                   # Planta SVG e interação por mouse/teclado
  app.*                            # Layout administrativo e navegação
```

## Integração atual

- `VagasService`: `GET /vagas` e `GET /vagas/status`, usados nas duas páginas.
- `CarrosService`: `GET /carros`, para consulta e busca local no Dashboard e seleção no formulário de entrada.
- Os dois services também oferecem consulta por ID nas rotas existentes; selecionar
  uma vaga já carregada não provoca uma requisição adicional.
- `API_BASE_URL`, em `core/services/api.config.ts`, permite configurar outra origem;
  por padrão, utiliza URLs relativas atendidas pelo proxy de desenvolvimento.
- `ParkingDataService` compartilha as listas e calcula os indicadores durante a sessão. Atualizar refaz as
  consultas; cadastro, ocupação e carros têm estados independentes, timeout de 15 segundos e
  validação do formato retornado. Resposta inválida não é tratada como lista vazia.
- A associação do status ao cadastro exige ID e número correspondentes. O contrato
  de ocupação é `{ id, numero, status }`, com booleano obrigatório: `true` significa
  ocupada e `false`, livre. Dados de veículo ou horário não são inferidos.
- `RegistrosService`: `POST /registros/entrada`, com o contrato atual em minúsculas:
  `{ carroid: number, vagaid: number }`. Os valores são IDs do banco, não números físicos.
  A saída e a consulta dos detalhes da ocupação ainda não são integradas.

## Convenção física e disponibilidade

As 27 posições são 1–18 na parte superior e 19–27 na inferior, inicialmente
centralizada. Ajuste `numeros` e `startColumn` em `core/parking-layout.ts` para
alinhar outra correspondência física. Todas têm a mesma largura e altura. Em
resoluções pequenas, a planta permite rolagem horizontal.

A associação usa `vaga.numero`. O ID do banco fica separado, é mostrado nos
detalhes e é o parâmetro de `buscarPorId()`, nunca o número físico.

| Resultado da consulta                           | Representação                                  |
| ----------------------------------------------- | ---------------------------------------------- |
| Cadastro e status `false` correspondentes       | Livre, em verde                                |
| Cadastro e status `true` correspondentes        | Ocupada, em vermelho                           |
| Cadastro encontrado, status ausente ou inválido | Disponibilidade desconhecida, em cinza         |
| Sucesso sem cadastro correspondente             | “Não cadastrada”, com hachura                  |
| Carregamento ou falha de cadastro               | Cadastro não verificado, sem concluir ausência |
| Cadastro fora da numeração física               | Aviso, sem criar ou substituir posições        |

Os indicadores contam somente vagas cadastradas dentro da numeração física do
mapa. A taxa é `ocupadas / cadastradas no mapa × 100`, exibida com até uma casa
decimal. Posições sem cadastro e cadastros fora do mapa ficam fora desse cálculo.
A base considerada aparece junto aos indicadores; a capacidade física permanece 27.

Uma falha nas consultas de cadastro ou ocupação, ou a ausência de status para
alguma vaga cadastrada no mapa, deixa os três indicadores com `—`. Os status
confirmados ainda são exibidos no mapa quando a resposta é válida e parcial.
Com cadastro e ocupação vazios, os totais são zero e a taxa fica indisponível,
evitando divisão por zero.

O botão Atualizar refaz cadastro e ocupação; no Dashboard, também refaz veículos.
Durante a consulta, a interface deixa de apresentar os status anteriores como
atuais. Falhas de ocupação têm opção de repetir apenas essa consulta, preservando
cadastros e veículos. A atualização feita em uma página é refletida na outra ao
navegar, sem recarregar o navegador. Não há polling automático.

## Integração futura

Veículo estacionado e horário de entrada dependem de um contrato de consulta que
ainda precisa ser disponibilizado pelo backend. `GET /vagas/status` informa
somente a disponibilidade.

`ParkingSlot.ocupacao` é uma estrutura de apresentação futura. A saída permanece
desabilitada. Campos extras na API não alteram automaticamente os detalhes do mapa.

## Registro de entrada

Selecionar uma vaga cadastrada com status livre confirmado apresenta o formulário
no painel de detalhes. Os veículos são carregados sob demanda e compartilhados
com o Dashboard. Há estados de carregamento, erro, lista vazia e atualização da
lista. O veículo é obrigatório; o frontend não filtra veículos estacionados sem
uma consulta que forneça essa informação. Um conflito retornado pelo backend é
apresentado na interface.

O envio captura o veículo e a vaga selecionados e bloqueia uma segunda entrada
enquanto a operação está pendente. A requisição pertence ao service da sessão:
trocar de vaga ou navegar para o Dashboard não cancela o envio nem troca seu destino.
Não há repetição automática do POST. Falhas de conexão ou timeout não são tratadas
como certeza de que nada foi gravado; a interface informa que a confirmação está
pendente e refaz as consultas.

Um `201` confirma o cadastro da entrada. A resposta completa é validada antes de
exibir ID do registro, número da vaga, placa, modelo, cor e horário do servidor.
Uma resposta incompleta mantém a confirmação do `201`, sem inventar detalhes.
O aviso identifica a última operação, permanece ao navegar entre as páginas e
pode ser dispensado. Ele não representa uma consulta do ocupante atual e não é
persistido após recarregar o navegador.

Após a resposta, cadastro e ocupação são consultados novamente, substituindo
consultas anteriores ainda em andamento para evitar dados anteriores à entrada.
Mapa, painel e indicadores compartilham esse resultado. Falhas nessa atualização
mantêm a confirmação da entrada e oferecem nova tentativa de consulta, sem
reenviar a operação.

O backend ainda precisa garantir exclusividade em requisições simultâneas de
outros clientes. O bloqueio local de envio duplicado não resolve essa pendência.

## Verificação existente

O fluxo de entrada foi conferido no Edge em desktop (1440 px) e celular (390 px),
com as rotas reais e PostgreSQL em banco temporário. Foram validados gravação,
confirmação, mapa, indicadores, conflito e recuperação de falha na atualização.
O banco temporário foi removido e os cadastros locais de demonstração preservados.

Os testes cobrem navegação e reaproveitamento de consultas, falhas independentes,
recuperação, busca, distinção entre número e ID, interpretação de `true`/`false`,
indicadores, respostas inválidas ou parciais, envio de entrada com IDs, bloqueio de
duplicidade, confirmação, falhas e navegação durante o envio. Fixtures ficam
restritas aos testes. Não há dados mockados na aplicação.
Consulte os comandos de build e testes no README principal.
