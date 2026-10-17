import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationsService } from '@tabs/opportunities/applications/applications.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Opportunity } from '@models/opportunity.model';
import { Application } from '@models/application.model';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let mockApi: Partial<IDEAApiService>;
  const mockOpportunity = new Opportunity({ opportunityId: 'opp-1', name: 'Open Call' });

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn(),
      postResource: vi.fn(),
      putResource: vi.fn(),
      patchResource: vi.fn(),
      deleteResource: vi.fn()
    };
    service = new ApplicationsService(mockApi as IDEAApiService);
  });

  it('should load and filter applications of an opportunity', async () => {
    (mockApi.getResource as any).mockResolvedValue([
      { applicationId: 'app-1', motivation: 'Strong motivation', subject: { name: 'Alice', country: 'IT' } },
      { applicationId: 'app-2', motivation: 'Another candidate', subject: { name: 'Bob', country: 'DE' } }
    ]);

    const all = await service.getListOfOpportunity(mockOpportunity, { force: true });
    expect(all?.length).toBe(2);

    const filtered = await service.getListOfOpportunity(mockOpportunity, { search: 'Alice' });
    expect(filtered?.length).toBe(1);
    expect(filtered?.[0].subject.name).toBe('Alice');
  });

  it('should paginate applications when exceeding MAX_PAGE_SIZE', async () => {
    const rawApps = Array.from({ length: 30 }, (_, i) => ({
      applicationId: `app-${i}`,
      motivation: `Motiv ${i}`,
      subject: { name: `User ${i}` }
    }));
    (mockApi.getResource as any).mockResolvedValue(rawApps);

    const page1 = await service.getListOfOpportunity(mockOpportunity, { force: true, withPagination: true });
    expect(page1?.length).toBe(24);

    const page2 = await service.getListOfOpportunity(mockOpportunity, {
      withPagination: true,
      startPaginationAfterId: 'app-5'
    });
    expect(page2?.length).toBe(29);
  });

  it('should insert, update, delete, download, and review application', async () => {
    const app = new Application({ applicationId: 'app-1', opportunityId: 'opp-1', motivation: 'Motiv' });
    (mockApi.postResource as any).mockResolvedValue(app);
    (mockApi.putResource as any).mockResolvedValue(app);

    const inserted = await service.insert(mockOpportunity, app);
    expect(inserted.applicationId).toBe('app-1');

    const updated = await service.update(mockOpportunity, app);
    expect(updated.applicationId).toBe('app-1');

    await service.delete(mockOpportunity, app);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['opportunities', 'opp-1', 'applications', 'app-1']);

    (mockApi.patchResource as any).mockResolvedValue({ url: 'https://download.url' });
    const downloadUrl = await service.downloadAttachment(app, 'CV.pdf');
    expect(downloadUrl).toBe('https://download.url');

    (mockApi.patchResource as any).mockResolvedValue({
      applicationId: 'app-1',
      approvedAt: '2026-10-17T00:00:00.000Z'
    });
    const reviewed = await service.review(app, true, 'Well done');
    expect(reviewed.approvedAt).toBeDefined();

    // Upload attachment
    const globalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true } as any);
    (mockApi.patchResource as any).mockResolvedValue({ url: 'https://upload.url', id: 'att-123' });
    const file = new File(['data'], 'test.pdf', { type: 'application/pdf' });
    const attId = await service.uploadAttachment(mockOpportunity, file);
    expect(attId).toBe('att-123');
    expect(globalThis.fetch).toHaveBeenCalledWith('https://upload.url', expect.objectContaining({ method: 'PUT' }));
    globalThis.fetch = globalFetch;
  });
});
