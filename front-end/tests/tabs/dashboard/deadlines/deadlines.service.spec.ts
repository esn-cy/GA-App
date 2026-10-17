import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeadlinesService } from '@tabs/dashboard/deadlines/deadlines.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Deadline } from '@models/deadline.model';

describe('DeadlinesService', () => {
  let service: DeadlinesService;
  let mockApi: Partial<IDEAApiService>;

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn(),
      postResource: vi.fn(),
      putResource: vi.fn(),
      deleteResource: vi.fn()
    };
    service = new DeadlinesService(mockApi as IDEAApiService);
  });

  it('should load and filter deadlines by search and year', async () => {
    (mockApi.getResource as any).mockResolvedValue([
      { deadlineId: 'd-1', name: 'Proposal Deadline', at: '2026-10-20T12:00:00.000Z' },
      { deadlineId: 'd-2', name: 'Registration Deadline', at: '2026-10-15T12:00:00.000Z' }
    ]);

    const res = await service.getList({ search: 'proposal', year: 2026 });
    expect(res?.length).toBe(1);
    expect(res?.[0].deadlineId).toBe('d-1');
    expect(mockApi.getResource).toHaveBeenCalledWith('deadlines', { params: { year: 2026 } });
  });

  it('should paginate deadlines', async () => {
    const raw = Array.from({ length: 30 }, (_, i) => ({
      deadlineId: `d-${i}`,
      name: `Deadline ${i}`,
      at: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`
    }));
    (mockApi.getResource as any).mockResolvedValue(raw);

    const res = await service.getList({ withPagination: true });
    expect(res?.length).toBe(24);

    const res2 = await service.getList({ withPagination: true, startPaginationAfterId: 'd-5' });
    expect(res2?.length).toBe(29);
  });

  it('should CRUD deadlines', async () => {
    const deadline = new Deadline({ deadlineId: 'd-1', name: 'D1', at: '2026-10-20T00:00:00.000Z' });
    (mockApi.getResource as any).mockResolvedValue(deadline);
    (mockApi.postResource as any).mockResolvedValue(deadline);
    (mockApi.putResource as any).mockResolvedValue(deadline);

    const fetched = await service.getById('d-1');
    expect(fetched.name).toBe('D1');

    await service.insert(deadline);
    expect(mockApi.postResource).toHaveBeenCalledWith('deadlines', { body: deadline });

    await service.update(deadline);
    expect(mockApi.putResource).toHaveBeenCalledWith(['deadlines', 'd-1'], { body: deadline });

    await service.delete(deadline);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['deadlines', 'd-1']);
  });
});
