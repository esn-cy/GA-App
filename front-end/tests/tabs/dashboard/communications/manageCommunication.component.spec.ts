import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManageCommunicationComponent } from '@tabs/dashboard/communications/manageCommunication.component';
import { Communication } from '@models/communication.model';

describe('ManageCommunicationComponent', () => {
  let component: ManageCommunicationComponent;
  let mockModalCtrl: any;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockMedia: any;
  let mockCommunications: any;
  let mockApp: any;

  beforeEach(() => {
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true)
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
    mockMedia = {
      uploadImage: vi.fn().mockResolvedValue('uri-123')
    };
    mockCommunications = {
      insert: vi.fn().mockResolvedValue(new Communication({ communicationId: 'c-new', name: 'New' })),
      update: vi.fn().mockResolvedValue(new Communication({ communicationId: 'c-1', name: 'Updated' })),
      archive: vi.fn().mockResolvedValue(undefined),
      unarchive: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {
      isInMobileMode: vi.fn().mockReturnValue(false),
      getImageURLByURI: vi.fn().mockReturnValue('https://example.com/img.png')
    };

    component = new ManageCommunicationComponent(
      mockModalCtrl,
      mockAlertCtrl,
      mockTranslations,
      mockLoading,
      mockMessage,
      mockCommunications,
      mockMedia,
      mockApp
    );
  });

  it('should validate and insert communication', async () => {
    // Validation failure
    component.communication = new Communication();
    await component.save();
    expect(mockMessage.error).toHaveBeenCalled();

    // Valid insertion
    component.communication = new Communication({
      name: 'General News',
      content: '<p>Content</p>'
    });

    await component.save();
    expect(mockCommunications.insert).toHaveBeenCalled();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();

    // Error on save
    component.communication = new Communication({ name: 'Valid', content: 'Text' });
    mockCommunications.insert.mockRejectedValueOnce(new Error('fail'));
    await component.save();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should validate and update existing communication', async () => {
    component.communication = new Communication({
      communicationId: 'c-1',
      name: 'General News',
      content: '<p>Content</p>'
    });

    await component.save();
    expect(mockCommunications.update).toHaveBeenCalled();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });

  it('should upload image and set imageURL, and browseImages', async () => {
    component.communication = new Communication();
    const file = new File(['content'], 'comm.png', { type: 'image/png' });
    const target = { files: [file], value: 'comm.png' } as any;

    await component.uploadImage({ target });
    expect(mockMedia.uploadImage).toHaveBeenCalledWith(file);
    expect(component.communication.imageURL).toBe('https://example.com/img.png');

    // Error on uploadImage
    mockMedia.uploadImage.mockRejectedValueOnce(new Error('fail'));
    await component.uploadImage({ target });
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    // No file on uploadImage
    await component.uploadImage({ target: { files: null } as any });

    const input = document.createElement('input');
    input.id = 'upload-id';
    document.body.appendChild(input);
    component.browseImagesForElementId('upload-id');
    document.body.removeChild(input);
  });

  it('should duplicate communication with confirmation and handle error', async () => {
    component.communication = new Communication({
      communicationId: 'c-1',
      name: 'News',
      content: 'Text'
    });

    let doDuplicate: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDuplicate = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });

    await component.duplicateCommunication();
    expect(doDuplicate).toBeDefined();
    await doDuplicate();
    expect(mockCommunications.insert).toHaveBeenCalled();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();

    // Duplicate error
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDuplicate = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    mockCommunications.insert.mockRejectedValueOnce(new Error('fail'));
    await component.duplicateCommunication();
    await doDuplicate();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should archive and unarchive communication with confirmation and handle error', async () => {
    component.communication = new Communication({ communicationId: 'c-1' });

    let doArchive: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });

    await component.askAndArchive(true);
    await doArchive();
    expect(mockCommunications.archive).toHaveBeenCalledWith(component.communication);

    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.askAndArchive(false);
    await doArchive();
    expect(mockCommunications.unarchive).toHaveBeenCalledWith(component.communication);

    // Archive error
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doArchive = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    mockCommunications.archive.mockRejectedValueOnce(new Error('fail'));
    await component.askAndArchive(true);
    await doArchive();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should delete communication with confirmation and handle error', async () => {
    component.communication = new Communication({ communicationId: 'c-1' });

    let doDelete: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });

    await component.askAndDelete();
    await doDelete();
    expect(mockCommunications.delete).toHaveBeenCalledWith(component.communication);
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();

    // Delete error
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doDelete = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    mockCommunications.delete.mockRejectedValueOnce(new Error('fail'));
    await component.askAndDelete();
    await doDelete();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should check errors and close modal', () => {
    component.errors.add('name');
    expect(component.hasFieldAnError('name')).toBe(true);
    expect(component.hasFieldAnError('content')).toBe(false);

    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
