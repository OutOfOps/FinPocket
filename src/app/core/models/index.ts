export enum CategoryType {
  Income = 'income',
  Expense = 'expense',
  Transfer = 'transfer',
}

export enum DebtDirection {
  Borrowed = 'borrowed',
  Lent = 'lent',
}

export enum DebtStatus {
  Pending = 'pending',
  Paid = 'paid',
  Overdue = 'overdue',
}

export enum MeterReadingType {
  Electricity = 'electricity',
  Water = 'water',
  Gas = 'gas',
  Other = 'other',
}

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
}

export interface Account {
  id: number;
  name: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: number;
  date: Date;
  category: Category['id'];
  amount: number;
  accountId: Account['id'];
  note?: string;
}

export interface Debt {
  id: number;
  person: string;
  amount: number;
  direction: DebtDirection;
  dueDate: Date;
  note?: string;
  status: DebtStatus;
}

export interface MeterReading {
  id: number;
  object: string;
  type: MeterReadingType;
  value: number;
  date: Date;
}

export interface Backup<TData = Record<string, unknown>> {
  timestamp: Date;
  data: TData;
}
