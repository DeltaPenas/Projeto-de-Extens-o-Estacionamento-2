import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CadastroVeiculoService } from '../../core/services/cadastro-veiculo.service';
import { ParkingDataService } from '../../core/services/parking-data.service';
import { ParkingHistoryService } from '../../core/services/parking-history.service';
import { flushEmptyHistory } from '../../testing/history';
import { Veiculos } from './veiculos';

describe('Edição e exclusão reais de veículos', () => {
  const carro = { id: 81, placa: 'ABC1D23', modelo: 'Onix', cor: 'Branco' };
  const atualizado = { ...carro, placa: 'DEF4G56', modelo: 'Gol', cor: 'Azul' };
  let fixture: ComponentFixture<Veiculos>;
  let http: HttpTestingController;
  let element: HTMLElement;
  let cadastro: CadastroVeiculoService;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Veiculos],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    cadastro = TestBed.inject(CadastroVeiculoService);
    fixture = TestBed.createComponent(Veiculos);
    fixture.detectChanges();
    element = fixture.nativeElement;
    http.expectOne('/carros').flush([carro]);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  const click = (selector: string) => {
    element.querySelector<HTMLButtonElement>(selector)!.click();
    fixture.detectChanges();
  };
  function submitEdit() {
    click('.edit-button');
    cadastro.formulario.setValue({ placa: ' def-4g56 ', modelo: ' Gol ', cor: ' Azul ' });
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    return http.expectOne((r) => r.method === 'PUT' && r.url === '/carros/81');
  }
  function confirmDelete() {
    click('.delete-button');
    click('dialog .button-danger');
    return http.expectOne((r) => r.method === 'DELETE' && r.url === '/carros/81');
  }
  function refresh(carros = [carro]) {
    http.expectOne('/carros').flush(carros);
    http.expectOne('/vagas').flush([]);
    http.expectOne('/vagas/status').flush([]);
    fixture.detectChanges();
  }

  it('preenche o cadastro selecionado e restaura o rascunho de cadastro ao cancelar', () => {
    cadastro.formulario.setValue({ placa: 'NEW1A01', modelo: 'Rascunho', cor: 'Prata' });
    click('.edit-button');
    expect(element.querySelector<HTMLInputElement>('#placa')?.value).toBe('ABC1D23');
    expect(element.querySelector('#form-title')?.textContent).toContain('Editar veículo');
    click('.form-actions button[type="button"]');
    expect(element.querySelector<HTMLInputElement>('#modelo')?.value).toBe('Rascunho');
    expect(element.querySelector('#form-title')?.textContent).toContain('Cadastrar veículo');
    http.expectNone((r) => r.method !== 'GET');
  });

  it('envia PUT com o ID original e campos normalizados, bloqueando ações concorrentes', () => {
    const req = submitEdit();
    expect(req.request.body).toEqual({ placa: 'DEF4G56', modelo: 'Gol', cor: 'Azul' });
    expect(element.querySelector('fieldset')!.disabled).toBe(true);
    expect(element.querySelector<HTMLButtonElement>('.delete-button')!.disabled).toBe(true);
    cadastro.editar({ ...carro, id: 999 });
    cadastro.cadastrar();
    cadastro.limparFormulario();
    http.expectNone((r) => r.method === 'PUT');
    req.flush(atualizado);
    refresh([atualizado]);
    expect(element.querySelector('tbody')?.textContent).toContain('DEF4G56');
    expect(element.querySelector('.registration-success')?.textContent).toContain(
      'Alterações salvas',
    );
    expect(element.querySelector('#form-title')?.textContent).toContain('Cadastrar veículo');
  });

  it.each([400, 409, 404])(
    'mantém os campos ao rejeitar a edição com %i e não expõe o erro interno',
    (status) => {
      submitEdit().flush({ erro: 'Prisma: internal SQL' }, { status, statusText: 'Rejected' });
      refresh();
      expect(element.querySelector('.registration-success')).toBeNull();
      expect(element.querySelector('.registration-warning')).not.toBeNull();
      expect(element.textContent).not.toContain('Prisma');
      expect(element.querySelector<HTMLInputElement>('#placa')?.value).toBe('DEF4G56');
      expect(cadastro.edicao()?.id).toBe(81);
      http.expectNone((r) => r.method === 'PUT');
    },
  );

  it('não repete PUT após falha de rede e consulta o estado para resolver a confirmação incerta', () => {
    submitEdit().error(new ProgressEvent('error'));
    refresh([atualizado]);
    expect(element.querySelector('.registration-warning')?.textContent).toContain(
      'Não foi possível confirmar a alteração',
    );
    http.expectNone((r) => r.method === 'PUT');
  });

  it('não inventa detalhes se o 200 de edição trouxer outro ID', () => {
    submitEdit().flush({ ...atualizado, id: 999 });
    refresh([atualizado]);
    expect(element.querySelector('.registration-success')?.textContent).toContain(
      'Consulte a lista',
    );
    expect(element.querySelector('.registration-details')?.textContent).not.toContain('999');
  });

  it('não confirma edição com status inesperado', () => {
    submitEdit().flush(atualizado, { status: 201, statusText: 'Created' });
    refresh();
    expect(element.querySelector('.registration-success')).toBeNull();
    expect(element.querySelector('.registration-warning')?.textContent).toContain(
      'Não foi possível confirmar',
    );
  });

  it('confirma o veículo e permite cancelar por botão ou Escape sem enviar DELETE', () => {
    click('.delete-button');
    expect(element.querySelector('dialog')?.textContent).toContain('ABC1D23');
    expect(element.querySelector('dialog')?.textContent).toContain('Onix');
    click('dialog .button:not(.button-danger)');
    expect(cadastro.exclusao()).toBeNull();
    click('.delete-button');
    element.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();
    expect(cadastro.exclusao()).toBeNull();
    http.expectNone((r) => r.method === 'DELETE');
  });

  it('exclui somente o ID confirmado, impede repetição e remove o veículo após 204', () => {
    const req = confirmDelete();
    expect(req.request.body).toBeNull();
    cadastro.excluir();
    cadastro.cancelarExclusao();
    cadastro.solicitarExclusao({ ...carro, id: 999 });
    expect(cadastro.exclusao()?.id).toBe(81);
    http.expectNone((r) => r.method === 'DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    refresh([]);
    expect(element.textContent).toContain('Veículo excluído com sucesso');
    expect(element.textContent).toContain('Nenhum veículo cadastrado');
    expect(cadastro.exclusao()).toBeNull();
  });

  it.each([
    'Não é possível excluir um veículo estacionado. Registre a saída primeiro',
    'Este veículo possui histórico de movimentações e não pode ser excluído',
  ])('explica o bloqueio de exclusão: %s', (erro) => {
    confirmDelete().flush({ erro }, { status: 409, statusText: 'Conflict' });
    refresh();
    expect(element.querySelector('.registration-warning')?.textContent).toContain(erro);
    expect(element.querySelector('tbody')?.textContent).toContain('ABC1D23');
    expect(element.querySelector('.registration-success')).toBeNull();
    expect(cadastro.exclusao()).toBeNull();
  });

  it('trata veículo removido por outro operador com 404 e atualiza a lista', () => {
    confirmDelete().flush(
      { erro: 'Veículo não encontrado' },
      { status: 404, statusText: 'Not Found' },
    );
    refresh([]);
    expect(element.querySelector('.registration-warning')?.textContent).toContain(
      'Veículo não encontrado',
    );
    expect(element.querySelector('.registration-success')).toBeNull();
  });

  it('falha de rede no DELETE deixa confirmação incerta, sem repetição automática', () => {
    confirmDelete().error(new ProgressEvent('error'));
    refresh([]);
    expect(element.querySelector('.registration-warning')?.textContent).toContain(
      'Não foi possível confirmar a exclusão',
    );
    http.expectNone((r) => r.method === 'DELETE');
  });

  it('preserva a confirmação de exclusão se a consulta seguinte falhar', () => {
    confirmDelete().flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/carros').error(new ProgressEvent('error'));
    http.expectOne('/vagas').flush([]);
    http.expectOne('/vagas/status').flush([]);
    fixture.detectChanges();
    expect(element.querySelector('.registration-success')?.textContent).toContain(
      'Veículo excluído com sucesso',
    );
    expect(element.textContent).toContain('Não foi possível carregar os veículos');
    click('.error-state button');
    http.expectOne('/carros').flush([]);
    fixture.detectChanges();
    http.expectNone((r) => r.method === 'DELETE');
  });

  it('cancela consultas antigas e atualiza carros, ocupante e histórico já consultado', () => {
    const data = TestBed.inject(ParkingDataService);
    const historico = TestBed.inject(ParkingHistoryService);
    const vaga = { id: 205, numero: 4 };
    const ativo = {
      id: 56,
      carroId: 81,
      vagaId: 205,
      entrada: '2026-10-22T10:00:00.000Z',
      saida: null,
      carro: atualizado,
    };
    const req = submitEdit();
    data.carros.reload();
    data.refreshParking();
    historico.load({ page: 2, limit: 10, placa: 'ABC' });
    const antigas = [
      http.expectOne('/carros'),
      http.expectOne('/vagas'),
      http.expectOne('/vagas/status'),
      http.expectOne((r) => r.url === '/registros'),
    ];
    req.flush(atualizado);
    antigas.forEach((r) => expect(r.cancelled).toBe(true));
    http.expectOne('/carros').flush([atualizado]);
    http.expectOne('/vagas').flush([vaga]);
    http.expectOne('/vagas/status').flush([{ ...vaga, status: true, registroAtivo: ativo }]);
    flushEmptyHistory(http);
    fixture.detectChanges();
    expect(data.carrosComSituacao()[0].placa).toBe('DEF4G56');
    expect(data.vagasComDisponibilidade()[0].ocupacao?.veiculo.modelo).toBe('Gol');
    expect(historico.consulta()).toEqual({ page: 1, limit: 10, placa: 'ABC' });
  });
});
