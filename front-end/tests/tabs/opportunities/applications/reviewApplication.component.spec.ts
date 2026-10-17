import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewApplicationStandaloneComponent } from '@tabs/opportunities/applications/reviewApplication.component';
import { Application } from '@models/application.model';
import { Opportunity } from '@models/opportunity.model';
import { TopicCategoryAttached } from '@models/category.model';
import { GAEventAttached } from '@models/event.model';
import { Topic } from '@models/topic.model';

describe('ReviewApplicationStandaloneComponent', () => {
  let component: ReviewApplicationStandaloneComponent;
  let mockAlertCtrl: any;
  let mockModalCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockApplications: any;
  let mockTopics: any;
  let mockApp: any;

  beforeEach(() => {
    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() })
    };
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true)
    };
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined),
      success: vi.fn().mockResolvedValue(undefined)
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Translated')
    };
    mockApplications = {
      review: vi.fn().mockResolvedValue(new Application({
        applicationId: 'a-1',
        approvedAt: '2026-10-17T00:00:00.000Z'
      }))
    };
    mockTopics = {
      insertFromApplicationToOpportunity: vi.fn().mockResolvedValue(new Topic({ topicId: 'top-1' }))
    };
    mockApp = {
      goToInTabs: vi.fn()
    };

    component = new ReviewApplicationStandaloneComponent(
      mockAlertCtrl,
      mockModalCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockApplications,
      mockTopics,
      mockApp
    );
    component.opportunity = new Opportunity({ opportunityId: 'opp-1' });
    component.application = new Application({ applicationId: 'a-1', reviewMessage: 'Pre-existing' });
  });

  it('should initialize reviewMessage on ngOnInit', () => {
    component.ngOnInit();
    expect(component.reviewMessage).toBe('Pre-existing');
  });

  it('should trigger confirmation alert on review, execute handler, and handle error', async () => {
    component.ngOnInit();
    let doReview: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doReview = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.review(true);
    await doReview();
    expect(mockApplications.review).toHaveBeenCalledWith(component.application, true, 'Pre-existing');
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();

    // Review failure
    mockApplications.review.mockRejectedValueOnce(new Error('fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doReview = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.review(false);
    await doReview();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should validate and promote application to topic, and handle promote error', async () => {
    component.promoteTopicCategory = new TopicCategoryAttached({ categoryId: 'cat-1', name: 'Workshops' });
    component.promoteTopicEvent = new GAEventAttached({ eventId: 'ev-1', name: 'Spring GA' });

    await component.promoteToTopic();
    expect(mockLoading.show).toHaveBeenCalled();
    expect(mockTopics.insertFromApplicationToOpportunity).toHaveBeenCalledWith(
      component.opportunity,
      component.application,
      component.promoteTopicCategory,
      component.promoteTopicEvent
    );
    expect(mockMessage.success).toHaveBeenCalledWith('COMMON.OPERATION_COMPLETED');
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
    expect(mockApp.goToInTabs).toHaveBeenCalledWith(['topics', 'top-1', 'standard'], { root: true });
    expect(mockLoading.hide).toHaveBeenCalled();

    // Promote failure
    mockTopics.insertFromApplicationToOpportunity.mockRejectedValueOnce(new Error('fail'));
    await component.promoteToTopic();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should reject promoteToTopic when missing category or event', async () => {
    await component.promoteToTopic();
    expect(component.hasFieldAnError('category')).toBe(true);
    expect(component.hasFieldAnError('event')).toBe(true);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.FORM_HAS_ERROR_TO_CHECK');
    expect(mockTopics.insertFromApplicationToOpportunity).not.toHaveBeenCalled();
  });

  it('should dismiss modal on close()', () => {
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
