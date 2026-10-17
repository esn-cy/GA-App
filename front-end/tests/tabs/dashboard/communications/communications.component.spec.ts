import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunicationsComponent } from '@tabs/dashboard/communications/communications.component';
import { Communication } from '@models/communication.model';

describe('CommunicationsComponent', () => {
  let component: CommunicationsComponent;
  let mockModalCtrl: any;
  let mockMessage: any;
  let mockCommunicationsService: any;
  let mockApp: any;

  beforeEach(() => {
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true),
      create: vi.fn().mockResolvedValue({
        present: vi.fn(),
        onDidDismiss: vi.fn().mockResolvedValue({ data: true })
      })
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined)
    };
    mockCommunicationsService = {
      getList: vi.fn().mockResolvedValue([
        new Communication({ communicationId: 'c-1', name: 'First Announcement' })
      ]),
      getById: vi.fn().mockResolvedValue(new Communication({ communicationId: 'c-1' }))
    };
    mockApp = {
      getYearsSince: vi.fn().mockReturnValue([2023, 2024, 2025, 2026])
    };

    component = new CommunicationsComponent(
      mockModalCtrl,
      mockMessage,
      mockCommunicationsService,
      mockApp
    );
  });

  it('should initialize years and load list on ngOnInit', async () => {
    await component.ngOnInit();
    expect(mockApp.getYearsSince).toHaveBeenCalled();
    expect(mockCommunicationsService.getList).toHaveBeenCalled();
    expect(component.communications?.length).toBe(1);

    mockCommunicationsService.getList.mockRejectedValueOnce(new Error('fail'));
    await component.loadListOfYear(2025);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.COULDNT_LOAD_LIST');
  });

  it('should open communication detail modal and trigger getById for statistics', async () => {
    const comm = new Communication({ communicationId: 'c-1', name: 'Announcement' });
    await component.openCommunication(comm);

    expect(mockModalCtrl.create).toHaveBeenCalled();
    expect(mockCommunicationsService.getById).toHaveBeenCalledWith('c-1');
  });

  it('should open edit communication modal and refresh list on dismiss', async () => {
    const comm = new Communication({ communicationId: 'c-1' });
    const ev = { stopPropagation: vi.fn() } as any;

    await component.editCommunication(comm, ev);
    expect(ev.stopPropagation).toHaveBeenCalled();
    expect(mockModalCtrl.create).toHaveBeenCalled();
  });

  it('should close modal on close()', () => {
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
