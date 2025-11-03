import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { Debts } from './debts';
import { SharedModule } from '../shared/shared-module';

describe('Debts', () => {
  let component: Debts;
  let fixture: ComponentFixture<Debts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Debts],
      imports: [SharedModule, RouterTestingModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Debts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
