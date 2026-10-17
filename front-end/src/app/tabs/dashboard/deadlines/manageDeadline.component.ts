
import { FormsModule } from '@angular/forms';
import { Component, Input } from '@angular/core';
import { AlertController, IonicModule, ModalController } from '@ionic/angular';
import {
  IDEALoadingService,
  IDEAMessageService,
  IDEATranslatePipe,
  IDEATranslationsService
} from '@idea-ionic/common';

import { EventsPickerComponent } from '@common/eventsPicker.component';
import { DatetimeWithTimezoneStandaloneComponent } from '@common/datetimeWithTimezone';

import { AppService } from '@app/app.service';
import { DeadlinesService } from './deadlines.service';

import { Deadline } from '@models/deadline.model';

@Component({
  imports: [
    FormsModule,
    IonicModule,
    IDEATranslatePipe,
    EventsPickerComponent,
    DatetimeWithTimezoneStandaloneComponent
  ],
  selector: 'app-manage-deadline',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="medium">
        <ion-buttons slot="start">
          <ion-button [title]="'COMMON.CANCEL' | translate" (click)="close()">
            <ion-icon slot="icon-only" icon="close-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'DEADLINES.MANAGE_DEADLINE' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button [title]="'COMMON.SAVE' | translate" (click)="save()">
            <ion-icon slot="icon-only" icon="checkmark-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list class="aList" lines="full">
        <ion-item [class.fieldHasError]="hasFieldAnError('name')">
          <ion-input labelPlacement="stacked" [(ngModel)]="deadline.name">
            <div slot="label">
              {{ 'DEADLINES.NAME' | translate }}
              <ion-text class="obligatoryDot"></ion-text>
            </div>
          </ion-input>
        </ion-item>
        <ion-item [class.fieldHasError]="hasFieldAnError('action')">
          <ion-input
            labelPlacement="stacked"
            [label]="'DEADLINES.ACTION' | translate"
            [(ngModel)]="deadline.action"
            [maxlength]="15"
            [counter]="true"
          ></ion-input>
        </ion-item>
        @if (deadline.action) {
          <ion-item [class.fieldHasError]="hasFieldAnError('actionColor')">
            <ion-select
              interface="popover"
              labelPlacement="stacked"
              [label]="'DEADLINES.ACTION_COLOR' | translate"
              [(ngModel)]="deadline.actionColor"
            >
              <ion-select-option [value]="null"></ion-select-option>
              @for (color of COLORS; track color) {
                <ion-select-option [value]="color">{{ color }}</ion-select-option>
              }
            </ion-select>
          </ion-item>
        }
        <ion-item [class.fieldHasError]="hasFieldAnError('target')">
          <ion-input
            labelPlacement="stacked"
            [label]="'DEADLINES.TARGET' | translate"
            [(ngModel)]="deadline.target"
          ></ion-input>
        </ion-item>
        <app-events-picker
          [class.fieldHasError]="hasFieldAnError('event')"
          [editMode]="true"
          [(event)]="deadline.event"
        ></app-events-picker>
        <app-datetime-timezone
          [label]="'DEADLINES.DATE' | translate"
          [obligatory]="true"
          [class.fieldHasError]="hasFieldAnError('at')"
          [(date)]="deadline.at"
        />
        <ion-item-divider>
          <ion-label class="ion-text-wrap ion-padding-start">
            <p>
              <i>{{ 'DEADLINES.DATES_I' | translate : { timezone: app.configurations.timezone } }}</i>
            </p>
          </ion-label>
        </ion-item-divider>
        @if (deadline.deadlineId) {
          <ion-row class="ion-padding-top">
            <ion-col class="ion-text-right ion-padding-end">
              <ion-button color="danger" (click)="askAndDelete()">{{ 'COMMON.DELETE' | translate }}</ion-button>
            </ion-col>
          </ion-row>
        }
      </ion-list>
    </ion-content>
  `
})
export class ManageDeadlineComponent {
  /**
   * The deadline to manage.
   */
  @Input({ required: true }) deadline!: Deadline;

  errors = new Set<string>();

  COLORS = [
    'primary',
    'secondary',
    'tertiary',
    'white',
    'dark',
    'light',
    'medium',
    'success',
    'danger',
    'ESNgreen',
    'ESNcyan',
    'ESNpink',
    'ESNdarkBlue',
    'ESNorange'
  ];

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private t: IDEATranslationsService,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _deadlines: DeadlinesService,
    public app: AppService
  ) {}

  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  async save(): Promise<void> {
    this.errors = new Set(this.deadline.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();
      let result: Deadline;
      if (!this.deadline.deadlineId) result = await this._deadlines.insert(this.deadline);
      else result = await this._deadlines.update(this.deadline);
      this.deadline.load(result);
      await this.message.success('COMMON.OPERATION_COMPLETED');
      this.close();
    } catch (err) {
      await this.message.error('COMMON.OPERATION_FAILED');
    } finally {
      await this.loading.hide();
    }
  }

  close(): void {
    void this.modalCtrl.dismiss();
  }

  async askAndDelete(): Promise<void> {
    const doDelete = async (): Promise<void> => {
      try {
        await this.loading.show();
        await this._deadlines.delete(this.deadline);
        await this.message.success('COMMON.OPERATION_COMPLETED');
        this.close();
      } catch (error) {
        await this.message.error('COMMON.OPERATION_FAILED');
      } finally {
        await this.loading.hide();
      }
    };
    const header = this.t._('COMMON.ARE_YOU_SURE');
    const subHeader = this.t._('COMMON.ACTION_IS_IRREVERSIBLE');
    const buttons = [
      { text: this.t._('COMMON.CANCEL'), role: 'cancel' },
      { text: this.t._('COMMON.DELETE'), role: 'destructive', handler: doDelete }
    ];
    const alert = await this.alertCtrl.create({ header, subHeader, buttons });
    await alert.present();
  }
}
