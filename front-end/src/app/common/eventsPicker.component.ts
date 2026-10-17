import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslatePipe } from '@idea-ionic/common';

import { GAEventsService } from '@tabs/configurations/events/events.service';

import { GAEvent, GAEventAttached } from '@models/event.model';

@Component({
  imports: [FormsModule, IonicModule, IDEATranslatePipe],
  selector: 'app-events-picker',
  template: `
    <ion-item [lines]="lines" [color]="color">
      <ion-select
        interface="popover"
        labelPlacement="stacked"
        [compareWith]="compareWithEvent"
        [(ngModel)]="event"
        (ngModelChange)="eventChange.emit($event)"
        [disabled]="!editMode || !events"
      >
        <div slot="label">
          {{ 'EVENTS.EVENT' | translate }}
          @if (obligatory) {
            <ion-text class="obligatoryDot"></ion-text>
          }
        </div>
        @if (!obligatory) {
          <ion-select-option [value]="null"></ion-select-option>
        }
        @for (event of events; track event.eventId) {
          <ion-select-option [value]="event">{{ event.name }}</ion-select-option>
        }
      </ion-select>
    </ion-item>
  `,
  styles: []
})
export class EventsPickerComponent implements OnInit {
  /**
   * The event picked.
   */
  @Input() event: GAEventAttached | null | undefined;
  @Output() eventChange = new EventEmitter<GAEventAttached | null | undefined>();
  /**
   * The colour of the item.
   */
  @Input() color: string | undefined;
  /**
   * The lines attribute of the item.
   */
  @Input() lines: 'full' | 'inset' | 'none' | undefined;
  /**
   * Whether the component is editable.
   */
  @Input() editMode = false;
  /**
   * Whether picking the event is obligatory.
   */
  @Input() obligatory = false;

  events: GAEvent[] | undefined;

  constructor(private _events: GAEventsService) {}

  async ngOnInit(): Promise<void> {
    this.events = await this._events.getList();
  }

  compareWithEvent(e1: GAEventAttached, e2: GAEventAttached): boolean {
    return e1 && e2 ? e1.eventId === e2.eventId : e1 === e2;
  }
}
