import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubjectsReactionsComponent } from '@common/subjectsReactions.component';
import { PopoverController } from '@ionic/angular';
import { AppService } from '@app/app.service';

describe('SubjectsReactionsComponent', () => {
  let component: SubjectsReactionsComponent;
  let mockPopoverCtrl: Partial<PopoverController>;
  let mockApp: Partial<AppService>;

  beforeEach(() => {
    mockPopoverCtrl = {
      dismiss: vi.fn().mockResolvedValue(true)
    };
    mockApp = {};
    component = new SubjectsReactionsComponent(
      mockPopoverCtrl as PopoverController,
      mockApp as AppService
    );
  });

  it('should load subjects and configure upvote reaction', async () => {
    component.reaction = 'upvote';
    component.subjectsPromise = Promise.resolve([{ _id: 'sub-1', name: 'User 1' } as any]);

    await component.ngAfterViewInit();

    expect(component.showSpinner).toBe(false);
    expect(component.subjects?.length).toBe(1);
    expect(component.icon).toBe('thumbs-up');
    expect(component.color).toBe('ESNgreen');
  });

  it('should configure clap reaction', async () => {
    component.reaction = 'clap';
    component.subjectsPromise = Promise.resolve([]);

    await component.ngAfterViewInit();

    expect(component.icon).toBe('/assets/icons/clap.svg');
    expect(component.color).toBe('ESNpink');
  });

  it('should configure appreciation reaction', async () => {
    component.reaction = 'appreciation';
    component.subjectsPromise = Promise.resolve([]);

    await component.ngAfterViewInit();

    expect(component.icon).toBe('heart');
    expect(component.color).toBe('ESNpink');
  });

  it('should handle unknown reaction and undefined subjectsPromise', async () => {
    component.reaction = 'unknown' as any;
    component.subjectsPromise = undefined as any;

    await component.ngAfterViewInit();

    expect(component.icon).toBe('');
    expect(component.color).toBe('');
    expect(component.subjects).toBeUndefined();
  });

  it('should close popover on close()', () => {
    component.close();
    expect(mockPopoverCtrl.dismiss).toHaveBeenCalled();
  });
});
