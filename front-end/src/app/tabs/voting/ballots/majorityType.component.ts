import { Component, Input } from '@angular/core';

import { IonicModule } from '@ionic/angular';
import { IDEATranslatePipe } from '@idea-ionic/common';

@Component({
  imports: [IonicModule, IDEATranslatePipe],
  selector: 'app-voting-majority-type',
  template: `
    <ion-content class="ion-padding">
      <p>
        {{ 'VOTING.MAJORITY_TYPES.' + majorityType + '_I' | translate }}
      </p>
    </ion-content>
  `,
  styles: [
    `
      p {
        font-size: 0.9em;
      }
    `
  ]
})
export class MajorityTypeStandaloneComponent {
  /**
   * The majority type to show.
   */
  @Input({ required: true }) majorityType!: string;
}
