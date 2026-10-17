import { describe, expect, it } from 'vitest';
import { TabsComponent } from '@tabs/tabs.component';
import { AppService } from '@app/app.service';

describe('TabsComponent', () => {
  it('should create and store AppService reference', () => {
    const mockApp = { user: { name: 'Test' } } as unknown as AppService;
    const component = new TabsComponent(mockApp);
    expect(component).toBeTruthy();
    expect(component.app).toBe(mockApp);
  });
});
