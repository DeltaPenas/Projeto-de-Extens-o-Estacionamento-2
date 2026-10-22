import { HttpTestingController } from '@angular/common/http/testing';

// Os testes de mapa/entrada/saída mantêm o histórico vazio; sua integração tem suíte própria.
export function flushEmptyHistory(http: HttpTestingController) {
  for (const request of http.match((req) => req.method === 'GET' && req.url === '/registros')) {
    if (request.cancelled) continue;
    request.flush({
      items: [],
      total: 0,
      page: Number(request.request.params.get('page')),
      limit: Number(request.request.params.get('limit')),
      totalPages: 0,
    });
  }
}
