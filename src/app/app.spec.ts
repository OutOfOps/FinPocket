import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SwUpdate } from '@angular/service-worker';
import { of } from 'rxjs';
import { App } from './app';
import { SharedModule } from './shared/shared-module';

describe('App', () => {
  let swUpdateMock: jasmine.SpyObj<SwUpdate>;

  beforeEach(async () => {
    swUpdateMock = jasmine.createSpyObj('SwUpdate', ['checkForUpdate', 'activateUpdate'], {
      isEnabled: false,
      versionUpdates: of()
    });

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, SharedModule, NoopAnimationsModule],
      declarations: [App],
      providers: [
        { provide: SwUpdate, useValue: swUpdateMock }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render navigation title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.toolbar-name')?.textContent).toContain('FinPocket');
  });
});
