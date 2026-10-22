import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { RegistroController } from "../src/controller/RegistroController";
import { RegistroRepository } from "../src/repository/RegistroRepository";
import { RegistroService } from "../src/service/RegistroService";
import { consultarHistorico } from "../src/service/consulta-historico";

function response() {
  const result = { status: 200, body: undefined as unknown };
  const res = {
    status(code: number) {
      result.status = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
  } as Response;
  return { res, result };
}

test("consulta padrão usa página 1 e limite 20", () => {
  assert.deepEqual(consultarHistorico({}), { page: 1, limit: 20 });
});

test("normaliza placa e preserva o instante dos filtros com fuso", () => {
  const consulta = consultarHistorico({
    page: "2",
    limit: "10",
    placa: " abc1 ",
    dataInicio: "2026-10-21T00:00:00-03:00",
    dataFim: "2026-10-22T00:00:00-03:00",
    situacao: "encerrados",
  });
  assert.equal(consulta.placa, "ABC1");
  assert.equal(consulta.page, 2);
  assert.equal(consulta.dataInicio?.toISOString(), "2026-10-21T03:00:00.000Z");
  assert.equal(consulta.dataFim?.toISOString(), "2026-10-22T03:00:00.000Z");
  assert.equal(consulta.situacao, "encerrados");
});

test("controller retorna página com itens e total e service encaminha filtros ao repository", async (t) => {
  const pagina = { items: [], total: 0, page: 2, limit: 10, totalPages: 0 };
  const listar = t.mock.method(
    RegistroRepository.prototype,
    "listarHistorico",
    async () => pagina,
  );
  const { res, result } = response();
  await new RegistroController().listar(
    {
      query: { page: "2", limit: "10", placa: " abc ", situacao: "abertos" },
    } as unknown as Request,
    res,
  );
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, pagina);
  assert.deepEqual(listar.mock.calls[0]?.arguments, [
    { page: 2, limit: 10, placa: "ABC", situacao: "abertos" },
  ]);
});

for (const [label, query] of [
  ["página zero", { page: "0" }],
  ["página negativa", { page: "-1" }],
  ["página decimal", { page: "1.5" }],
  ["expoente", { page: "1e2" }],
  ["offset excessivo", { page: "9999999999" }],
  ["limite zero", { limit: "0" }],
  ["limite acima de 100", { limit: "101" }],
  ["parâmetro repetido", { page: ["1", "2"] }],
  ["placa em objeto", { placa: { contains: "a" } }],
  ["placa longa", { placa: "X".repeat(21) }],
  ["data sem fuso", { dataInicio: "2026-10-21T12:00:00" }],
  ["data sem horário", { dataInicio: "2026-10-21" }],
  ["data inexistente", { dataInicio: "2026-02-30T00:00:00Z" }],
  ["data inválida", { dataFim: "x" }],
  [
    "período invertido",
    { dataInicio: "2026-10-22T00:00:00Z", dataFim: "2026-10-21T00:00:00Z" },
  ],
  [
    "período vazio",
    { dataInicio: "2026-10-21T00:00:00Z", dataFim: "2026-10-21T00:00:00Z" },
  ],
  ["situação desconhecida", { situacao: "livre" }],
  ["situação em lista", { situacao: ["abertos"] }],
] as const) {
  test(`histórico rejeita ${label} com 400 JSON sem consultar o banco`, async (t) => {
    const listar = t.mock.method(
      RegistroRepository.prototype,
      "listarHistorico",
    );
    const { res, result } = response();
    await new RegistroController().listar({ query } as unknown as Request, res);
    assert.equal(result.status, 400);
    assert.equal(typeof (result.body as { erro: string }).erro, "string");
    assert.equal(listar.mock.callCount(), 0);
  });
}

test("falha interna do histórico retorna 500 genérico", async (t) => {
  t.mock.method(RegistroService.prototype, "listarHistorico", async () => {
    throw new Error("Prisma interno");
  });
  t.mock.method(console, "error", () => undefined);
  const { res, result } = response();
  await new RegistroController().listar({ query: {} } as Request, res);
  assert.equal(result.status, 500);
  assert.deepEqual(result.body, { erro: "Erro interno" });
});
