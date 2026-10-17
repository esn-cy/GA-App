
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

import { UsefulLinksService } from './usefulLinks.service';

import { UsefulLink } from '@models/usefulLink.model';

@Component({
  imports: [FormsModule, IonicModule, IDEATranslatePipe, EventsPickerComponent],
  selector: 'app-manage-useful-link',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="medium">
        <ion-buttons slot="start">
          <ion-button [title]="'COMMON.CANCEL' | translate" (click)="close()">
            <ion-icon slot="icon-only" icon="close-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'USEFUL_LINKS.MANAGE_LINK' | translate }}</ion-title>
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
          <ion-input labelPlacement="stacked" [(ngModel)]="link.name">
            <div slot="label">
              {{ 'USEFUL_LINKS.NAME' | translate }}
              <ion-text class="obligatoryDot"></ion-text>
            </div>
          </ion-input>
        </ion-item>
        <ion-item [class.fieldHasError]="hasFieldAnError('url')">
          <ion-input labelPlacement="stacked" [(ngModel)]="link.url">
            <div slot="label">
              {{ 'USEFUL_LINKS.URL' | translate }}
              <ion-text class="obligatoryDot"></ion-text>
            </div>
          </ion-input>
        </ion-item>
        <app-events-picker
          [class.fieldHasError]="hasFieldAnError('event')"
          [editMode]="true"
          [(event)]="link.event"
        ></app-events-picker>
        @if (link.linkId) {
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
export class ManageUsefulLinkComponent {
  /**
   * The useful link to manage.
   */
  @Input({ required: true }) link!: UsefulLink;

  errors = new Set<string>();

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private t: IDEATranslationsService,
    private loading: IDEALoadingService,
    private message: IDEAMessageService,
    private _usefulLinks: UsefulLinksService
  ) {}

  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  async save(): Promise<void> {
    this.errors = new Set(this.link.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    try {
      await this.loading.show();
      let result: UsefulLink;
      if (!this.link.linkId) result = await this._usefulLinks.insert(this.link);
      else result = await this._usefulLinks.update(this.link);
      this.link.load(result);
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
        await this._usefulLinks.delete(this.link);
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
