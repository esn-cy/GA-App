import { Component, Input } from '@angular/core';

import { AppService } from '@app/app.service';

import { Subject, SubjectTypes } from '@models/subject.model';

@Component({
  selector: 'app-subject',
  templateUrl: 'subject.component.html',
  styleUrls: ['subject.component.scss'],
  standalone: false
})
export class SubjectComponent {
  /**
   * The subject to show.
   */
  @Input() subject: Subject | undefined;
  /**
   * The colour of the item.
   */
  @Input() color: string | undefined;
  /**
   * The lines attribute of the item.
   */
  @Input() lines: 'full' | 'inset' | 'none' | undefined;
  /**
   * The size for the component.
   */
  @Input() size: 'default' | 'small' = 'default';

  SubjectTypes = SubjectTypes;

  constructor(public app: AppService) {}

  async openOnESNAccounts(): Promise<void> {
    if (!this.subject?.id) return;
    const url = this.subject.getURL();
    await this.app.openURL(url);
  }
}
