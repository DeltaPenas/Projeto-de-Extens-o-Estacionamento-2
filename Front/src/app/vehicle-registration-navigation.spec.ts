import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { flushEmptyHistory } from './testing/history';

describe('Cadastro compartilhado entre as três páginas', () => {
  it('conclui o cadastro após navegar e disponibiliza o veículo no Dashboard e na entrada sem F5', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    const vaga = { id: 205, numero: 4 };
    const carro = { id: 81, placa: 'ABC1D23', modelo: 'Onix', cor: 'Branco' };
    await harness.navigateByUrl('/');
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/vagas/status').flush([{ ...vaga, status: false, registroAtivo: null }]);
    http.expectOne('/carros').flush([]);
    await harness.navigateByUrl('/estacionamento?vaga=4');
    flushEmptyHistory(http);
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Nenhum veículo cadastrado');
    await harness.navigateByUrl('/veiculos');
    http.expectNone('/carros');
    harness.detectChanges();
    for (const [id, value] of Object.entries({ placa: 'abc1d23', modelo: 'Onix', cor: 'Branco' })) {
      const input = harness.routeNativeElement!.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    harness
      .routeNativeElement!.querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const request = http.expectOne((req) => req.url === '/carros' && req.method === 'POST');
    await harness.navigateByUrl('/');
    expect(request.cancelled).toBe(false);
    harness.detectChanges();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.page-heading button')!.click();
    const staleCars = http.expectOne('/carros');
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/vagas/status').flush([{ ...vaga, status: false, registroAtivo: null }]);
    request.flush(carro, { status: 201, statusText: 'Created' });
    expect(staleCars.cancelled).toBe(true);
    http.expectOne('/carros').flush([carro]);
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('tbody')?.textContent).toContain('ABC1D23');
    expect(harness.routeNativeElement?.querySelector('tbody')?.textContent).toContain('Disponível');
    await harness.navigateByUrl('/estacionamento?vaga=4');
    harness.detectChanges();
    expect(
      harness.routeNativeElement?.querySelector('#entry-car option[value="81"]')?.textContent,
    ).toContain('ABC1D23');
    http.expectNone('/carros');
    await harness.navigateByUrl('/veiculos');
    harness.detectChanges();
    expect(
      harness.routeNativeElement?.querySelector('.registration-success')?.textContent,
    ).toContain('Veículo cadastrado com sucesso');
    expect(harness.routeNativeElement?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('#placa')?.value).toBe('');
    http.expectNone((req) => req.method === 'POST');
    flushEmptyHistory(http);
    http.verify();
  });

  it('preserva o rascunho de cadastro ao navegar sem enviar o formulário', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/veiculos');
    http.expectOne('/carros').flush([]);
    harness.detectChanges();
    const placa = harness.routeNativeElement!.querySelector<HTMLInputElement>('#placa')!;
    placa.value = 'ABC1D23';
    placa.dispatchEvent(new Event('input'));
    await harness.navigateByUrl('/');
    http.expectOne('/vagas').flush([]);
    http.expectOne('/vagas/status').flush([]);
    await harness.navigateByUrl('/veiculos');
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector<HTMLInputElement>('#placa')?.value).toBe(
      'ABC1D23',
    );
    http.expectNone((req) => req.method === 'POST');
    http.expectNone('/carros');
    http.verify();
  });
});
