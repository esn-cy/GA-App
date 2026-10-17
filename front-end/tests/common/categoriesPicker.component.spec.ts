import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesPickerComponent } from '@common/categoriesPicker.component';
import { TopicCategoryService } from '@tabs/configurations/categories/categories.service';
import { TopicCategoryAttached } from '@models/category.model';

describe('CategoriesPickerComponent', () => {
  let component: CategoriesPickerComponent;
  let mockCategoryService: Partial<TopicCategoryService>;

  const mockCategories: TopicCategoryAttached[] = [
    { categoryId: 'cat-1', name: 'Board Member', color: 'primary' } as TopicCategoryAttached,
    { categoryId: 'cat-2', name: 'Statutory Document', color: 'secondary' } as TopicCategoryAttached
  ];

  beforeEach(() => {
    mockCategoryService = {
      getList: vi.fn().mockResolvedValue(mockCategories)
    };
    component = new CategoriesPickerComponent(mockCategoryService as TopicCategoryService);
  });

  it('should create and load categories on ngOnInit', async () => {
    expect(component).toBeDefined();
    await component.ngOnInit();
    expect(mockCategoryService.getList).toHaveBeenCalled();
    expect(component.categories).toEqual(mockCategories);
  });

  it('should compare categories by categoryId', () => {
    const c1 = { categoryId: 'cat-1', name: 'Cat 1' } as TopicCategoryAttached;
    const c2 = { categoryId: 'cat-1', name: 'Cat 1 Duplicate' } as TopicCategoryAttached;
    const c3 = { categoryId: 'cat-2', name: 'Cat 2' } as TopicCategoryAttached;

    expect(component.compareWithCategory(c1, c2)).toBe(true);
    expect(component.compareWithCategory(c1, c3)).toBe(false);
    expect(component.compareWithCategory(null as any, null as any)).toBe(true);
    expect(component.compareWithCategory(c1, null as any)).toBe(false);
  });
});
