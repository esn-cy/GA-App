import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationsService } from '@tabs/dashboard/communications/communications.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Communication } from '@models/communication.model';

describe('CommunicationsService', () => {
  let service: CommunicationsService;
  let mockApi: Partial<IDEAApiService>;

  const mockCommunications: Partial<Communication>[] = [
    {
      communicationId: 'comm-1',
      name: 'Welcome to the GA',
      content: 'General info about plenary schedules',
      date: '2026-10-01T08:00:00.000Z'
    },
    {
      communicationId: 'comm-2',
      name: 'Voting opening soon',
      content: 'Please prepare your voter keys',
      date: '2026-10-02T08:00:00.000Z'
    }
  ];

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn().mockResolvedValue(mockCommunications)
    };
    service = new CommunicationsService(mockApi as IDEAApiService);
  });

  it('should load communications from API', async () => {
    const list = await service.getList();
    expect(mockApi.getResource).toHaveBeenCalledWith('communications', { params: {} });
    expect(list).toHaveLength(2);
  });

  it('should pass year parameter when filtering by year', async () => {
    await service.getList({ year: 2026 });
    expect(mockApi.getResource).toHaveBeenCalledWith('communications', { params: { year: 2026 } });
  });

  it('should filter communications by search text', async () => {
    const result = await service.getList({ search: 'Voting' });
    expect(result).toHaveLength(1);
    expect(result![0].communicationId).toBe('comm-2');
  });

  it('should handle pagination in getList', async () => {
    service.MAX_PAGE_SIZE = 1;
    const paged = await service.getList({ withPagination: true });
    expect(paged).toHaveLength(1);

    const pagedAfter = await service.getList({ withPagination: true, startPaginationAfterId: 'comm-2' });
    expect(pagedAfter).toBeDefined();
  });

  it('should perform CRUD and archive operations', async () => {
    const comm = new Communication({ communicationId: 'comm-1', name: 'Comm 1' });
    (mockApi.getResource as any).mockResolvedValueOnce({ communicationId: 'comm-1', name: 'Comm 1' });
    (mockApi.postResource as any) = vi.fn().mockResolvedValue({ communicationId: 'comm-1', name: 'Comm 1' });
    (mockApi.putResource as any) = vi.fn().mockResolvedValue({ communicationId: 'comm-1', name: 'Updated' });
    (mockApi.patchResource as any) = vi.fn().mockResolvedValue(undefined);
    (mockApi.deleteResource as any) = vi.fn().mockResolvedValue(undefined);

    const fetched = await service.getById('comm-1');
    expect(fetched.communicationId).toBe('comm-1');

    const inserted = await service.insert(comm);
    expect(inserted.communicationId).toBe('comm-1');

    const updated = await service.update(comm);
    expect(updated.name).toBe('Updated');

    await service.archive(comm);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['communications', 'comm-1'], { body: { action: 'ARCHIVE' } });

    await service.unarchive(comm);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['communications', 'comm-1'], { body: { action: 'UNARCHIVE' } });

    await service.delete(comm);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['communications', 'comm-1']);
  });
});
