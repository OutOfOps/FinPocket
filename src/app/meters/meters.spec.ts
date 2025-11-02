import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Meters } from './meters';
import { SharedModule } from '../shared/shared-module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Meters', () => {
  let component: Meters;
  let fixture: ComponentFixture<Meters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Meters],
      imports: [SharedModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Meters);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
