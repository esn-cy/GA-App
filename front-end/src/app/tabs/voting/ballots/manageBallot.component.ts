import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, Input, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { IDEAMessageService, IDEAShowHintButtonComponent, IDEATranslatePipe } from '@idea-ionic/common';

import { AppService } from '@app/app.service';

import { VotingBallot, VotingMajorityTypes } from '@models/votingSession.model';

@Component({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslatePipe, IDEAShowHintButtonComponent],
  selector: 'app-manage-ballot',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar color="medium">
        <ion-buttons slot="start">
          <ion-button [title]="'COMMON.CANCEL' | translate" (click)="close()">
            <ion-icon slot="icon-only" icon="close-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ 'VOTING.MANAGE_BALLOT' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button [title]="'COMMON.SAVE' | translate" (click)="save()">
            <ion-icon slot="icon-only" icon="checkmark-circle"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list class="aList" lines="full">
        <ion-item [class.fieldHasError]="hasFieldAnError('text')">
          <ion-input labelPlacement="stacked" [(ngModel)]="ballot.text">
            <div slot="label">
              {{ 'VOTING.BALLOT_TEXT' | translate }}
              <ion-text class="obligatoryDot" />
            </div>
          </ion-input>
        </ion-item>
        <ion-item [class.fieldHasError]="hasFieldAnError('majorityType')">
          <ion-select interface="popover" labelPlacement="stacked" [(ngModel)]="ballot.majorityType">
            <div slot="label">
              {{ 'VOTING.BALLOT_MAJORITY' | translate }}
              <ion-text class="obligatoryDot" />
            </div>
            @for (mt of MajorityTypes | keyvalue; track mt.key) {
              <ion-select-option [value]="mt.value">
                {{ 'VOTING.MAJORITY_TYPES.' + mt.key | translate }}
              </ion-select-option>
            }
          </ion-select>
          <idea-show-hint-button
            slot="end"
            class="ion-margin-top"
            [hint]="'VOTING.MAJORITY_TYPES.' + ballot.majorityType"
            translate
          />
        </ion-item>
        <ion-item-divider [class.fieldHasError]="hasFieldAnError('options')">
          <ion-label>{{ 'VOTING.BALLOT_OPTIONS' | translate }} <ion-text class="obligatoryDot" /></ion-label>
          <ion-button slot="end" fill="clear" (click)="addOption()">{{ 'COMMON.ADD' | translate }}</ion-button>
        </ion-item-divider>
        @if (!ballot.options.length) {
          <ion-item class="noElements">
            <ion-label>{{ 'COMMON.NO_ELEMENTS' | translate }}</ion-label>
          </ion-item>
        }
        <ion-reorder-group [disabled]="false" (ionItemReorder)="handleOptionsReorder($event)">
          @for (option of ballot.options; track $index; let index = $index) {
            <ion-item>
              <ion-reorder slot="start"></ion-reorder>
              <ion-badge slot="start" color="light">{{ index + 1 }}</ion-badge>
              <ion-input [attr.aria-label]="'VOTING.BALLOT_OPTIONS' | translate" [(ngModel)]="ballot.options[index]" />
              <ion-button slot="end" color="danger" fill="clear" (click)="removeOptionByIndex(index)">
                <ion-icon icon="trash-outline" slot="icon-only" />
              </ion-button>
            </ion-item>
          }
        </ion-reorder-group>
        <ion-item>
          <ion-badge slot="start" color="light">{{ ballot.options.length + 1 }}</ion-badge>
          <ion-input [attr.aria-label]="'VOTING.ABSTAIN' | translate" [readonly]="true"
                     [value]="'VOTING.ABSTAIN' | translate" />
        </ion-item>
      </ion-list>
    </ion-content>
  `
})
export class ManageBallotStandaloneComponent implements OnInit {
  /**
   * The voting ballot to manage.
   */
  @Input({ required: true }) ballot!: VotingBallot;

  errors = new Set<string>();

  MajorityTypes = VotingMajorityTypes;

  constructor(private modalCtrl: ModalController, private message: IDEAMessageService, public app: AppService) {}

  ngOnInit(): void {
    this.ballot = new VotingBallot(this.ballot);
  }

  hasFieldAnError(field: string): boolean {
    return this.errors.has(field);
  }

  addOption(): void {
    this.ballot.options.push('');
  }

  handleOptionsReorder({ detail }: CustomEvent): void {
    this.ballot.options = detail.complete(this.ballot.options);
  }

  removeOptionByIndex(index: number): void {
    this.ballot.options.splice(index, 1);
  }

  trackByIndex(index: number): number {
    return index;
  }

  async save(): Promise<void> {
    this.errors = new Set(this.ballot.validate());
    if (this.errors.size) return this.message.error('COMMON.FORM_HAS_ERROR_TO_CHECK');

    this.ballot.options = this.ballot.options.filter(x => x?.trim());
    await this.modalCtrl.dismiss(this.ballot);
  }

  close(): void {
    void this.modalCtrl.dismiss();
  }
}
