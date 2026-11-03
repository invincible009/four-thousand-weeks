import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App Component', () => {
  let component: App;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [App],
    });
    const fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should initialize with 4160 weeks and calculate lived weeks for default birthdate', () => {
    expect(component.weeks.length).toBe(4160);
    expect(component.totalWeeksLived).toBeGreaterThan(0);
    expect(component.selectedWeekIndex).toBe(55);
    expect(component.selectedWeek).not.toBeNull();
  });

  it('should generate 7 days for a selected week with correct labels and keys', () => {
    component.selectWeek(10);
    expect(component.selectedWeek).not.toBeNull();
    expect(component.selectedWeek?.days.length).toBe(7);
    expect(component.selectedWeek?.days[0].dayName).toBe('Mon');
    expect(component.selectedWeek?.days[6].dayName).toBe('Sun');
    expect(component.selectedWeek?.days[0].dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should allow switching the active selected day', () => {
    component.selectWeek(20);
    expect(component.selectedDayIndex).toBe(0);

    component.selectDay(3); // Thursday
    expect(component.selectedDayIndex).toBe(3);
    expect(component.currentSelectedDay?.dayName).toBe('Thu');
  });

  it('should save and retrieve top 3 activities for a selected day in localStorage', () => {
    component.selectWeek(55);
    const dateKey = component.selectedWeek!.days[0].dateKey;

    const mockEvent = {
      target: { value: 'Read chapter 1 of 4000 Weeks' },
    } as unknown as Event;

    component.updateDayActivity(dateKey, 0, mockEvent);

    const activities = component.getDayActivities(dateKey);
    expect(activities[0]).toBe('Read chapter 1 of 4000 Weeks');

    // Verify localStorage persistence
    const saved = JSON.parse(localStorage.getItem('ftw_day_activities') || '{}');
    expect(saved[dateKey][0]).toBe('Read chapter 1 of 4000 Weeks');
  });

  it('should close the week detail card', () => {
    component.selectWeek(55);
    expect(component.selectedWeek).not.toBeNull();

    component.closeCard();
    expect(component.selectedWeek).toBeNull();
    expect(component.selectedWeekIndex).toBeNull();
    expect(component.popoverPosition).toBeNull();
  });

  it('should recalculate lived weeks when birthdate changes', () => {
    const mockDobEvent = {
      target: { value: '2000-01-01' },
    } as unknown as Event;

    component.onDobChange(mockDobEvent);
    expect(component.birthDateString).toBe('2000-01-01');
    expect(component.totalWeeksLived).toBeGreaterThan(0);
    expect(component.weeks.some((w) => w.status === 'lived')).toBe(true);
  });
});
