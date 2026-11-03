import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DayDetail {
  dayIndex: number; // 0 to 6
  dayName: string;
  dayNumber: number;
  date: Date;
  dateKey: string; // YYYY-MM-DD
}

export interface SelectedWeekInfo {
  index: number;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: DayDetail[];
  status: 'lived' | 'current' | 'ahead';
}

export interface PopoverPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
  arrowOffsetLeft: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements OnInit {
  @ViewChild('gridContainer') gridContainer?: ElementRef<HTMLElement>;

  // Default birth date matching screenshot: July 10, 1990
  birthDateString = '1990-07-10';
  totalWeeksLived = 0;
  totalWeeksInGrid = 4160; // 80 years * 52 weeks
  selectedWeekIndex: number | null = 55; // Default week 55 selected as in screenshot
  selectedWeek: SelectedWeekInfo | null = null;
  selectedDayIndex: number = 0; // Selected day among 7 days (0 to 6)
  popoverPosition: PopoverPosition | null = null;

  weeks: { index: number; status: 'lived' | 'current' | 'ahead' }[] = [];

  // Activities keyed by specific day date string (e.g. "1991-01-14": ["...", "...", "..."])
  dayActivitiesMap: Record<string, string[]> = {};

  activityPlaceholders: string[] = [
    'First priority or accomplishment',
    'Second priority or moment',
    'Third priority or reflection',
  ];

  readonly columns = 52;
  readonly rows = 80;

  ngOnInit(): void {
    this.loadActivities();
    this.recalculate();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.selectedWeekIndex !== null) {
      this.updatePopoverCoordinates();
    }
  }

  loadActivities(): void {
    try {
      const saved = localStorage.getItem('ftw_day_activities');
      if (saved) {
        this.dayActivitiesMap = JSON.parse(saved);
      }
    } catch {
      this.dayActivitiesMap = {};
    }
  }

  saveActivities(): void {
    try {
      localStorage.setItem('ftw_day_activities', JSON.stringify(this.dayActivitiesMap));
    } catch (e) {
      console.error('Failed to save activities to localStorage', e);
    }
  }

  get currentSelectedDay(): DayDetail | null {
    if (!this.selectedWeek || !this.selectedWeek.days[this.selectedDayIndex]) {
      return null;
    }
    return this.selectedWeek.days[this.selectedDayIndex];
  }

  getDayActivities(dateKey: string): string[] {
    if (!this.dayActivitiesMap[dateKey]) {
      this.dayActivitiesMap[dateKey] = ['', '', ''];
    }
    return this.dayActivitiesMap[dateKey];
  }

  updateDayActivity(dateKey: string, itemIndex: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!this.dayActivitiesMap[dateKey]) {
      this.dayActivitiesMap[dateKey] = ['', '', ''];
    }
    this.dayActivitiesMap[dateKey][itemIndex] = input.value;
    this.saveActivities();
  }

  selectDay(dayIndex: number): void {
    this.selectedDayIndex = dayIndex;
  }

  onDobChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.birthDateString = input.value;
      this.recalculate();
    }
  }

  recalculate(): void {
    const [year, month, day] = this.birthDateString.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);
    const now = new Date();

    const msDiff = now.getTime() - birthDate.getTime();
    const daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    this.totalWeeksLived = Math.max(0, Math.floor(daysDiff / 7));

    this.weeks = Array.from({ length: this.totalWeeksInGrid }, (_, i) => {
      let status: 'lived' | 'current' | 'ahead' = 'ahead';
      if (i < this.totalWeeksLived) {
        status = 'lived';
      } else if (i === this.totalWeeksLived) {
        status = 'current';
      }
      return { index: i, status };
    });

    if (this.selectedWeekIndex !== null) {
      this.selectWeek(this.selectedWeekIndex);
    }
  }

  selectWeek(index: number, clickEvent?: MouseEvent): void {
    this.selectedWeekIndex = index;
    const [year, month, day] = this.birthDateString.split('-').map(Number);
    const birthDate = new Date(year, month - 1, day);

    const weekStart = new Date(birthDate);
    weekStart.setDate(birthDate.getDate() + index * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days: DayDetail[] = [];

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + d);
      const dayName = dayLabels[d];
      const y = dayDate.getFullYear();
      const m = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${dd}`;

      days.push({
        dayIndex: d,
        dayName,
        dayNumber: dayDate.getDate(),
        date: dayDate,
        dateKey,
      });
    }

    let status: 'lived' | 'current' | 'ahead' = 'ahead';
    if (index < this.totalWeeksLived) {
      status = 'lived';
    } else if (index === this.totalWeeksLived) {
      status = 'current';
    }

    this.selectedWeek = {
      index,
      weekNumber: index,
      startDate: weekStart,
      endDate: weekEnd,
      days,
      status,
    };

    setTimeout(() => {
      this.updatePopoverCoordinates();
    }, 0);
  }

  updatePopoverCoordinates(): void {
    if (this.selectedWeekIndex === null || !this.gridContainer) {
      return;
    }

    const containerEl = this.gridContainer.nativeElement;
    const targetEl = containerEl.querySelector(`[data-week-index="${this.selectedWeekIndex}"]`) as HTMLElement;
    if (!targetEl) return;

    const targetRect = targetEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    const cardWidth = 330;
    const cardHeight = 300;
    const gap = 12;

    const targetCenterX = targetRect.left + targetRect.width / 2 - containerRect.left;
    const targetTop = targetRect.top - containerRect.top;
    const targetBottom = targetRect.bottom - containerRect.top;

    let placement: 'top' | 'bottom' = 'top';
    let top = targetTop - cardHeight - gap;

    if (top < 10) {
      placement = 'bottom';
      top = targetBottom + gap;
    }

    let left = targetCenterX - cardWidth / 2;
    const padding = 16;
    if (left < padding) {
      left = padding;
    } else if (left + cardWidth > containerRect.width - padding) {
      left = containerRect.width - padding - cardWidth;
    }

    const arrowOffsetLeft = targetCenterX - left;

    this.popoverPosition = {
      top,
      left,
      placement,
      arrowOffsetLeft,
    };
  }

  closeCard(): void {
    this.selectedWeek = null;
    this.selectedWeekIndex = null;
    this.popoverPosition = null;
  }

  get formattedLivedWeeks(): string {
    return this.totalWeeksLived.toLocaleString();
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatWeekRange(start: Date): string {
    return start.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
