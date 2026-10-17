import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTMLEditorComponent } from '@common/htmlEditor.component';
import { DomSanitizer } from '@angular/platform-browser';

describe('HTMLEditorComponent', () => {
  let component: HTMLEditorComponent;
  let mockSanitizer: Partial<DomSanitizer>;

  beforeEach(() => {
    mockSanitizer = {
      sanitize: vi.fn().mockImplementation((context, val) => val)
    };
    component = new HTMLEditorComponent(mockSanitizer as DomSanitizer);
  });

  it('should initialize text from content in ngOnInit', () => {
    component.content = '<p>Initial text</p>';
    component.ngOnInit();
    expect(component.text).toBe('<p>Initial text</p>');
  });

  it('should sanitize HTML on ngOnChanges when editMode changes', () => {
    component.content = '<p>Some content</p>';
    component.ngOnChanges({
      editMode: {
        currentValue: false,
        previousValue: true,
        firstChange: false,
        isFirstChange: () => false
      }
    });

    expect(mockSanitizer.sanitize).toHaveBeenCalled();
    expect(component.sanitizedHtml).toBe('<p>Some content</p>');
  });

  it('should clean HTML code using docsSoap and emit contentChange', () => {
    vi.useFakeTimers();
    const emitSpy = vi.spyOn(component.contentChange, 'emit');
    component.text = '<p>Dirty html</p>';

    component.cleanHTMLCode();
    vi.advanceTimersByTime(100);

    expect(emitSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
