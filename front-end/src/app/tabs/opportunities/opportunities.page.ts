import { Component, OnInit, ViewChild } from '@angular/core';
import { IonInfiniteScroll, IonRefresher, IonSearchbar } from '@ionic/angular';
import { IDEATranslationsService } from '@idea-ionic/common';

import { AppService } from '@app/app.service';
import { OpportunitiesService, OpportunitiesSortBy } from './opportunities.service';

import { Opportunity } from '@models/opportunity.model';
import { StatisticEntityTypes } from '@models/statistic.model';

@Component({
  selector: 'opportunities',
  templateUrl: 'opportunities.page.html',
  styleUrls: ['opportunities.page.scss']
})
export class OpportunitiesPage implements OnInit {
  opportunities: Opportunity[] | undefined;

  @ViewChild('searchbar') searchbar: IonSearchbar | undefined;

  filterByStatus: boolean | undefined;

  sortBy: OpportunitiesSortBy = OpportunitiesSortBy.CREATED_DATE_DESC;
  OpportunitiesSortBy = OpportunitiesSortBy;

  SET = StatisticEntityTypes;

  constructor(
    private t: IDEATranslationsService,
    private _opportunities: OpportunitiesService,
    public app: AppService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadResources();
  }

  ionViewDidEnter(): void {
    void this.filter('', undefined, true);
  }

  private async loadResources(): Promise<void> {
    this.opportunities = await this._opportunities.getActiveList({ force: true, withPagination: true });
  }

  async handleRefresh(refresh: IonRefresher): Promise<void> {
    this.opportunities = undefined;
    await this.loadResources();
    await refresh.complete();
  }

  async filter(search = '', scrollToNextPage?: IonInfiniteScroll, force = false): Promise<void> {
    let startPaginationAfterId;
    if (scrollToNextPage && this.opportunities?.length)
      startPaginationAfterId = this.opportunities[this.opportunities.length - 1].opportunityId;

    this.opportunities = await this._opportunities.getActiveList({
      force,
      search,
      status: this.filterByStatus,
      withPagination: true,
      startPaginationAfterId: startPaginationAfterId,
      sortBy: this.sortBy
    });

    if (scrollToNextPage) setTimeout((): Promise<void> => scrollToNextPage.complete(), 100);
  }

  openOpportunity(opportunity: Opportunity): void {
    this.app.goToInTabs(['opportunities', opportunity.opportunityId]);
  }

  addOpportunity(): void {
    this.app.goToInTabs(['opportunities', 'new', 'manage']);
  }
}
