import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubjectComponent } from '@common/subject.component';
import { AppService } from '@app/app.service';
import { Subject, SubjectTypes } from '@models/subject.model';

describe('SubjectComponent', () => {
  let component: SubjectComponent;
  let mockAppService: Partial<AppService>;

  beforeEach(() => {
    mockAppService = {
      openURL: vi.fn().mockResolvedValue(undefined)
    };
    component = new SubjectComponent(mockAppService as AppService);
  });

  it('should initialize with default values', () => {
    expect(component).toBeDefined();
    expect(component.size).toBe('default');
    expect(component.SubjectTypes).toBe(SubjectTypes);
  });

  it('should open on ESN Accounts when subject has an id', async () => {
    const subject = new Subject({
      id: 'john.doe',
      name: 'John Doe',
      type: SubjectTypes.USER
    });
    component.subject = subject;

    await component.openOnESNAccounts();
    expect(mockAppService.openURL).toHaveBeenCalledWith(subject.getURL());
  });

  it('should not open URL if subject or subject id is missing', async () => {
    component.subject = undefined;
    await component.openOnESNAccounts();
    expect(mockAppService.openURL).not.toHaveBeenCalled();

    component.subject = new Subject({});
    await component.openOnESNAccounts();
    expect(mockAppService.openURL).not.toHaveBeenCalled();
  });
});
