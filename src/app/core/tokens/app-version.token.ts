import { InjectionToken } from '@angular/core';
import packageJson from '../../../../package.json';

export const APP_VERSION = new InjectionToken<string>('APP_VERSION', {
  providedIn: 'root',
  factory: () => `v${packageJson.version}`,
});
