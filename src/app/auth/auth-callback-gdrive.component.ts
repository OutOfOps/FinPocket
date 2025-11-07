import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GoogleAuthService } from '../services/google-auth.service';

@Component({
  selector: 'app-auth-callback-gdrive',
  standalone: false,
  template: '<p>Подключаем Google Drive…</p>'
})
export class AuthCallbackGdriveComponent implements OnInit {
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly auth: GoogleAuthService,
    private readonly snack: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    const code = this.route.snapshot.queryParamMap.get('code');
    if (!code) {
      this.snack.open('Ошибка: код отсутствует', 'Закрыть');
      return;
    }

    try {
      await this.auth.exchangeCodeForToken(code);
      this.snack.open('✅ Google Drive успешно подключён', 'ОК', { duration: 3000 });
      this.clearQueryParams();
    } catch (error) {
      console.error(error);
      this.snack.open('❌ Ошибка авторизации Google Drive', 'Закрыть');
    }
  }

  private clearQueryParams(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      })
      .catch(() => {
        window.history.replaceState({}, document.title, this.router.url.split('?')[0]);
      });
  }
}
