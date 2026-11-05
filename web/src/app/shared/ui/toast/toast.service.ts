import { Injectable, signal, computed } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private _toasts = signal<ToastMessage[]>([]);
  readonly toasts = computed(() => this._toasts());

  private nextId = 1;

  success(text: string): void {
    const id = this.nextId++;
    this._toasts.update((current) => [...current, { id, text }]);

    setTimeout(() => {
      this.remove(id);
    }, 4000);
  }

  remove(id: number): void {
    this._toasts.update((current) => current.filter((t) => t.id !== id));
  }
}

