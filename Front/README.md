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
    parking/                       # Associação das vagas e painel de detalhes
  shared/
    icon/                          # Ícones SVG sem dependência externa
    metric-card/                   # Cards reutilizáveis
    parking-map/                   # Planta SVG e interação por mouse/teclado
  app.*                            # Layout administrativo e navegação
```

## Integração atual

- `VagasService`: `GET /vagas` e `GET /vagas/status`, usados nas duas páginas.
- `CarrosService`: `GET /carros`, para consulta e busca local no Dashboard.
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
- `RegistrosService` é somente o ponto de extensão, com operações indisponíveis.
  Não faz chamadas de entrada, saída ou consultas inexistentes.

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

`ParkingSlot.ocupacao` é uma estrutura de apresentação futura. Os botões de
movimentação estão desabilitados e sem handlers HTTP. Após o acordo e a entrega
do backend, uma nova etapa deverá atualizar tipos, mapear os campos reais e
habilitar as operações. Campos extras na API não alteram automaticamente o mapa.

## Verificação existente

Nesta integração, o build de produção passou sem avisos e os 21 testes passaram.
O Edge foi conferido em desktop (1440 px) e celular (390 px), consumindo API e
PostgreSQL locais. Cenários com ocupação mista, erro e recuperação também foram
conferidos com fixtures exclusivas de teste, sem operações de escrita na API.

Os testes cobrem navegação e reaproveitamento de consultas, falhas independentes,
recuperação, busca, distinção entre número e ID, interpretação de `true`/`false`,
indicadores, respostas inválidas ou parciais e atualização compartilhada entre as
páginas. Fixtures ficam restritas aos testes. Não há dados mockados na aplicação.
Consulte os comandos de build e testes no README principal.
