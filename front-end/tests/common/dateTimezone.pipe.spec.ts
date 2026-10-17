import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DateTimezonePipe, formatDateWithLocaleAndTimeZone } from '@common/dateTimezone.pipe';
import { IDEATranslationsService } from '@idea-ionic/common';
import { AppService } from '@app/app.service';

describe('DateTimezonePipe & formatDateWithLocaleAndTimeZone', () => {
  const testIso = '2026-10-17T12:30:00.000Z';

  describe('formatDateWithLocaleAndTimeZone', () => {
    it('should return null if value is falsy', () => {
      expect(formatDateWithLocaleAndTimeZone(null, 'en-US', 'UTC')).toBeNull();
      expect(formatDateWithLocaleAndTimeZone(undefined, 'en-US', 'UTC')).toBeNull();
      expect(formatDateWithLocaleAndTimeZone('', 'en-US', 'UTC')).toBeNull();
    });

    it('should format date pattern', () => {
      const result = formatDateWithLocaleAndTimeZone(testIso, 'en-US', 'UTC', 'date');
      expect(result).toBeDefined();
      expect(result).toContain('Oct');
      expect(result).toContain('17');
      expect(result).toContain('2026');
    });

    it('should format datetime pattern', () => {
      const result = formatDateWithLocaleAndTimeZone(testIso, 'en-US', 'UTC', 'datetime');
      expect(result).toBeDefined();
      expect(result).toContain('Oct');
      expect(result).toContain('17');
      expect(result).toContain('2026');
      expect(result).toContain('12:30');
    });

    it('should format time pattern', () => {
      const result = formatDateWithLocaleAndTimeZone(testIso, 'en-US', 'UTC', 'time');
      expect(result).toBeDefined();
      expect(result).toContain('12:30');
    });

    it('should adjust for different timezones', () => {
      // UTC+3 (e.g., Europe/Nicosia or Asia/Nicosia) should be 15:30
      const resultUtcPlus3 = formatDateWithLocaleAndTimeZone(testIso, 'en-GB', 'Asia/Nicosia', 'time');
      expect(resultUtcPlus3).toContain('15:30');
    });
  });

  describe('DateTimezonePipe', () => {
    let pipe: DateTimezonePipe;
    let mockTranslations: Partial<IDEATranslationsService>;
    let mockApp: Partial<AppService>;

    beforeEach(() => {
      mockTranslations = {
        getCurrentLang: vi.fn().mockReturnValue('en-US')
      };
      mockApp = {
        configurations: {
          timezone: 'UTC'
        } as any
      };
      pipe = new DateTimezonePipe(mockTranslations as IDEATranslationsService, mockApp as AppService);
    });

    it('should use default timezone from AppService when timezone is not provided', () => {
      const result = pipe.transform(testIso, 'time');
      expect(result).toContain('12:30');
      expect(mockTranslations.getCurrentLang).toHaveBeenCalled();
    });

    it('should use explicit timezone when provided', () => {
      const result = pipe.transform(testIso, 'time', 'Asia/Nicosia');
      expect(result).toContain('15:30');
    });

    it('should return null for falsy values', () => {
      expect(pipe.transform(null)).toBeNull();
    });
  });
});
