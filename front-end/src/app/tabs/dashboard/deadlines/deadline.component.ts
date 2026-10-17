import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { isToday, isTomorrow } from 'date-fns';
import { IDEATranslationsService } from '@idea-ionic/common';

import { DateTimezonePipe, formatDateWithLocaleAndTimeZone } from '@common/dateTimezone.pipe';

import { AppService } from '@app/app.service';

import { Deadline } from '@models/deadline.model';

@Component({
  imports: [CommonModule, IonicModule, DateTimezonePipe],
  selector: 'app-deadline',
  template: `
    @if (!deadline) {
      <ion-item [color]="color">
        <ion-label>
          <ion-skeleton-text [animated]="true"></ion-skeleton-text>
        </ion-label>
      </ion-item>
    }
    @if (deadline) {
      <ion-item [color]="color">
        @if (!app.isInMobileMode()) {
          <ion-badge slot="start" class="deadlineDate" [color]="getDeadlineColor()">
            {{ getDeadlineLabel() }}
          </ion-badge>
        }
        <ion-label class="ion-text-wrap">
          @if (app.isInMobileMode()) {
            <p>
              <ion-badge class="deadlineDate mobile" [color]="getDeadlineColor()">{{ getDeadlineLabel() }}</ion-badge>
            </p>
          }
          {{ deadline.name }}
          <p>
            <ion-text color="medium" style="font-weight: 600">{{ deadline.event?.name }}</ion-text>
            @if (deadline.target && deadline.event) {
              <span> - </span>
            }
            {{ deadline.target }}
          </p>
        </ion-label>
        @if (deadline.action) {
          <ion-badge slot="end" mode="ios" [color]="deadline.actionColor ?? undefined">
            {{ deadline.action }}
          </ion-badge>
        }
        <ion-badge class="deadlineTime" slot="end">{{ deadline.at | dateTz : 'time' }}</ion-badge>
        <ng-content></ng-content>
      </ion-item>
    }
  `,
  styles: [
    `
      ion-badge {
        font-weight: 500;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      ion-item ion-label {
        line-height: 1.1em;
        margin: 16px 0 12px 0;
      }
      ion-item ion-label p {
        font-size: 0.8em;
      }
      ion-item ion-badge.deadlineDate {
        width: 106px;
        padding: 2px 5px;
      }
      ion-item ion-badge.deadlineDate.mobile {
        width: 120px;
        text-align: right;
      }
      ion-item ion-badge[slot='start'] {
        margin-right: 20px;
      }
      ion-item ion-badge[slot='end'] {
        margin-left: 12px;
      }
      ion-item ion-badge.deadlineTime {
        width: 45px;
        --background: none;
        --color: var(--ion-color-medium);
      }
    `
  ]
})
export class DeadlineComponent {
  /**
   * The deadline to show; if not set, shows a skeleton instead.
   */
  @Input() deadline: Deadline | undefined;
  /**
   * The colour for the component.
   */
  @Input() color = 'white';

  constructor(private t: IDEATranslationsService, public app: AppService) {}

  getDeadlineColor(): string {
    if (!this.deadline) return 'light';
    const date = new Date(this.deadline.at);
    if (isToday(date)) return 'danger';
    if (isTomorrow(date)) return 'warning';
    else return 'light';
  }

  getDeadlineLabel(): string {
    if (!this.deadline) return '';
    const date = new Date(this.deadline.at);
    if (isToday(date)) return this.t._('DEADLINES.TODAY');
    if (isTomorrow(date)) return this.t._('DEADLINES.TOMORROW');
    else return formatDateWithLocaleAndTimeZone(date, this.t.getCurrentLang(), this.app.configurations.timezone) ?? '';
  }
}
