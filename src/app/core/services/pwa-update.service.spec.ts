import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { of } from 'rxjs';
import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  let service: PwaUpdateService;
  let swUpdateMock: jasmine.SpyObj<SwUpdate>;

  beforeEach(() => {
    const swUpdateSpy = jasmine.createSpyObj('SwUpdate', ['checkForUpdate', 'activateUpdate'], {
      isEnabled: true,
      versionUpdates: of()
    });
    swUpdateSpy.checkForUpdate.and.returnValue(Promise.resolve(false));

    TestBed.configureTestingModule({
      providers: [
        PwaUpdateService,
        { provide: SwUpdate, useValue: swUpdateSpy }
      ]
    });

    service = TestBed.inject(PwaUpdateService);
    swUpdateMock = TestBed.inject(SwUpdate) as jasmine.SpyObj<SwUpdate>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check for updates immediately when enabled', () => {
    expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
  });

  it('should check for updates when checkForUpdate is called', async () => {
    swUpdateMock.checkForUpdate.calls.reset();
    swUpdateMock.checkForUpdate.and.returnValue(Promise.resolve(true));
    const result = await service.checkForUpdate();
    expect(result).toBe(true);
    expect(swUpdateMock.checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('should activate update when activateUpdate is called', async () => {
    swUpdateMock.activateUpdate.and.returnValue(Promise.resolve(true));
    const result = await service.activateUpdate();
    expect(result).toBe(true);
    expect(swUpdateMock.activateUpdate).toHaveBeenCalled();
  });

  it('should return false when service worker is not enabled', async () => {
    Object.defineProperty(swUpdateMock, 'isEnabled', { value: false });
    const checkResult = await service.checkForUpdate();
    const activateResult = await service.activateUpdate();
    expect(checkResult).toBe(false);
    expect(activateResult).toBe(false);
  });
});
