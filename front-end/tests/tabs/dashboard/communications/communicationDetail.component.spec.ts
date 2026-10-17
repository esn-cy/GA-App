import { describe, expect, it, vi } from 'vitest';
import { CommunicationDetailComponent } from '@tabs/dashboard/communications/communicationDetail.component';
import { Communication } from '@models/communication.model';

describe('CommunicationDetailComponent', () => {
  it('should create and dismiss on close()', () => {
    const mockModalCtrl = { dismiss: vi.fn().mockResolvedValue(true) } as any;
    const component = new CommunicationDetailComponent(mockModalCtrl);
    component.communication = new Communication({ name: 'Announcement', brief: 'Hello' });

    expect(component).toBeTruthy();
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
