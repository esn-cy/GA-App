import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesPage } from '@tabs/configurations/categories/categories.page';
import { TopicCategory } from '@models/category.model';

describe('CategoriesPage', () => {
  let page: CategoriesPage;
  let mockCategoriesService: any;
  let mockApp: any;

  beforeEach(() => {
    mockCategoriesService = {
      getList: vi.fn().mockResolvedValue([
        new TopicCategory({ categoryId: 'cat-1', name: 'Workshops' })
      ])
    };
    mockApp = {
      goToInTabs: vi.fn()
    };
    page = new CategoriesPage(mockCategoriesService, mockApp);
  });

  it('should load categories on ionViewDidEnter', async () => {
    await page.ionViewDidEnter();
    expect(mockCategoriesService.getList).toHaveBeenCalledWith({ force: true, withPagination: true });
    expect(page.categories?.length).toBe(1);
  });

  it('should paginate categories list', async () => {
    vi.useFakeTimers();
    await page.ionViewDidEnter();
    const scrollMock = { complete: vi.fn() } as any;

    await page.paginate(scrollMock);
    expect(mockCategoriesService.getList).toHaveBeenCalledWith({
      withPagination: true,
      startPaginationAfterId: 'cat-1'
    });
    vi.advanceTimersByTime(150);
    expect(scrollMock.complete).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should navigate to new and edit category', () => {
    page.addCategory();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['configurations', 'categories', 'new']);

    page.openCategory(new TopicCategory({ categoryId: 'cat-1' }));
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['configurations', 'categories', 'cat-1']);
  });
});
