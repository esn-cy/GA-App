import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicAttachmentsService } from '@common/attachments.service';
import { IDEAApiService } from '@idea-ionic/common';
import { Attachment } from 'idea-toolbox';

describe('PublicAttachmentsService', () => {
  let service: PublicAttachmentsService;
  let mockApi: Partial<IDEAApiService>;

  beforeEach(() => {
    mockApi = {
      patchResource: vi.fn()
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as any);
    service = new PublicAttachmentsService(mockApi as IDEAApiService);
  });

  it('should upload a file and return attachment ID', async () => {
    (mockApi.patchResource as any).mockResolvedValue({ url: 'https://s3.example.com/put', id: 'att-123' });
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });

    const id = await service.upload(file);
    expect(id).toBe('att-123');
    expect(mockApi.patchResource).toHaveBeenCalledWith('public-attachments', {
      body: { action: 'GET_ATTACHMENT_UPLOAD_URL' }
    });
    expect(global.fetch).toHaveBeenCalledWith('https://s3.example.com/put', {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': 'application/pdf' }
    });
  });

  it('should get download URL for an attachment', async () => {
    (mockApi.patchResource as any).mockResolvedValue({ url: 'https://s3.example.com/get/doc.pdf' });
    const attachment = new Attachment({ attachmentId: 'att-123', name: 'report', format: 'pdf' });

    const url = await service.download(attachment);
    expect(url).toBe('https://s3.example.com/get/doc.pdf');
    expect(mockApi.patchResource).toHaveBeenCalledWith('public-attachments', {
      body: {
        action: 'GET_ATTACHMENT_DOWNLOAD_URL',
        attachmentId: 'att-123',
        filename: 'report.pdf'
      }
    });
  });
});
