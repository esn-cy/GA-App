import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailTemplateComponent } from '@tabs/configurations/emailTemplate/emailTemplate.component';
import { EmailTemplates } from '@models/configurations.model';

describe('EmailTemplateComponent', () => {
  let component: EmailTemplateComponent;
  let mockModalCtrl: any;
  let mockAlertCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockConfigurations: any;
  let mockApp: any;

  beforeEach(() => {
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true)
    };
    mockAlertCtrl = {
      create: vi.fn().mockResolvedValue({ present: vi.fn() })
    };
    mockLoading = {
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined)
    };
    mockMessage = {
      error: vi.fn().mockResolvedValue(undefined),
      warning: vi.fn().mockResolvedValue(undefined),
      success: vi.fn().mockResolvedValue(undefined)
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Translated')
    };
    mockConfigurations = {
      getEmailTemplate: vi.fn().mockResolvedValue({ subject: 'Welcome', content: '<p>Hello</p>' }),
      setEmailTemplate: vi.fn().mockResolvedValue(undefined),
      resetEmailTemplate: vi.fn().mockResolvedValue(undefined),
      testEmailTemplate: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {};

    component = new EmailTemplateComponent(
      mockModalCtrl,
      mockAlertCtrl,
      mockLoading,
      mockMessage,
      mockTranslations,
      mockConfigurations,
      mockApp
    );
    component.template = EmailTemplates.QUESTIONS;
  });

  it('should initialize template on ngOnInit', async () => {
    await component.ngOnInit();
    expect(mockConfigurations.getEmailTemplate).toHaveBeenCalledWith(EmailTemplates.QUESTIONS);
    expect(component.subject).toBe('Welcome');
    expect(component.content).toBe('<p>Hello</p>');
    expect(component.variables.length).toBeGreaterThan(0);
  });

  it('should validate before save', async () => {
    await component.ngOnInit();
    component.subject = '';
    await component.save();

    expect(component.hasFieldAnError('subject')).toBe(true);
    expect(mockMessage.warning).toHaveBeenCalledWith('COMMON.FORM_HAS_ERROR_TO_CHECK');
    expect(mockConfigurations.setEmailTemplate).not.toHaveBeenCalled();
  });

  it('should save email template when valid, and handle errors', async () => {
    await component.ngOnInit();
    await component.save();

    expect(mockConfigurations.setEmailTemplate).toHaveBeenCalledWith(
      EmailTemplates.QUESTIONS,
      'Welcome',
      '<p>Hello</p>'
    );
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();

    // Save failure
    mockConfigurations.setEmailTemplate.mockRejectedValueOnce(new Error('fail'));
    await component.save();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.SOMETHING_WENT_WRONG');
  });

  it('should browse and load HTML template from file', async () => {
    // browseHTMLFile
    const clickSpy = vi.fn();
    const getElemSpy = vi.spyOn(document, 'getElementById').mockReturnValue({ click: clickSpy } as any);
    component.browseHTMLFile();
    expect(clickSpy).toHaveBeenCalled();
    getElemSpy.mockRestore();

    // Empty files
    await component.loadTemplateFromFile({ files: [] as any } as any);
    expect(component.content).toBeUndefined();

    // Valid file
    const file = new File(['<h1>Loaded Template</h1>'], 'template.html', { type: 'text/html' });
    const inputEl = { files: [file] } as any;

    let readResult: any;
    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      onload: any;
      onerror: any;

      readAsText() {
        this.onload({ target: { result: '<h1>Loaded Template</h1>' } });
      }
    }

    globalThis.FileReader = MockFileReader as any;

    await component.loadTemplateFromFile(inputEl);
    expect(component.content).toBe('<h1>Loaded Template</h1>');

    // FileReader error
    class ErrorFileReader {
      onload: any;
      onerror: any;

      readAsText() {
        this.onerror();
      }
    }

    globalThis.FileReader = ErrorFileReader as any;
    await component.loadTemplateFromFile(inputEl);
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.SOMETHING_WENT_WRONG');

    globalThis.FileReader = originalFileReader;
  });

  it('should execute reset template alert callbacks and handle error', async () => {
    let doReset: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doReset = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.askAndResetTemplate();
    await doReset();
    expect(mockConfigurations.resetEmailTemplate).toHaveBeenCalledWith(EmailTemplates.QUESTIONS);
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();

    // Reset failure
    mockConfigurations.resetEmailTemplate.mockRejectedValueOnce(new Error('reset fail'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doReset = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.askAndResetTemplate();
    await doReset();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');
  });

  it('should download template using app service', async () => {
    mockApp.downloadDataAsFile = vi.fn();
    await component.downloadTemplate();
    expect(mockApp.downloadDataAsFile).toHaveBeenCalledWith(
      '<p>Hello</p>',
      'text/html',
      `${EmailTemplates.QUESTIONS}.html`
    );
  });

  it('should handle getTemplate error', async () => {
    mockConfigurations.getEmailTemplate.mockRejectedValueOnce(new Error('fail'));
    await expect(component.getTemplate()).rejects.toThrow();
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.SOMETHING_WENT_WRONG');
  });

  it('should execute send test email alert callbacks and handle error', async () => {
    let doSend: any;
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSend = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.askAndSendTestEmailWithCurrentTemplate();
    await doSend();
    expect(mockConfigurations.testEmailTemplate).toHaveBeenCalledWith(EmailTemplates.QUESTIONS);
    expect(mockMessage.success).toHaveBeenCalledWith('EMAIL_TEMPLATE.EMAIL_SENT');

    // Test send error
    mockConfigurations.testEmailTemplate.mockRejectedValueOnce(new Error('bad template'));
    mockAlertCtrl.create.mockImplementationOnce(async (opts: any) => {
      doSend = opts.buttons.find((b: any) => typeof b.handler === 'function')?.handler;
      return { present: vi.fn() };
    });
    await component.askAndSendTestEmailWithCurrentTemplate();
    await doSend();
    expect(mockMessage.error).toHaveBeenCalledWith('EMAIL_TEMPLATE.BAD_TEMPLATE');
  });

  it('should close modal on close()', () => {
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });
});
