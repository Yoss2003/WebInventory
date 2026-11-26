import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { SalidasComponent } from './salidas';
import { ArticleService } from '../../../core/services/articles';
import { MovementService } from '../../../core/services/movement';
import { SalesService } from '../../../core/services/sales';

describe('SalidasComponent', () => {
  it('creates and loads empty movements', async () => {
    await TestBed.configureTestingModule({
      imports: [SalidasComponent],
      providers: [
        provideRouter([]),
        {provide: ArticleService,useValue:{getArticles:()=>of([])}},
        {provide: MovementService,useValue:{getMovements:()=>of([]),getCancellations:()=>of([])}},
        {provide: SalesService,useValue:{getCancellations:()=>of([])}},
        {provide: MatDialog,useValue:{open:()=>({afterClosed:()=>of(false)})}},
      ]
    }).compileComponents();
    const fixture=TestBed.createComponent(SalidasComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.loading).toBe(false);
    expect(fixture.componentInstance.ventas).toEqual([]);
  });
});
