import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('devrait ajouter un toast success', () => {
    service.success('École créée');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].text).toBe('École créée');
  });

  it('devrait supprimer un toast par son id', () => {
    service.success('Message 1');
    const id = service.toasts()[0].id;
    service.remove(id);
    expect(service.toasts().length).toBe(0);
  });
});

