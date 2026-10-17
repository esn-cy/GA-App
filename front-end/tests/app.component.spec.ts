import { describe, expect, it } from 'vitest';
import { AppComponent } from '@app/app.component';

describe('AppComponent', () => {
  it('should create an instance', () => {
    const component = new AppComponent();
    expect(component).toBeTruthy();
  });
});
