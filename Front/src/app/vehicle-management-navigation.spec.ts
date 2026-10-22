import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { CadastroVeiculoService } from './core/services/cadastro-veiculo.service';
import { flushEmptyHistory } from './testing/history';

describe('Edição e exclusão compartilhadas entre as páginas', () => {
  it.each(['edicao', 'exclusao'] as const)(
    'conclui %s após navegar e atualiza Dashboard e seleção de entrada sem F5',
    async (operacao) => {
      TestBed.configureTestingModule({
        providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
      });
      const http = TestBed.inject(HttpTestingController);
      const cadastro = TestBed.inject(CadastroVeiculoService);
      const harness = await RouterTestingHarness.create('/veiculos');
      const carro = { id: 81, placa: 'ABC1D23', modelo: 'Onix', cor: 'Branco' };
      const atualizado = { ...carro, placa: 'DEF4G56', modelo: 'Gol', cor: 'Azul' };
      const vaga = { id: 205, numero: 4 };
      http.expectOne('/carros').flush([carro]);
      harness.detectChanges();
      if (operacao === 'edicao') {
        harness.routeNativeElement!.querySelector<HTMLButtonElement>('.edit-button')!.click();
        harness.detectChanges();
        cadastro.formulario.setValue({
          placa: atualizado.placa,
          modelo: atualizado.modelo,
          cor: atualizado.cor,
        });
        harness
          .routeNativeElement!.querySelector('form')!
          .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      } else {
        harness.routeNativeElement!.querySelector<HTMLButtonElement>('.delete-button')!.click();
        harness.detectChanges();
        harness
          .routeNativeElement!.querySelector<HTMLButtonElement>('dialog .button-danger')!
          .click();
      }
      const request = http.expectOne(
        (r) => r.url === '/carros/81' && r.method === (operacao === 'edicao' ? 'PUT' : 'DELETE'),
      );
      await harness.navigateByUrl('/');
      expect(request.cancelled).toBe(false);
      const antigos = [http.expectOne('/vagas'), http.expectOne('/vagas/status')];
      if (operacao === 'edicao') request.flush(atualizado);
      else request.flush(null, { status: 204, statusText: 'No Content' });
      antigos.forEach((r) => expect(r.cancelled).toBe(true));
      http.expectOne('/carros').flush(operacao === 'edicao' ? [atualizado] : []);
      http.expectOne('/vagas').flush([vaga]);
      http.expectOne('/vagas/status').flush([{ ...vaga, status: false, registroAtivo: null }]);
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('tbody')?.textContent ?? '').not.toContain(
        'ABC1D23',
      );
      if (operacao === 'edicao')
        expect(harness.routeNativeElement?.querySelector('tbody')?.textContent).toContain(
          'DEF4G56',
        );
      await harness.navigateByUrl('/estacionamento?vaga=4');
      flushEmptyHistory(http);
      harness.detectChanges();
      if (operacao === 'edicao')
        expect(
          harness.routeNativeElement?.querySelector('#entry-car option[value="81"]')?.textContent,
        ).toContain('DEF4G56');
      else
        expect(
          harness.routeNativeElement?.querySelector('#entry-car option[value="81"]'),
        ).toBeNull();
      await harness.navigateByUrl('/veiculos');
      harness.detectChanges();
      expect(
        harness.routeNativeElement?.querySelector('.registration-success')?.textContent,
      ).toContain(operacao === 'edicao' ? 'Alterações salvas' : 'Veículo excluído com sucesso');
      http.expectNone('/carros');
      http.expectNone((r) => r.method === 'PUT' || r.method === 'DELETE');
      http.verify();
    },
  );
});
