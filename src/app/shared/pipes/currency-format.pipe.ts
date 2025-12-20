import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../../core/services/currency.service';

@Pipe({
    name: 'currencyFormat',
    standalone: true
})
export class CurrencyFormatPipe implements PipeTransform {
    private readonly currencyService = inject(CurrencyService);

    transform(value: number | undefined | null, currencyCode?: string): string {
        if (value === undefined || value === null) {
            return '';
        }

        // Use provided currencyCode or fall back to application default
        const code = currencyCode || this.currencyService.getDefaultCurrencyCode();
        return this.currencyService.format(value, code);
    }
}
