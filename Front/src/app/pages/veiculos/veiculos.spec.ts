import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CadastroVeiculoService } from '../../core/services/cadastro-veiculo.service';
import { Veiculos } from './veiculos';

describe('Listagem e cadastro reais de veículos', () => {
  let fixture: ComponentFixture<Veiculos>;
  let http: HttpTestingController;
  let element: HTMLElement;
  const carro = { id: 81, placa: 'ABC1D23', modelo: 'Ônix', cor: 'Branco' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Veiculos],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Veiculos);
    fixture.detectChanges();
    element = fixture.nativeElement;
  });
  afterEach(() => http.verify());

  function load(carros = [carro]) {
    http.expectOne('/carros').flush(carros);
    fixture.detectChanges();
  }
  function fill(placa = ' abc-1d23 ', modelo = ' Ônix ', cor = ' Branco ') {
    for (const [id, value] of Object.entries({ placa, modelo, cor })) {
      const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  }
  function submit() {
    element
      .querySelector('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('carrega apenas dados da API e não apresenta veículos fictícios durante a consulta', () => {
    expect(element.textContent).toContain('Carregando veículos');
    expect(element.querySelector('tbody')).toBeNull();
    expect(element.textContent).not.toContain('Fiat Uno ·');
    load();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('tbody')?.textContent).toContain('ABC1D23');
    expect(element.querySelector('tbody')?.textContent).toContain('Ônix');
    expect(element.querySelectorAll('.delete-button')).toHaveLength(0);
  });

  it('busca por placa, modelo e cor sem exigir acentos', () => {
    load([carro, { id: 82, placa: 'DEF4G56', modelo: 'Gol', cor: 'Azul' }]);
    const input = element.querySelector<HTMLInputElement>('#pesquisa')!;
    for (const value of ['onix', 'abc1', 'branco']) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
      expect(element.querySelector('tbody')?.textContent).toContain('ABC1D23');
    }
    input.value = 'inexistente';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.textContent).toContain('Nenhum resultado encontrado');
    expect(element.querySelector('tbody')).toBeNull();
  });

  it('diferencia lista vazia de falha e permite repetir a listagem', () => {
    http.expectOne('/carros').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(element.textContent).toContain('Não foi possível carregar os veículos');
    expect(element.textContent).not.toContain('Nenhum veículo cadastrado');
    element.querySelector<HTMLButtonElement>('.error-state button')!.click();
    load([]);
    expect(element.textContent).toContain('Nenhum veículo cadastrado');
    expect(element.querySelector('.vehicle-form')).not.toBeNull();
  });

  it.each([null, { items: [] }, [{ id: 1, placa: 'ABC1234' }]])(
    'rejeita resposta de listagem inválida: %j',
    (response) => {
      http.expectOne('/carros').flush(response);
      fixture.detectChanges();
      expect(element.textContent).toContain('Não foi possível carregar os veículos');
      expect(element.querySelector('tbody')).toBeNull();
    },
  );

  it.each([
    ['', '', ''],
    ['ABC1D23', '   ', 'Branco'],
    ['ABC1D23', 'Onix', '   '],
    ['1234567', 'Onix', 'Branco'],
  ])('exige os campos válidos antes do envio: %s, %s, %s', (placa, modelo, cor) => {
    load([]);
    fill(placa, modelo, cor);
    submit();
    expect(element.querySelector('[aria-invalid="true"]')).not.toBeNull();
    http.expectNone((req) => req.method === 'POST');
  });

  it('normaliza os campos, envia POST sem ID e impede envios duplicados', () => {
    load([]);
    fill();
    submit();
    const request = http.expectOne((req) => req.url === '/carros' && req.method === 'POST');
    expect(request.request.body).toEqual({ placa: 'ABC1D23', modelo: 'Ônix', cor: 'Branco' });
    expect(element.querySelector('fieldset')!.disabled).toBe(true);
    submit();
    http.expectNone((req) => req.method === 'POST');
    TestBed.inject(CadastroVeiculoService).limparFormulario();
    expect(element.querySelector<HTMLInputElement>('#placa')?.value).toBe('ABC1D23');
    request.flush(carro, { status: 201, statusText: 'Created' });
    load();
    expect(element.querySelector('.registration-success')?.textContent).toContain(
      'Veículo cadastrado com sucesso',
    );
    expect(element.querySelector('.registration-details')?.textContent).toContain('ID 81');
    expect(element.querySelector<HTMLInputElement>('#placa')?.value).toBe('');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('fieldset')!.disabled).toBe(false);
  });

  it('cancela uma listagem anterior ao cadastro para evitar dados desatualizados', () => {
    const previous = http.expectOne('/carros');
    fill();
    submit();
    http
      .expectOne((req) => req.method === 'POST')
      .flush(carro, { status: 201, statusText: 'Created' });
    expect(previous.cancelled).toBe(true);
    load();
    expect(element.querySelector('tbody')?.textContent).toContain('ABC1D23');
  });

  it('preserva o sucesso se a atualização da lista falhar e oferece nova consulta', () => {
    load([]);
    fill();
    submit();
    http
      .expectOne((req) => req.method === 'POST')
      .flush(carro, { status: 201, statusText: 'Created' });
    http.expectOne('/carros').error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(element.querySelector('.registration-success')?.textContent).toContain(
      'Veículo cadastrado com sucesso',
    );
    expect(element.textContent).toContain('Não foi possível carregar os veículos');
    element.querySelector<HTMLButtonElement>('.error-state button')!.click();
    load();
    expect(element.querySelector('tbody')?.textContent).toContain('ABC1D23');
    http.expectNone((req) => req.method === 'POST');
  });

  it.each([400, 409])(
    'trata rejeição %i sem exibir detalhes do Prisma e mantém o formulário',
    (status) => {
      load([]);
      fill();
      submit();
      http
        .expectOne((req) => req.method === 'POST')
        .flush(
          { erro: 'PrismaClientKnownRequestError: Unique constraint failed on placa' },
          { status, statusText: 'Rejected' },
        );
      load([carro]);
      expect(element.querySelector('.registration-warning')?.textContent).toContain(
        'Confira os dados e se a placa já está cadastrada',
      );
      expect(element.textContent).not.toContain('Prisma');
      expect(element.querySelector('.registration-success')).toBeNull();
      expect(element.querySelector<HTMLInputElement>('#placa')?.value).toBe('ABC1D23');
      http.expectNone((req) => req.method === 'POST');
    },
  );

  it.each(['rede', 'servidor'])(
    'trata falha de %s como incerta e consulta a lista sem repetir o envio',
    (tipo) => {
      load([]);
      fill();
      submit();
      const req = http.expectOne((req) => req.method === 'POST');
      if (tipo === 'rede') req.error(new ProgressEvent('error'));
      else req.flush({ erro: 'Prisma interno' }, { status: 500, statusText: 'Server Error' });
      load();
      expect(element.querySelector('.registration-warning')?.textContent).toContain(
        'Não foi possível confirmar o cadastro',
      );
      expect(element.querySelector('.registration-success')).toBeNull();
      expect(element.textContent).not.toContain('Prisma');
      expect(element.querySelector<HTMLInputElement>('#placa')?.value).toBe('ABC1D23');
      http.expectNone((req) => req.method === 'POST');
    },
  );

  it('reconhece o 201 com corpo incompleto sem inventar um ID', () => {
    load([]);
    fill();
    submit();
    http
      .expectOne((req) => req.method === 'POST')
      .flush({ id: 999 }, { status: 201, statusText: 'Created' });
    load();
    expect(element.querySelector('.registration-success')?.textContent).toContain(
      'Consulte a lista para conferir os detalhes',
    );
    expect(element.querySelector('.registration-details')?.textContent).not.toContain('ID');
    expect(element.querySelector('.registration-details')?.textContent).not.toContain('999');
  });

  it('não considera um status inesperado como confirmação do cadastro', () => {
    load([]);
    fill();
    submit();
    http.expectOne((req) => req.method === 'POST').flush(carro);
    load();
    expect(element.querySelector('.registration-success')).toBeNull();
    expect(element.querySelector('.registration-warning')?.textContent).toContain(
      'Não foi possível confirmar',
    );
  });

  it('limpa os campos e dispensa a confirmação sem alterar registros nem enviar requisições', () => {
    load();
    fill();
    Array.from(element.querySelectorAll<HTMLButtonElement>('.form-actions button'))
      .find((button) => button.textContent?.includes('Limpar campos'))!
      .click();
    fixture.detectChanges();
    expect(element.querySelector<HTMLInputElement>('#placa')?.value).toBe('');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    http.expectNone((req) => req.method !== 'GET');
  });
});
