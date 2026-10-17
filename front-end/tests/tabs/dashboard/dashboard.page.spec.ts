import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from '@tabs/dashboard/dashboard.page';
import { ModalController } from '@ionic/angular';
import { IDEALoadingService, IDEAMessageService } from '@idea-ionic/common';
import { CommunicationsService } from '@tabs/dashboard/communications/communications.service';
import { DeadlinesService } from '@tabs/dashboard/deadlines/deadlines.service';
import { UsefulLinksService } from '@tabs/dashboard/usefulLinks/usefulLinks.service';
import { StatisticsService } from '@app/common/statistics.service';
import { AppService } from '@app/app.service';
import { Communication } from '@models/communication.model';
import { Deadline } from '@models/deadline.model';
import { UsefulLink } from '@models/usefulLink.model';

describe('DashboardPage', () => {
  let page: DashboardPage;
  let mockModalCtrl: any;
  let mockLoading: any;
  let mockMessage: any;
  let mockCommunicationsService: any;
  let mockDeadlinesService: any;
  let mockUsefulLinksService: any;
  let mockStatisticsService: any;
  let mockApp: any;

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);

  const farFutureDate = new Date();
  farFutureDate.setDate(farFutureDate.getDate() + 50);

  const mockDeadlines: Deadline[] = [
    new Deadline({ deadlineId: 'd-1', title: 'Upcoming Deadline', at: futureDate.toISOString() }),
    new Deadline({ deadlineId: 'd-2', title: 'Far Future Deadline', at: farFutureDate.toISOString() })
  ];

  beforeEach(() => {
    mockModalCtrl = {
      create: vi.fn().mockImplementation(async (opts) => ({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ data: true }),
        opts
      }))
    };
    mockLoading = { show: vi.fn().mockResolvedValue(undefined), hide: vi.fn().mockResolvedValue(undefined) };
    mockMessage = { error: vi.fn(), success: vi.fn() };
    mockCommunicationsService = {
      getList: vi.fn().mockResolvedValue([new Communication({ communicationId: 'comm-1', name: 'News' })]),
      getById: vi.fn().mockResolvedValue(new Communication({ communicationId: 'comm-1' }))
    };
    mockDeadlinesService = {
      getList: vi.fn().mockResolvedValue(mockDeadlines)
    };
    mockUsefulLinksService = {
      getList: vi.fn().mockResolvedValue([new UsefulLink({
        linkId: 'link-1',
        name: 'Statutes',
        url: 'https://example.com'
      })]),
      getById: vi.fn().mockResolvedValue(new UsefulLink({ linkId: 'link-1' })),
      swapSort: vi.fn().mockResolvedValue(undefined)
    };
    mockStatisticsService = {
      recapOfLastNumDays: vi.fn().mockResolvedValue(undefined)
    };
    mockApp = {
      user: { isAdministrator: false },
      openURL: vi.fn().mockResolvedValue(undefined)
    };

    page = new DashboardPage(
      mockModalCtrl as ModalController,
      mockLoading as IDEALoadingService,
      mockMessage as IDEAMessageService,
      mockCommunicationsService as CommunicationsService,
      mockDeadlinesService as DeadlinesService,
      mockUsefulLinksService as UsefulLinksService,
      mockStatisticsService as StatisticsService,
      mockApp as AppService
    );
  });

  it('should load dashboard resources and compute upcoming deadlines on ngOnInit', async () => {
    await page.ngOnInit();

    expect(mockCommunicationsService.getList).toHaveBeenCalled();
    expect(mockDeadlinesService.getList).toHaveBeenCalled();
    expect(mockUsefulLinksService.getList).toHaveBeenCalled();
    expect(page.communications).toHaveLength(1);
    expect(page.usefulLinks).toHaveLength(1);
    expect(page.nextDeadlines).toHaveLength(1);
    expect(page.nextDeadlines![0].deadlineId).toBe('d-1');
  });

  it('should request statistics recap if user is administrator', async () => {
    mockApp.user!.isAdministrator = true;
    await page.ngOnInit();

    expect(mockStatisticsService.recapOfLastNumDays).toHaveBeenCalled();
  });

  it('should open communication detail modal and count in statistics', async () => {
    await page.ngOnInit();
    const comm = page.communications![0];

    page.editMode = true;
    await page.openCommunication(comm);
    expect(mockModalCtrl.create).not.toHaveBeenCalled();

    page.editMode = false;
    await page.openCommunication(comm);
    expect(mockModalCtrl.create).toHaveBeenCalled();
    expect(mockCommunicationsService.getById).toHaveBeenCalledWith('comm-1');
  });

  it('should manage and add communications in edit mode', async () => {
    await page.ngOnInit();
    const comm = page.communications![0];

    page.editMode = false;
    await page.manageCommunication(comm);
    expect(mockModalCtrl.create).not.toHaveBeenCalled();

    page.editMode = true;
    await page.manageCommunication(comm);
    expect(mockModalCtrl.create).toHaveBeenCalled();

    await page.addCommunication();
    expect(mockModalCtrl.create).toHaveBeenCalledTimes(2);

    await page.openCommunicationsArchive();
    expect(mockModalCtrl.create).toHaveBeenCalledTimes(3);
  });

  it('should open all deadlines with and without edit mode', async () => {
    await page.ngOnInit();

    page.editMode = false;
    await page.openAllDeadlines();
    expect(mockModalCtrl.create).toHaveBeenCalled();

    page.editMode = true;
    await page.openAllDeadlines();
    expect(mockModalCtrl.create).toHaveBeenCalledTimes(2);
  });

  it('should open, edit, add, and swapSort useful links', async () => {
    await page.ngOnInit();
    const link = page.usefulLinks![0];

    page.editMode = true;
    await page.openUsefulLink(link);
    expect(mockApp.openURL).not.toHaveBeenCalled();

    page.editMode = false;
    await page.openUsefulLink(link);
    expect(mockApp.openURL).toHaveBeenCalledWith('https://example.com');
    expect(mockUsefulLinksService.getById).toHaveBeenCalledWith('link-1');

    await page.editUsefulLink(link);
    expect(mockModalCtrl.create).toHaveBeenCalled();

    await page.addUsefulLink();
    expect(mockModalCtrl.create).toHaveBeenCalledTimes(2);

    const mockEvent = { stopPropagation: vi.fn() } as any;
    const link2 = new UsefulLink({ linkId: 'link-2' });
    await page.swapSortUsefulLinks(link, link2, mockEvent);
    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(mockUsefulLinksService.swapSort).toHaveBeenCalledWith(link, link2);

    mockUsefulLinksService.swapSort.mockRejectedValueOnce(new Error('fail'));
    await page.swapSortUsefulLinks(link, link2);
    expect(mockMessage.error).toHaveBeenCalled();
  });
});
