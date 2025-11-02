import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sync } from './sync';
import { SharedModule } from '../shared/shared-module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('Sync', () => {
  let component: Sync;
  let fixture: ComponentFixture<Sync>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Sync],
      imports: [SharedModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Sync);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
