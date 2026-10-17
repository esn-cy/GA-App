import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryPage, UXMode } from '@tabs/configurations/categories/category.page';
import { TopicCategory } from '@models/category.model';

describe('CategoryPage', () => {
  let page: CategoryPage;
  let mockLocation: any;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockCategoriesService: any;
  let mockApp: any;

  beforeEach(() => {
    mockLocation = {
      back: vi.fn(),
      path: vi.fn().mockReturnValue('/configurations/categories/new'),
      replaceState: vi.fn()
    };
    mockAlertCtrl = {
      create: vi.fn().mockImplementation(async (opts) => ({
        present: vi.fn().mockResolvedValue(undefined),
        opts
      }))
    };
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined),
      success: vi.fn().mockResolvedValue(undefined)
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Translated')
    };
    mockCategoriesService = {
      getById: vi.fn().mockResolvedValue(new TopicCategory({
        categoryId: 'cat-1',
        name: 'Workshops',
        color: 'ESNcyan'
      })),
      insert: vi.fn().mockResolvedValue(new TopicCategory({ categoryId: 'cat-new', name: 'New Cat' })),
      update: vi.fn().mockResolvedValue(new TopicCategory({ categoryId: 'cat-1', name: 'Updated' })),
      archive: vi.fn().mockResolvedValue(undefined),
      unarchive: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {
      closePage: vi.fn()
    };

    page = new CategoryPage(
      mockLocation,
      mockAlertCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockCategoriesService,
      mockApp
    );
  });

  it('should load category in view mode when categoryId is provided', async () => {
    page.categoryId = 'cat-1';
    await page.ionViewWillEnter();

    expect(mockCategoriesService.getById).toHaveBeenCalledWith('cat-1');
    expect(page.category.name).toBe('Workshops');
    expect(page.editMode).toBe(UXMode.VIEW);

    mockCategoriesService.getById.mockRejectedValueOnce(new Error('not found'));
    await page.ionViewWillEnter();
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should initialize empty category in insert mode when categoryId is new', async () => {
    page.categoryId = 'new';
    await page.ionViewWillEnter();

    expect(page.category).toBeDefined();
    expect(page.editMode).toBe(UXMode.INSERT);
  });

  it('should validate and insert category', async () => {
    page.categoryId = 'new';
    await page.ionViewWillEnter();

    // Validation error
    await page.save();
    expect(mockMessage.error).toHaveBeenCalled();

    // Valid save
    page.category.name = 'Valid Category';
    page.category.color = 'ESNcyan';

    await page.save();
    expect(mockCategoriesService.insert).toHaveBeenCalled();
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');

    // Save error
    mockCategoriesService.insert.mockRejectedValueOnce(new Error('fail'));
    page.editMode = UXMode.INSERT;
    page.category.name = 'Valid Category';
    page.category.color = 'ESNcyan';
    await page.save();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should validate and update category in edit mode', async () => {
    page.categoryId = 'cat-1';
    await page.ionViewWillEnter();
    page.editMode = UXMode.EDIT;
    page.category.name = 'Updated Category';
    page.category.color = 'ESNcyan';

    await page.save();
    expect(mockCategoriesService.update).toHaveBeenCalled();
    expect(page.editMode).toBe(UXMode.VIEW);
  });

  it('should archive and unarchive category with alert', async () => {
    page.categoryId = 'cat-1';
    await page.ionViewWillEnter();

    let doArchive: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });

    await page.archiveCategory(true);
    await doArchive();
    expect(mockCategoriesService.archive).toHaveBeenCalledWith(page.category);
    expect(mockApp.closePage).toHaveBeenCalled();

    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });
    await page.archiveCategory(false);
    await doArchive();
    expect(mockCategoriesService.unarchive).toHaveBeenCalledWith(page.category);

    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });
    mockCategoriesService.archive.mockRejectedValueOnce(new Error('fail'));
    await page.archiveCategory(true);
    await doArchive();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should delete category with alert', async () => {
    page.categoryId = 'cat-1';
    await page.ionViewWillEnter();

    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });

    await page.deleteCategory();
    await doDelete();
    expect(mockCategoriesService.delete).toHaveBeenCalledWith(page.category);
    expect(mockApp.closePage).toHaveBeenCalled();

    // Error: Category is used
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });
    mockCategoriesService.delete.mockRejectedValueOnce(new Error('Category is used'));
    await page.deleteCategory();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('CATEGORIES.CANT_DELETE_IF_USED_ERROR');

    // Generic error
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });
    mockCategoriesService.delete.mockRejectedValueOnce(new Error('Other error'));
    await page.deleteCategory();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should handle edit mode transitions and error checks', async () => {
    page.categoryId = 'cat-1';
    await page.ionViewWillEnter();

    page.enterEditMode();
    expect(page.editMode).toBe(UXMode.EDIT);

    page.category.name = 'Changed';
    page.exitEditMode();
    expect(page.editMode).toBe(UXMode.VIEW);
    expect(page.category.name).toBe('Workshops');

    page.editMode = UXMode.INSERT;
    page.exitEditMode();
    expect(mockApp.closePage).toHaveBeenCalled();

    page.errors.add('name');
    expect(page.hasFieldAnError('name')).toBe(true);
    expect(page.hasFieldAnError('color')).toBe(false);
  });
});
