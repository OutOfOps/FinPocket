import { Component, inject } from '@angular/core';
import { GoogleAuthService } from '../services/google-auth.service';

@Component({
  selector: 'app-sync',
  standalone: false,
  templateUrl: './sync.html',
  styleUrl: './sync.scss',
})
export class Sync {
  protected readonly googleAuth = inject(GoogleAuthService);
}
