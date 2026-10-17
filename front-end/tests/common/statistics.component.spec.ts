import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StatisticPeriods, StatisticsButtonComponent, StatisticsComponent } from '@common/statistics.component';
import { ModalController } from '@ionic/angular';
import { IDEALoadingService, IDEAMessageService, IDEATranslationsService } from '@idea-ionic/common';
import { StatisticsService } from '@common/statistics.service';
import { AppService } from '@app/app.service';
import { Statistic, StatisticEntityTypes, StatisticGranularities } from '@models/statistic.model';

describe('Statistics Components', () => {
  describe('StatisticsButtonComponent', () => {
    let buttonComponent: StatisticsButtonComponent;
    let mockModalCtrl: Partial<ModalController>;

    beforeEach(() => {
      mockModalCtrl = {
        create: vi.fn().mockResolvedValue({ present: vi.fn() } as any)
      };
      buttonComponent = new StatisticsButtonComponent(mockModalCtrl as ModalController);
      buttonComponent.entityType = StatisticEntityTypes.TOPICS;
      buttonComponent.entityId = 'topic-123';
    });

    it('should open statistics modal on click and handle without event', async () => {
      const mockEvent = { stopPropagation: vi.fn() } as any;
      await buttonComponent.openStatistics(mockEvent);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(mockModalCtrl.create).toHaveBeenCalledWith(
        expect.objectContaining({
          component: StatisticsComponent,
          cssClass: 'modalFullScreen',
          componentProps: expect.objectContaining({
            entityType: StatisticEntityTypes.TOPICS,
            entityId: 'topic-123'
          })
        })
      );

      await buttonComponent.openStatistics();
      expect(mockModalCtrl.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('StatisticsComponent', () => {
    let component: StatisticsComponent;
    let mockModalCtrl: Partial<ModalController>;
    let mockLoading: Partial<IDEALoadingService>;
    let mockMessage: Partial<IDEAMessageService>;
    let mockTranslations: Partial<IDEATranslationsService>;
    let mockStatisticsService: Partial<StatisticsService>;
    let mockApp: Partial<AppService>;
    let canvas: HTMLCanvasElement;

    const mockStatistic: Statistic = {
      entityType: StatisticEntityTypes.TOPICS,
      timePoints: ['2026-09-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'],
      totals: { countries: 1, sections: 1, users: 15 },
      byCountry: { Cyprus: [5, 10] },
      bySection: { 'ESN Nicosia': [5, 10] }
    };

    beforeEach(() => {
      canvas = document.createElement('canvas');
      canvas.id = 'theChart';
      document.body.appendChild(canvas);

      mockModalCtrl = { dismiss: vi.fn() };
      mockLoading = { show: vi.fn(), hide: vi.fn() };
      mockMessage = { error: vi.fn() };
      mockTranslations = {
        _: vi.fn().mockImplementation((k) => k),
        formatDate: vi.fn().mockImplementation(() => 'Oct 2026')
      };
      mockStatisticsService = {
        getInTimeWindowOfEntity: vi.fn().mockResolvedValue(mockStatistic)
      };
      mockApp = {
        configurations: { timezone: 'UTC' } as any
      };

      component = new StatisticsComponent(
        mockModalCtrl as ModalController,
        mockLoading as IDEALoadingService,
        mockMessage as IDEAMessageService,
        mockTranslations as IDEATranslationsService,
        mockStatisticsService as StatisticsService,
        mockApp as AppService
      );

      component.entityType = StatisticEntityTypes.TOPICS;
      component.period = StatisticPeriods.ONE_YEAR;
      component.granularity = StatisticGranularities.MONTHLY;
      component.chartType = 'bar';
    });

    afterEach(() => {
      canvas.remove();
    });

    it('should load statistic and build labels using calendar year format', async () => {
      await component.ngOnInit();

      expect(mockLoading.show).toHaveBeenCalled();
      expect(mockStatisticsService.getInTimeWindowOfEntity).toHaveBeenCalled();
      expect(mockLoading.hide).toHaveBeenCalled();
      expect(component.statistic).toEqual(mockStatistic);
      expect(mockTranslations.formatDate).toHaveBeenCalledWith(
        '2026-09-01T00:00:00.000Z',
        'MMM yyyy'
      );
    });

    it('should handle hourly and daily granularities', async () => {
      component.granularity = StatisticGranularities.HOURLY;
      await component.loadStatisticAndBuildChart();
      expect(mockTranslations.formatDate).toHaveBeenCalledWith(
        '2026-09-01T00:00:00.000Z',
        `HH':00', d MMM yy`
      );

      component.granularity = StatisticGranularities.DAILY;
      await component.loadStatisticAndBuildChart();
      expect(mockTranslations.formatDate).toHaveBeenCalledWith(
        '2026-09-01T00:00:00.000Z',
        'd MMM yy'
      );
    });

    it('should handle groupBy country, section, and all', async () => {
      component.groupBy = 'country';
      await component.loadStatisticAndBuildChart();

      component.groupBy = 'section';
      await component.loadStatisticAndBuildChart();

      component.groupBy = null;
      await component.loadStatisticAndBuildChart();
    });

    it('should getFirstDateOfStatistic and close modal', () => {
      expect(component.getFirstDateOfStatistic()).toBeUndefined();

      component.statistic = mockStatistic;
      const firstDate = component.getFirstDateOfStatistic();
      expect(firstDate).toBeInstanceOf(Date);
      expect(firstDate?.toISOString()).toContain('2026-09-01');

      component.close();
      expect(mockModalCtrl.dismiss).toHaveBeenCalled();
    });

    it('should handle error when loading fails', async () => {
      mockStatisticsService.getInTimeWindowOfEntity = vi.fn().mockRejectedValue(new Error('Network error'));
      await component.loadStatisticAndBuildChart();

      expect(mockMessage.error).toHaveBeenCalledWith('COMMON.SOMETHING_WENT_WRONG');
      expect(mockLoading.hide).toHaveBeenCalled();
    });
  });
});
