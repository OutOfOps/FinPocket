import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Stats } from './stats';
import { SharedModule } from '../shared/shared-module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Stats', () => {
  let component: Stats;
  let fixture: ComponentFixture<Stats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Stats],
      imports: [SharedModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Stats);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
