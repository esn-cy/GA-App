import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsefulLinksService } from '@tabs/dashboard/usefulLinks/usefulLinks.service';
import { IDEAApiService } from '@idea-ionic/common';
import { UsefulLink } from '@models/usefulLink.model';

describe('UsefulLinksService', () => {
  let service: UsefulLinksService;
  let mockApi: Partial<IDEAApiService>;

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn(),
      postResource: vi.fn(),
      putResource: vi.fn(),
      patchResource: vi.fn(),
      deleteResource: vi.fn()
    };
    service = new UsefulLinksService(mockApi as IDEAApiService);
  });

  it('should load, search and sort useful links', async () => {
    (mockApi.getResource as any).mockResolvedValue([
      { linkId: 'l-1', name: 'Slack', url: 'https://slack.com', sort: 2 },
      { linkId: 'l-2', name: 'Drive', url: 'https://drive.google.com', sort: 1 }
    ]);

    const res = await service.getList({ search: 'slack' });
    expect(res?.length).toBe(1);
    expect(res?.[0].name).toBe('Slack');

    const allSorted = await service.getList();
    expect(allSorted?.[0].linkId).toBe('l-2');
    expect(allSorted?.[1].linkId).toBe('l-1');
  });

  it('should paginate useful links', async () => {
    const raw = Array.from({ length: 30 }, (_, i) => ({
      linkId: `l-${i}`,
      name: `Link ${i}`,
      url: `https://example.com/${i}`,
      sort: i
    }));
    (mockApi.getResource as any).mockResolvedValue(raw);

    const res = await service.getList({ withPagination: true });
    expect(res?.length).toBe(24);

    const res2 = await service.getList({ withPagination: true, startPaginationAfterId: 'l-5' });
    expect(res2?.length).toBe(29);
  });

  it('should CRUD useful links and swap sort', async () => {
    const link1 = new UsefulLink({ linkId: 'l-1', name: 'Link 1', sort: 1 });
    const link2 = new UsefulLink({ linkId: 'l-2', name: 'Link 2', sort: 2 });
    (mockApi.getResource as any).mockResolvedValue(link1);
    (mockApi.postResource as any).mockResolvedValue(link1);
    (mockApi.putResource as any).mockResolvedValue(link1);

    const fetched = await service.getById('l-1');
    expect(fetched.name).toBe('Link 1');

    await service.insert(link1);
    expect(mockApi.postResource).toHaveBeenCalledWith('usefulLinks', { body: link1 });

    await service.update(link1);
    expect(mockApi.putResource).toHaveBeenCalledWith(['usefulLinks', 'l-1'], { body: link1 });

    await service.swapSort(link1, link2);
    expect(mockApi.patchResource).toHaveBeenCalledWith(['usefulLinks', 'l-1'], {
      body: { action: 'SWAP_SORT', otherLinkId: 'l-2' }
    });
    expect(link1.sort).toBe(2);
    expect(link2.sort).toBe(1);

    await service.delete(link1);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['usefulLinks', 'l-1']);
  });
});
