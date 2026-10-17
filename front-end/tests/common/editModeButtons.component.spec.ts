import { describe, expect, it } from 'vitest';
import { EditModeButtonsComponent } from '@common/editModeButtons.component';
import { AppService } from '@app/app.service';

describe('EditModeButtonsComponent', () => {
  it('should create and have default properties', () => {
    const mockApp = {} as AppService;
    const component = new EditModeButtonsComponent(mockApp);

    expect(component).toBeTruthy();
    expect(component.editMode).toBe(false);
    expect(component.noInteraction).toBe(false);
    expect(component.app).toBe(mockApp);
  });

  it('should emit outputs for enter, exit, save', () => {
    const component = new EditModeButtonsComponent({} as AppService);
    let entered = false;
    let exited = false;
    let saved = false;

    component.enter.subscribe(() => (entered = true));
    component.exit.subscribe(() => (exited = true));
    component.save.subscribe(() => (saved = true));

    component.enter.emit();
    component.exit.emit();
    component.save.emit();

    expect(entered).toBe(true);
    expect(exited).toBe(true);
    expect(saved).toBe(true);
  });
});
