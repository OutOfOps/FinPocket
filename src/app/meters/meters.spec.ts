import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { Meters } from './meters';
import { SharedModule } from '../shared/shared-module';

describe('Meters', () => {
  let component: Meters;
  let fixture: ComponentFixture<Meters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Meters],
      imports: [SharedModule, RouterTestingModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Meters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
