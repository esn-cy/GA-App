import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaService } from '@common/media.service';
import { IDEAApiService } from '@idea-ionic/common';

describe('MediaService', () => {
  let service: MediaService;
  let mockApi: Partial<IDEAApiService>;

  beforeEach(() => {
    mockApi = {
      postResource: vi.fn().mockResolvedValue({ url: 'https://s3.example.com/upload', id: 'media-123' })
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true } as any);
    service = new MediaService(mockApi as IDEAApiService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should upload an image and return its media ID', async () => {
    vi.useFakeTimers();
    const file = new File(['content'], 'avatar.png', { type: 'image/png' });

    const uploadPromise = service.uploadImage(file);
    await vi.advanceTimersByTimeAsync(5000);
    const id = await uploadPromise;

    expect(id).toBe('media-123');
    expect(mockApi.postResource).toHaveBeenCalledWith('media');
    expect(global.fetch).toHaveBeenCalledWith('https://s3.example.com/upload', {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': 'image/png' }
    });
  });
});
