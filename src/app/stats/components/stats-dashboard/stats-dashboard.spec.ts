import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { StatsDashboard } from './stats-dashboard';
import { SharedModule } from '../../../shared/shared-module';
import { NgxChartsModule } from '@swimlane/ngx-charts';

describe('StatsDashboard', () => {
  let component: StatsDashboard;
  let fixture: ComponentFixture<StatsDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatsDashboard],
      imports: [SharedModule, NgxChartsModule, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(StatsDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default data type as expenses', () => {
    expect(component.selectedDataType()).toBe('expenses');
  });

  it('should have default period as month', () => {
    expect(component.selectedPeriod()).toBe('month');
  });

  it('should have all data type options', () => {
    expect(component.dataTypes.length).toBe(4);
    expect(component.dataTypes.map(dt => dt.value)).toContain('expenses');
    expect(component.dataTypes.map(dt => dt.value)).toContain('balance');
    expect(component.dataTypes.map(dt => dt.value)).toContain('debts');
    expect(component.dataTypes.map(dt => dt.value)).toContain('meters');
  });

  it('should have all period options', () => {
    expect(component.periods.length).toBe(4);
    expect(component.periods.map(p => p.value)).toContain('week');
    expect(component.periods.map(p => p.value)).toContain('month');
    expect(component.periods.map(p => p.value)).toContain('quarter');
    expect(component.periods.map(p => p.value)).toContain('year');
  });

  it('should change data type when onDataTypeChange is called', () => {
    component.onDataTypeChange('balance');
    expect(component.selectedDataType()).toBe('balance');
  });

  it('should change period when onPeriodChange is called', () => {
    component.onPeriodChange('year');
    expect(component.selectedPeriod()).toBe('year');
  });

  it('should compute expenses by category data', () => {
    const data = component.expensesByCategoryData();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should compute balance by month data', () => {
    const data = component.balanceByMonthData();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should compute debts data', () => {
    const data = component.debtsData();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should compute meters consumption data', () => {
    const data = component.metersConsumptionData();
    expect(Array.isArray(data)).toBe(true);
  });
});
