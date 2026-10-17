import { describe, expect, it, vi } from 'vitest';
import { QuestionSummaryComponent } from '@tabs/topics/questions/questionSummary.component';
import { Question } from '@models/question.model';

describe('QuestionSummaryComponent', () => {
  it('should initialize and emit select on selection', () => {
    const mockApp = {} as any;
    const component = new QuestionSummaryComponent(mockApp);

    expect(component.current).toBe(false);

    const spy = vi.fn();
    component.select.subscribe(spy);

    component.question = new Question({ questionId: 'q-1', summary: 'Summary' });
    component.select.emit();
    expect(spy).toHaveBeenCalled();
  });
});
