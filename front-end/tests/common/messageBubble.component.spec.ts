import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageBubbleComponent } from '@common/messageBubble.component';
import { DomSanitizer } from '@angular/platform-browser';
import { AppService } from '@app/app.service';

describe('MessageBubbleComponent', () => {
  let component: MessageBubbleComponent;
  let mockSanitizer: Partial<DomSanitizer>;
  let mockApp: Partial<AppService>;

  beforeEach(() => {
    mockSanitizer = {
      sanitize: vi.fn().mockImplementation((context, val) => val)
    };
    mockApp = {};
    component = new MessageBubbleComponent(
      mockSanitizer as DomSanitizer,
      mockApp as AppService
    );
  });

  it('should initialize with default values', () => {
    expect(component.isSender).toBe(false);
    expect(component.text).toBeUndefined();
    expect(component.creator).toBeUndefined();
  });

  it('should sanitize HTML text on ngOnChanges', () => {
    component.text = '<b>Hello world</b>';
    component.ngOnChanges({
      text: {
        currentValue: '<b>Hello world</b>',
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(mockSanitizer.sanitize).toHaveBeenCalled();
    expect(component.sanitizedHtml).toBe('<b>Hello world</b>');
  });
});
