
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { IDEAMessageService, IDEATranslatePipe } from '@idea-ionic/common';

import { DeadlineComponent } from './deadline.component';
import { ManageDeadlineComponent } from './manageDeadline.component';

import { AppService } from '@app/app.service';
import { DeadlinesService } from './deadlines.service';

import { Deadline } from '@models/deadline.model';

const FIRST_YEAR_FOR_DEADLINES = 2023;

@Component({
  imports: [FormsModule, IonicModule, IDEATranslatePipe, DeadlineComponent],
  selector: 'app-deadlines',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="medium">
        <ion-buttons slot="start">
          <ion-button (click)="close()">
            <ion-icon slot="start" icon="close"></ion-icon> {{ 'COMMON.CLOSE' | translate }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list class="aList">
        <ion-list-header>
          <ion-label>
            <h1>{{ 'DEADLINES.DEADLINES' | translate }}</h1>
            @if (!editMode) {
              <p>
                {{ 'DEADLINES.DEADLINES_TIMEZONE' | translate : { timezone: app.configurations.timezone } }}
              </p>
            }
          </ion-label>
          @if (editMode) {
            <ion-button color="ESNgreen" (click)="addDeadline()">
              {{ 'COMMON.ADD' | translate }}
            </ion-button>
          }
        </ion-list-header>
        <div class="ion-text-right">
          <ion-item color="transparent" lines="none">
            <ion-select
              interface="popover"
              labelPlacement="end"
              [attr.aria-label]="'COMMON.YEAR' | translate"
              [(ngModel)]="filterByYear"
              (ionChange)="loadListOfYear(filterByYear)"
            >
              <ion-select-option [value]="null">{{ 'DEADLINES.FUTURE_DEADLINES' | translate }}</ion-select-option>
              @for (year of years; track year) {
                <ion-select-option [value]="year">{{ year }}</ion-select-option>
              }
            </ion-select>
          </ion-item>
        </div>
        @if (deadlines && !deadlines.length) {
          <ion-item class="noElements">
            <ion-label>{{ 'COMMON.NO_ELEMENTS' | translate }}</ion-label>
          </ion-item>
        }
        @if (!deadlines) {
          <app-deadline></app-deadline>
        }
        @for (deadline of deadlines; track deadline.deadlineId) {
          <app-deadline [deadline]="deadline">
            @if (editMode) {
              <ion-button slot="end" fill="clear" color="ESNgreen" (click)="editDeadline(deadline)">
                <ion-icon icon="pencil" slot="icon-only"></ion-icon>
              </ion-button>
            }
          </app-deadline>
        }
      </ion-list>
    </ion-content>
  `,
  styles: [
    `
      ion-list.aList ion-list-header {
        margin-left: 8px;
      }
    `,
    `
      ion-toolbar ion-buttons[slot='start'] ion-button {
        margin-left: 8px;
      }
    `
  ]
})
export class DeadlinesComponent implements OnInit {
  /**
   * The deadlines to show.
   */
  @Input() deadlines: Deadline[] | undefined;
  /**
   * Whether the component should be in edit mode.
   */
  @Input() editMode = false;

  years: number[] = [];
  filterByYear: number | null = null;

  constructor(
    private modalCtrl: ModalController,
    private message: IDEAMessageService,
    private _deadlines: DeadlinesService,
    public app: AppService
  ) {}

  ngOnInit(): void {
    this.years = this.app.getYearsSince(FIRST_YEAR_FOR_DEADLINES);
  }

  async loadListOfYear(year: number | null | undefined): Promise<void> {
    try {
      this.deadlines = undefined;
      this.deadlines = await this._deadlines.getList({ force: true, year: year ?? undefined });
    } catch (error) {
      await this.message.error('COMMON.COULDNT_LOAD_LIST');
    }
  }

  close(): void {
    void this.modalCtrl.dismiss();
  }

  async addDeadline(): Promise<void> {
    await this.editDeadline(new Deadline());
  }

  async editDeadline(deadline: Deadline): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: ManageDeadlineComponent,
      componentProps: { deadline },
      backdropDismiss: false
    });
    modal.onDidDismiss().then(async (): Promise<void> => {
      this.deadlines = await this._deadlines.getList({ force: true, year: this.filterByYear ?? undefined });
    });
    await modal.present();
  }
}
