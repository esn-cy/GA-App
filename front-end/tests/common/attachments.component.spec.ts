import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentsComponent, bytesToMegaBytes } from '@common/attachments.component';
import { Attachment } from 'idea-toolbox';

describe('AttachmentsComponent', () => {
  let component: AttachmentsComponent;
  let mockLoading: any;
  let mockMessage: any;
  let mockAttachmentsService: any;
  let mockApp: any;
  let mockTranslations: any;

  beforeEach(() => {
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined)
    };
    mockAttachmentsService = {
      upload: vi.fn().mockResolvedValue('att-id-123'),
      download: vi.fn().mockResolvedValue('https://example.com/file.pdf')
    };
    mockApp = {
      openURL: vi.fn().mockResolvedValue(undefined)
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Error message')
    };

    component = new AttachmentsComponent(
      mockLoading,
      mockMessage,
      mockAttachmentsService,
      mockApp,
      mockTranslations
    );
    component.attachments = [];
  });

  it('should calculate bytes to megabytes correctly', () => {
    expect(bytesToMegaBytes(1024 * 1024)).toBe(1);
    expect(bytesToMegaBytes(1024 * 1024 * 5)).toBe(5);
  });

  it('should remove attachment from list', () => {
    const att = new Attachment({ name: 'file', format: 'pdf' });
    component.attachments = [att];
    component.removeAttachment(att);
    expect(component.attachments.length).toBe(0);
  });

  it('should remove error from uploadErrors list and handle not found', () => {
    const err = { file: 'test.pdf', error: 'Upload failed' };
    component.uploadErrors = [err];
    component.removeErrorFromList(err);
    expect(component.uploadErrors.length).toBe(0);

    // Not found does nothing
    component.removeErrorFromList({ file: 'notfound.pdf', error: 'err' });
  });

  it('should trigger browseFiles with and without event', () => {
    const picker = document.createElement('input');
    picker.id = 'attachmentPicker';
    const clickSpy = vi.spyOn(picker, 'click');
    document.body.appendChild(picker);

    const mockEv = { stopPropagation: vi.fn() };
    component.browseFiles(mockEv);
    expect(mockEv.stopPropagation).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    component.browseFiles();
    expect(clickSpy).toHaveBeenCalledTimes(2);

    document.body.removeChild(picker);
  });

  it('should download attachment and open URL', async () => {
    const att = new Attachment({ name: 'test', format: 'pdf', attachmentId: 'att-1' });
    await component.downloadAttachment(att);

    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockAttachmentsService.download).toHaveBeenCalledWith(att);
    expect(mockApp.openURL).toHaveBeenCalledWith('https://example.com/file.pdf');
    expect(mockLoading.hide).toHaveBeenCalled();
  });

  it('should handle download failure gracefully', async () => {
    mockAttachmentsService.download.mockRejectedValue(new Error('Network error'));
    const att = new Attachment({ name: 'test', format: 'pdf' });

    await component.downloadAttachment(att);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
    expect(mockLoading.hide).toHaveBeenCalled();
  });

  it('should add attachments from file input and handle upload errors', async () => {
    const file = new File(['hello'], 'document.pdf', { type: 'application/pdf' });
    const ev = {
      target: {
        files: {
          length: 1,
          item: (i: number) => file
        },
        value: 'document.pdf'
      }
    };

    component.addAttachmentFromFile(ev);
    expect(component.attachments.length).toBe(1);
    expect(component.attachments[0].name).toBe('document');
    expect(component.attachments[0].format).toBe('pdf');

    // Upload failure
    mockAttachmentsService.upload.mockRejectedValueOnce(new Error('Upload failed'));
    const failFile = new File(['fail'], 'fail.pdf', { type: 'application/pdf' });
    const failEv = {
      target: {
        files: {
          length: 1,
          item: (i: number) => failFile
        },
        value: 'fail.pdf'
      }
    };
    component.addAttachmentFromFile(failEv);
    await new Promise(r => setTimeout(r, 10));
    expect(component.uploadErrors).toContainEqual({ file: 'fail', error: 'Upload failed' });
    expect(mockMessage.error).toHaveBeenCalledWith('Upload failed', { dontTranslate: true });

    // File too big
    const bigFile = new File([''], 'huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(bigFile, 'size', { value: 1024 * 1024 * 100 }); // 100MB
    const bigEv = {
      target: {
        files: {
          length: 1,
          item: (i: number) => bigFile
        },
        value: 'huge.pdf'
      }
    };
    component.addAttachmentFromFile(bigEv);
    await new Promise(r => setTimeout(r, 10));
    expect(mockMessage.error).toHaveBeenCalled();

    // Event without target
    component.addAttachmentFromFile({});
  });
});
