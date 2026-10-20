import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('Navegação entre as duas páginas', () => {
  it('compartilha cadastro e ocupação e reflete no Dashboard a atualização feita no mapa', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const vagas = [
      { id: 101, numero: 1 },
      { id: 205, numero: 2 },
    ];
    http.expectOne('/vagas').flush(vagas);
    http.expectOne('/vagas/status').flush(vagas.map((vaga) => ({ ...vaga, status: false })));
    http.expectOne('/carros').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Dashboard');
    await harness.navigateByUrl('/estacionamento');
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('g[role="button"]')).toHaveLength(27);
    http.expectNone('/vagas');
    http.expectNone('/vagas/status');
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('.page-heading button')?.click();
    http.expectOne('/vagas').flush(vagas);
    http
      .expectOne('/vagas/status')
      .flush(vagas.map((vaga) => ({ ...vaga, status: vaga.id === 205 })));
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('.parking-slot--ocupada')).toHaveLength(1);
    await harness.navigateByUrl('/');
    harness.detectChanges();
    expect(
      Array.from(harness.routeNativeElement!.querySelectorAll('.metric-value'), (node) =>
        node.textContent?.trim(),
      ),
    ).toEqual(['27vagas', '1', '1', '50%']);
    http.expectNone('/vagas');
    http.expectNone('/vagas/status');
    http.expectNone('/carros');
    http.expectNone('/registros/entrada');
    http.expectNone('/registros/saida');
    http.verify();
  });
});
