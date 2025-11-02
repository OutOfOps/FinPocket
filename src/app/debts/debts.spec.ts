import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Debts } from './debts';
import { SharedModule } from '../shared/shared-module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Debts', () => {
  let component: Debts;
  let fixture: ComponentFixture<Debts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Debts],
      imports: [SharedModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Debts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
