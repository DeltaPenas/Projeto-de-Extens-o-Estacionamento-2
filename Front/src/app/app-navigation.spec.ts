import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('Navegação entre as duas páginas', () => {
  it('abre Dashboard e mapa reutilizando a consulta de vagas', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    http.expectOne('/vagas').flush([{ id: 101, numero: 1 }]);
    http.expectOne('/carros').flush([]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Dashboard');
    await harness.navigateByUrl('/estacionamento');
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelectorAll('g[role="button"]')).toHaveLength(27);
    http.expectNone('/vagas');
    http.expectNone('/registros/entrada');
    http.expectNone('/registros/saida');
    http.verify();
  });
});
