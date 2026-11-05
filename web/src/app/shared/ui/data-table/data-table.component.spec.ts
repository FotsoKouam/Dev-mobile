import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableComponent, ColumnDef } from './data-table.component';

describe('DataTableComponent', () => {
  let component: DataTableComponent;
  let fixture: ComponentFixture<DataTableComponent>;

  const columns: ColumnDef[] = [
    { key: 'name', header: 'Nom' },
    { key: 'city', header: 'Ville' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DataTableComponent);
    component = fixture.componentInstance;
    component.columns = columns;
  });

  it('devrait afficher les données fournies', () => {
    component.data = [{ id: '1', name: 'Saint Jean', city: 'Yaoundé' }];
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Saint Jean');
    expect(el.textContent).toContain('Yaoundé');
  });

  it('devrait émettre la nouvelle page lors du clic de pagination', () => {
    component.data = [{ id: '1', name: 'A', city: 'B' }];
    component.meta = { page: 1, limit: 10, total: 25 };
    fixture.detectChanges();

    const pageChangeSpy = vi.spyOn(component.pageChange, 'emit');
    component.goToPage(2);

    expect(pageChangeSpy).toHaveBeenCalledWith(2);
  });

  it('devrait afficher un message par défaut quand la liste est vide', () => {
    component.data = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aucune donnée disponible.');
  });
});

