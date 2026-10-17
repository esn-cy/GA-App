import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatisticsService } from '@common/statistics.service';
import { IDEAApiService } from '@idea-ionic/common';
import { StatisticEntityTypes, StatisticGranularities } from '@models/statistic.model';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let mockApi: Partial<IDEAApiService>;

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn().mockResolvedValue({ values: [1, 2, 3] })
    };
    service = new StatisticsService(mockApi as IDEAApiService);
  });

  it('should get statistics in a time window of an entity', async () => {
    const res = await service.getInTimeWindowOfEntity({
      since: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.000Z',
      granularity: StatisticGranularities.DAILY,
      entityType: StatisticEntityTypes.TOPICS,
      entityId: 'topic-123'
    });

    expect(res).toEqual({ values: [1, 2, 3] });
    expect(mockApi.getResource).toHaveBeenCalledWith('statistics', {
      params: {
        since: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.000Z',
        granularity: StatisticGranularities.DAILY,
        entityType: StatisticEntityTypes.TOPICS,
        entityId: 'topic-123'
      }
    });
  });

  it('should get recap of last N days', async () => {
    const res = await service.recapOfLastNumDays(7);
    expect(res).toEqual({ values: [1, 2, 3] });
    expect(mockApi.getResource).toHaveBeenCalledWith('statistics', expect.objectContaining({
      params: expect.objectContaining({
        entityType: StatisticEntityTypes.COMMUNICATIONS
      })
    }));
  });
});
