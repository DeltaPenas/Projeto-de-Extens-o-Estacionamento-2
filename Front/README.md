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

- `VagasService`: `GET /vagas`, usado nas duas páginas.
- `CarrosService`: `GET /carros`, para consulta e busca local no Dashboard.
- Os dois services também oferecem consulta por ID nas rotas existentes; selecionar
  uma vaga já carregada não provoca uma requisição adicional.
- `API_BASE_URL`, em `core/services/api.config.ts`, permite configurar outra origem;
  por padrão, utiliza URLs relativas atendidas pelo proxy de desenvolvimento.
- `ParkingDataService` compartilha as listas durante a sessão. Atualizar refaz as
  consultas; vagas e carros têm estados independentes, timeout de 15 segundos e
  validação do formato retornado. Resposta inválida não é tratada como lista vazia.
- `RegistrosService` é somente o ponto de extensão, com operações indisponíveis.
  Não faz chamadas de entrada, saída ou consultas inexistentes.

## Convenção física e disponibilidade

As 27 posições são 1–18 na parte superior e 19–27 na inferior, inicialmente
centralizada. Ajuste `numeros` e `startColumn` em `core/parking-layout.ts` para
alinhar outra correspondência física. Todas têm a mesma largura e altura. Em
resoluções pequenas, a planta permite rolagem horizontal.

A associação usa `vaga.numero`. O ID do banco fica separado, é mostrado nos
detalhes e é o parâmetro de `buscarPorId()`, nunca o número físico.

| Resultado da consulta               | Representação                                  |
| ----------------------------------- | ---------------------------------------------- |
| Cadastro encontrado                 | Disponibilidade desconhecida, em cinza neutro  |
| Sucesso sem cadastro correspondente | “Não cadastrada”, com hachura                  |
| Carregamento ou falha               | Cadastro não verificado, sem concluir ausência |
| Cadastro fora da numeração física   | Aviso, sem criar ou substituir posições        |

Livre (verde) e ocupada (vermelho) existem nos tipos e estilos, mas não são
atribuídas pelo frontend. Os três indicadores de ocupação mostram `—`. Capacidade
física de 27 posições e quantidade cadastrada são informações distintas.

## Integração futura

Ocupação, veículo e horário de entrada dependem dos contratos descritos em
[BACKEND_PENDENCIAS.md](../BACKEND_PENDENCIAS.md). As propostas desse documento
não são contratos já implementados.

`ParkingSlot.ocupacao` é uma estrutura de apresentação futura. Os botões de
movimentação estão desabilitados e sem handlers HTTP. Após o acordo e a entrega
do backend, uma nova etapa deverá atualizar tipos, mapear os campos reais e
habilitar as operações. Campos extras na API não alteram automaticamente o mapa.

## Verificação existente

Na etapa de implementação: build de produção sem avisos, 12 testes aprovados em
3 arquivos e conferência no Edge em desktop (1440 px) e celular (390 px).
O backend local estava indisponível: falhas foram verificadas sem interceptação e
cenários de sucesso usaram fixtures exclusivas de teste, sem conexão real com
PostgreSQL. Não há dados mockados na aplicação.

Os testes cobrem navegação e reaproveitamento de consultas, falhas independentes,
recuperação, busca, respostas inválidas, distinção entre número e ID e estados do
mapa. Consulte os comandos de execução no README principal.
