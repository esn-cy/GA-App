import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadgesService } from '@tabs/configurations/badges/badges.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Badge, BuiltInBadges, UserBadge } from '@models/badge.model';

describe('BadgesService', () => {
  let service: BadgesService;
  let mockApi: Partial<IDEAApiService>;

  beforeEach(() => {
    mockApi = {
      getResource: vi.fn(),
      postResource: vi.fn(),
      putResource: vi.fn(),
      deleteResource: vi.fn()
    };
    service = new BadgesService(mockApi as IDEAApiService);
  });

  it('should load, search and paginate badges', async () => {
    (mockApi.getResource as any).mockResolvedValue([
      { badgeId: 'badge-1', name: 'Speaker', description: 'Gave a talk' },
      { badgeId: 'badge-2', name: 'Organizer', description: 'Organized the event' }
    ]);

    const res = await service.getList({ search: 'talk' });
    expect(res?.length).toBe(1);
    expect(res?.[0].badgeId).toBe('badge-1');

    // Pagination test
    const manyBadges = Array.from({ length: 30 }, (_, i) => ({
      badgeId: `b-${i}`,
      name: `Badge ${i}`,
      description: `Description ${i}`
    }));
    (mockApi.getResource as any).mockResolvedValue(manyBadges);
    const paginatedWithId = await service.getList({
      force: true,
      withPagination: true,
      startPaginationAfterId: 'b-5'
    });
    expect(paginatedWithId?.length).toBe(5 + service.MAX_PAGE_SIZE);

    const paginatedWithoutId = await service.getList({
      withPagination: true
    });
    expect(paginatedWithoutId?.length).toBe(service.MAX_PAGE_SIZE);
  });

  it('should CRUD badges', async () => {
    const badge = new Badge({ badgeId: 'b-1', name: 'Helper' });
    (mockApi.getResource as any).mockResolvedValue(badge);
    (mockApi.postResource as any).mockResolvedValue(badge);
    (mockApi.putResource as any).mockResolvedValue(badge);

    const b = await service.getById('b-1');
    expect(b.name).toBe('Helper');

    await service.insert(badge);
    expect(mockApi.postResource).toHaveBeenCalledWith(['badges'], { body: badge });

    await service.update(badge);
    expect(mockApi.putResource).toHaveBeenCalledWith(['badges', 'b-1'], { body: badge });

    await service.delete(badge);
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['badges', 'b-1']);
  });

  it('should manage user badges', async () => {
    (mockApi.getResource as any).mockResolvedValue([{ userId: 'u-1', badge: 'b-1' }]);

    const userBadges = await service.getListOfUserById('u-1');
    expect(userBadges.length).toBe(1);
    expect(mockApi.getResource).toHaveBeenCalledWith('usersBadges', { params: { userId: 'u-1' } });

    await service.markUserBadgeAsSeen('b-1');
    expect(mockApi.getResource).toHaveBeenCalledWith(['usersBadges', 'b-1']);

    await service.addBadgeToUser('u-1', 'b-1');
    expect(mockApi.postResource).toHaveBeenCalledWith(['usersBadges', 'b-1'], { params: { userId: 'u-1' } });

    await service.removeBadgeFromUser('u-1', 'b-1');
    expect(mockApi.deleteResource).toHaveBeenCalledWith(['usersBadges', 'b-1'], { params: { userId: 'u-1' } });
  });

  it('should resolve badge image URLs and fallback', async () => {
    (mockApi.getResource as any).mockResolvedValue([
      { badgeId: 'custom-1', name: 'Custom', imageURL: 'https://example.com/badge.png' }
    ]);
    await service.getList();

    const builtInUserBadge = new UserBadge({ userId: 'u-1', badge: BuiltInBadges.NEWCOMER });
    expect(service.getImageURLOfUserBadge(builtInUserBadge)).toBe('assets/imgs/badges/NEWCOMER.svg');

    const customUserBadge = new UserBadge({ userId: 'u-1', badge: 'custom-1' });
    expect(service.getImageURLOfUserBadge(customUserBadge)).toBe('https://example.com/badge.png');

    const missingUserBadge = new UserBadge({ userId: 'u-1', badge: 'missing' });
    expect(service.getImageURLOfUserBadge(missingUserBadge)).toBe('assets/imgs/badges/NOT_FOUND.svg');

    const targetImg = { src: 'broken.png' };
    service.fallbackBadgeImage(targetImg);
    expect(targetImg.src).toBe('assets/imgs/badges/NOT_FOUND.svg');
  });
});
