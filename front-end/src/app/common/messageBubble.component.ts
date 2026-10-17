import { Component, Input, OnChanges, SecurityContext, SimpleChanges } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { AppService } from '@app/app.service';

import { Subject } from '@models/subject.model';

@Component({
  selector: 'app-message-bubble',
  templateUrl: 'messageBubble.component.html',
  styleUrls: ['messageBubble.component.scss'],
  standalone: false
})
export class MessageBubbleComponent implements OnChanges {
  /**
   * The text to show; if undefined, load a skeleton instead.
   */
  @Input() text: string | undefined;
  /**
   * The creator of the text.
   */
  @Input() creator: Subject | undefined;
  /**
   * Whether the creator of the text is the sender.
   */
  @Input() isSender = false;

  sanitizedHtml: string | undefined;

  constructor(private sanitizer: DomSanitizer, public app: AppService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.text?.currentValue) this.sanitizedHtml = this.sanitizer.sanitize(SecurityContext.HTML, this.text ?? '') ?? undefined;
  }
}
