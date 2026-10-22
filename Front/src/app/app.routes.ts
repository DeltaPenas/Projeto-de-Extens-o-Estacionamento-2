import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Dashboard | Estacionamento SEAGRI',
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'estacionamento',
    title: 'Mapa | Estacionamento SEAGRI',
    loadComponent: () => import('./pages/parking/parking').then((m) => m.Parking),
  },
  {
    path: 'veiculos',
    title: 'Veículos | Estacionamento SEAGRI',
    loadComponent: () =>
      import('./pages/veiculos/veiculos')
        .then(componente => componente.Veiculos),
  },
  { path: '**', redirectTo: '' },
];
