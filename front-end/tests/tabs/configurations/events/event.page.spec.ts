import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventPage, UXMode } from '@tabs/configurations/events/event.page';
import { GAEvent } from '@models/event.model';

describe('EventPage', () => {
  let page: EventPage;
  let mockLocation: any;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockEventsService: any;
  let mockApp: any;

  beforeEach(() => {
    mockLocation = {
      back: vi.fn(),
      path: vi.fn().mockReturnValue('/configurations/events/new'),
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
    mockEventsService = {
      getById: vi.fn().mockResolvedValue(new GAEvent({ eventId: 'ev-1', name: 'Spring GA' })),
      insert: vi.fn().mockResolvedValue(new GAEvent({ eventId: 'ev-new', name: 'New Event' })),
      update: vi.fn().mockResolvedValue(new GAEvent({ eventId: 'ev-1', name: 'Updated Event' })),
      archive: vi.fn().mockResolvedValue(undefined),
      unarchive: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {
      closePage: vi.fn()
    };

    page = new EventPage(
      mockLocation,
      mockAlertCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockEventsService,
      mockApp
    );
  });

  it('should load event in view mode when eventId is provided', async () => {
    page.eventId = 'ev-1';
    await page.ionViewWillEnter();

    expect(mockEventsService.getById).toHaveBeenCalledWith('ev-1');
    expect(page.event.name).toBe('Spring GA');
    expect(page.editMode).toBe(UXMode.VIEW);

    mockEventsService.getById.mockRejectedValueOnce(new Error('not found'));
    await page.ionViewWillEnter();
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should initialize empty event in insert mode when eventId is new', async () => {
    page.eventId = 'new';
    await page.ionViewWillEnter();

    expect(page.event).toBeDefined();
    expect(page.editMode).toBe(UXMode.INSERT);
  });

  it('should validate and insert event', async () => {
    page.eventId = 'new';
    await page.ionViewWillEnter();

    // Validation error
    await page.save();
    expect(mockMessage.error).toHaveBeenCalled();

    // Valid save
    page.event.name = 'Valid Event';
    await page.save();
    expect(mockEventsService.insert).toHaveBeenCalled();
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');

    // Save error
    mockEventsService.insert.mockRejectedValueOnce(new Error('fail'));
    page.editMode = UXMode.INSERT;
    await page.save();
    expect(mockMessage.error).toHaveBeenCalled();
  });

  it('should validate and update event in edit mode', async () => {
    page.eventId = 'ev-1';
    await page.ionViewWillEnter();
    page.editMode = UXMode.EDIT;
    page.event.name = 'Updated Event';

    await page.save();
    expect(mockEventsService.update).toHaveBeenCalled();
    expect(page.editMode).toBe(UXMode.VIEW);
  });

  it('should archive and unarchive event with alert', async () => {
    page.eventId = 'ev-1';
    await page.ionViewWillEnter();

    let doArchive: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });

    await page.archiveEvent(true);
    await doArchive();
    expect(mockEventsService.archive).toHaveBeenCalledWith(page.event);
    expect(mockApp.closePage).toHaveBeenCalled();

    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });
    await page.archiveEvent(false);
    await doArchive();
    expect(mockEventsService.unarchive).toHaveBeenCalledWith(page.event);

    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });
    mockEventsService.archive.mockRejectedValueOnce(new Error('fail'));
    await page.archiveEvent(true);
    await doArchive();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should delete event with alert', async () => {
    page.eventId = 'ev-1';
    await page.ionViewWillEnter();

    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });

    await page.deleteEvent();
    await doDelete();
    expect(mockEventsService.delete).toHaveBeenCalledWith(page.event);
    expect(mockApp.closePage).toHaveBeenCalled();

    // Error: Event is used
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });
    mockEventsService.delete.mockRejectedValueOnce(new Error('Event is used'));
    await page.deleteEvent();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('EVENTS.CANT_DELETE_IF_USED_ERROR');

    // Generic error
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => b.role === 'destructive')?.handler;
      return { present: vi.fn() };
    });
    mockEventsService.delete.mockRejectedValueOnce(new Error('Other error'));
    await page.deleteEvent();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should handle edit mode transitions and error checks', async () => {
    page.eventId = 'ev-1';
    await page.ionViewWillEnter();

    page.enterEditMode();
    expect(page.editMode).toBe(UXMode.EDIT);

    page.event.name = 'Changed';
    page.exitEditMode();
    expect(page.editMode).toBe(UXMode.VIEW);
    expect(page.event.name).toBe('Spring GA');

    page.editMode = UXMode.INSERT;
    page.exitEditMode();
    expect(mockApp.closePage).toHaveBeenCalled();

    page.errors.add('name');
    expect(page.hasFieldAnError('name')).toBe(true);
    expect(page.hasFieldAnError('date')).toBe(false);
  });
});
