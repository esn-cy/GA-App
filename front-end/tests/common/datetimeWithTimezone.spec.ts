import { describe, expect, it, vi } from 'vitest';
import { DatetimeWithTimezoneStandaloneComponent } from '@common/datetimeWithTimezone';
import { AppService } from '@app/app.service';

describe('DatetimeWithTimezoneStandaloneComponent', () => {
  let component: DatetimeWithTimezoneStandaloneComponent;
  let mockApp: Partial<AppService>;

  beforeEach(() => {
    mockApp = {
      configurations: {
        timezone: 'UTC'
      } as any
    };
    component = new DatetimeWithTimezoneStandaloneComponent(mockApp as AppService);
  });

  it('should initialize with default timezone from AppService if not provided', async () => {
    await component.ngOnInit();
    expect(component.timezone).toBe('UTC');
    expect(component.initialValue).toBe('');
  });

  it('should format initialValue from date input using timezone', async () => {
    component.date = '2026-10-15T12:00:00.000Z';
    component.timezone = 'Europe/Athens'; // UTC+3 in summer / UTC+2 in winter (October is UTC+3)
    await component.ngOnInit();
    expect(component.initialValue).toBe('2026-10-15T15:00');
  });

  it('should convert UTC to zoned time string correctly', () => {
    component.timezone = 'UTC';
    expect(component.utcToZonedTimeString()).toBe('');
    expect(component.utcToZonedTimeString('2026-05-01T10:30:00.000Z')).toBe('2026-05-01T10:30');
  });

  it('should convert zoned time string to UTC ISOString', () => {
    component.timezone = 'UTC';
    expect(component.zonedTimeStringToUTC('')).toBeUndefined();
    const utc = component.zonedTimeStringToUTC('2026-05-01T10:30');
    expect(utc).toBe('2026-05-01T10:30:00.000Z');
  });

  it('should emit dateChange on ngOnChanges when timezone changes', () => {
    vi.useFakeTimers();
    const emitSpy = vi.spyOn(component.dateChange, 'emit');
    component.dateTime = {
      nativeElement: { value: '2026-05-01T10:30' }
    } as any;
    component.timezone = 'UTC';

    component.ngOnChanges({
      timezone: {
        currentValue: 'UTC',
        previousValue: 'Europe/Athens',
        firstChange: false,
        isFirstChange: () => false
      }
    });

    vi.runAllTimers();
    expect(emitSpy).toHaveBeenCalledWith('2026-05-01T10:30:00.000Z');
    vi.useRealTimers();
  });
});
