import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'categoryIcon',
    standalone: true
})
export class CategoryIconPipe implements PipeTransform {
    private readonly iconMap: Record<string, string> = {
        // Expense Categories
        'Продукты': 'shopping_cart',
        'Транспорт': 'directions_car',
        'Дом': 'home',
        'Развлечения': 'movie',
        'Здоровье': 'favorite',
        'Кафе': 'restaurant',
        'Образование': 'school',
        'Подарки': 'card_giftcard',
        'Связь': 'wifi',
        'Спорт': 'fitness_center',
        'Техника': 'computer',
        'Одежда': 'checkroom',
        'Питомцы': 'pets',
        'Подписки': 'subscriptions',
        'Коммуналка': 'flash_on',
        'Другое': 'category',

        // Income Categories
        'Зарплата': 'payments',
        'Бизнес': 'work',
        'Подарки (Вход)': 'inventory_2',

        // Subscriptions / English Mappings
        'Education': 'school',
        'Digital': 'cloud',
        'Utility': 'flash_on',
        'Other': 'receipt_long'
    };

    transform(category: string | null | undefined): string {
        if (!category) return 'category';
        return this.iconMap[category] || 'local_offer';
    }
}
