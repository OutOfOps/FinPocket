import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { Finance } from './finance';
import { SharedModule } from '../shared/shared-module';

describe('Finance', () => {
  let component: Finance;
  let fixture: ComponentFixture<Finance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Finance],
      imports: [SharedModule, RouterTestingModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Finance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
