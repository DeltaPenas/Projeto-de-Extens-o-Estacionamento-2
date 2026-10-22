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

  it('conclui a entrada e atualiza o Dashboard mesmo após sair do mapa durante o envio', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    const vaga = { id: 101, numero: 1 };
    const carro = { id: 81, placa: 'ABC1D23', modelo: 'Onix', cor: 'Branco' };
    await harness.navigateByUrl('/');
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/vagas/status').flush([{ ...vaga, status: false, registroAtivo: null }]);
    http.expectOne('/carros').flush([carro]);
    await harness.navigateByUrl('/estacionamento');
    harness
      .routeNativeElement!.querySelector('g[data-number="1"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    harness.detectChanges();
    const select = harness.routeNativeElement!.querySelector<HTMLSelectElement>('#entry-car')!;
    select.value = '81';
    select.dispatchEvent(new Event('change'));
    harness
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne('/registros/entrada');
    await harness.navigateByUrl('/');
    expect(request.cancelled).toBe(false);
    harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.page-heading button')!.click();
    const previousVagas = http.expectOne('/vagas');
    const previousStatus = http.expectOne('/vagas/status');
    http.expectOne('/carros').flush([carro]);
    request.flush(
      {
        id: 56,
        carroId: 81,
        vagaId: 101,
        entrada: '2026-10-20T18:30:00.000Z',
        saida: null,
        carro,
        vaga,
      },
      { status: 201, statusText: 'Created' },
    );
    expect(previousVagas.cancelled).toBe(true);
    expect(previousStatus.cancelled).toBe(true);
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/vagas/status').flush([{ ...vaga, status: true }]);
    harness.detectChanges();
    expect(
      Array.from(harness.routeNativeElement!.querySelectorAll('.metric-value'), (node) =>
        node.textContent?.trim(),
      ),
    ).toEqual(['27vagas', '0', '1', '100%']);
    await harness.navigateByUrl('/estacionamento');
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.entry-success')?.textContent).toContain(
      'Entrada registrada com sucesso',
    );
    http.expectNone('/registros/entrada');
    http.verify();
  });
  it('conclui a saída ao navegar e substitui consultas anteriores para atualizar o Dashboard', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    const vaga = { id: 101, numero: 1 };
    const carro = { id: 81, placa: 'ABC1D23', modelo: 'Onix', cor: 'Branco' };
    const ativo = {
      id: 56,
      carroId: 81,
      vagaId: 101,
      entrada: '2026-10-21T12:00:00.000Z',
      saida: null,
      carro,
    };
    await harness.navigateByUrl('/estacionamento');
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/vagas/status').flush([{ ...vaga, status: true, registroAtivo: ativo }]);
    harness.detectChanges();
    harness
      .routeNativeElement!.querySelector('g[data-number="1"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('app-exit-action button')!.click();
    harness.detectChanges();
    harness
      .routeNativeElement!.querySelector<HTMLButtonElement>('.exit-confirmation .button-primary')!
      .click();
    const request = http.expectOne('/registros/saida');
    await harness.navigateByUrl('/');
    expect(request.cancelled).toBe(false);
    http.expectOne('/carros').flush([carro]);
    harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.page-heading button')!.click();
    const previousVagas = http.expectOne('/vagas');
    const previousStatus = http.expectOne('/vagas/status');
    http.expectOne('/carros').flush([carro]);
    request.flush({ ...ativo, vaga, saida: '2026-10-21T14:00:00.000Z' });
    expect(previousVagas.cancelled).toBe(true);
    expect(previousStatus.cancelled).toBe(true);
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/vagas/status').flush([{ ...vaga, status: false, registroAtivo: null }]);
    harness.detectChanges();
    expect(
      Array.from(harness.routeNativeElement!.querySelectorAll('.metric-value'), (node) =>
        node.textContent?.trim(),
      ),
    ).toEqual(['27vagas', '1', '0', '0%']);
    await harness.navigateByUrl('/estacionamento');
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.exit-feedback')?.textContent).toContain(
      'Saída registrada com sucesso',
    );
    http.expectNone('/registros/saida');
    http.verify();
  });
});
