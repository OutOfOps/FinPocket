import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { Sync } from './sync';
import { SharedModule } from '../shared/shared-module';

describe('Sync', () => {
  let component: Sync;
  let fixture: ComponentFixture<Sync>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Sync],
      imports: [SharedModule, RouterTestingModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Sync);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
