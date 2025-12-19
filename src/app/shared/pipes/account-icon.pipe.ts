import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'accountIcon',
    standalone: true
})
export class AccountIconPipe implements PipeTransform {
    transform(type: string): string {
        switch (type) {
            case 'bank': return 'account_balance';
            case 'metal': return 'diamond';
            default: return 'payments'; // cash
        }
    }
}
