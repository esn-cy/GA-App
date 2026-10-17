import { describe, expect, it, vi } from 'vitest';
import { TopicComponent } from '@tabs/topics/topic.component';
import { Topic, TopicTypes } from '@models/topic.model';

describe('TopicComponent', () => {
  it('should initialize and emit select on selection', () => {
    const mockApp = {} as any;
    const component = new TopicComponent(mockApp);

    expect(component.row).toBe(false);
    expect(component.header).toBe(false);

    const spy = vi.fn();
    component.select.subscribe(spy);

    component.topic = new Topic({ topicId: 'top-1', name: 'Open Q&A', type: TopicTypes.STANDARD });
    component.select.emit();
    expect(spy).toHaveBeenCalled();
  });
});
