import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { ISOString } from 'idea-toolbox';

import { AppService } from '@app/app.service';

@Component({
  imports: [FormsModule, IonicModule],
  selector: 'app-datetime-timezone',
  template: `
    <ion-item [lines]="lines" [color]="color">
      <ion-label position="stacked">{{ label }} @if (obligatory) {
        <ion-text class="obligatoryDot" />
      }</ion-label>
      <input
        #dateTime
        type="datetime-local"
        [disabled]="disabled"
        [value]="initialValue"
        (change)="dateChange.emit(zonedTimeStringToUTC($event.target.value))"
        />
    </ion-item>
    `
})
export class DatetimeWithTimezoneStandaloneComponent implements OnInit, OnChanges {
  /**
   * The date to manage.
   */
  @Input() date: ISOString | undefined;
  @Output() dateChange = new EventEmitter<ISOString | undefined>();
  /**
   * The timezone to consider.
   * Fallback to the default value set in the configurations.
   */
  @Input() timezone: string | undefined;
  /**
   * A label for the item.
   */
  @Input() label: string | undefined;
  /**
   * The colour of the item.
   */
  @Input() color: string | undefined;
  /**
   * The lines attribute of the item.
   */
  @Input() lines: 'full' | 'inset' | 'none' | undefined;
  /**
   * Whether the component is disabled or editable.
   */
  @Input() disabled = false;
  /**
   * Whether the date is obligatory.
   */
  @Input() obligatory = false;

  initialValue: ISOString = '';

  @ViewChild('dateTime') dateTime!: ElementRef;

  constructor(public app: AppService) {}

  async ngOnInit(): Promise<void> {
    this.timezone = this.timezone ?? this.app.configurations.timezone;
    this.initialValue = this.date ? this.utcToZonedTimeString(this.date) : '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    // fix the date if the linked timezone changes
    if (changes.timezone?.currentValue && this.dateTime) {
      setTimeout((): void => {
        this.dateChange.emit(this.zonedTimeStringToUTC(this.dateTime.nativeElement.value));
      }, 100);
    }
  }

  utcToZonedTimeString(isoString?: ISOString): string {
    if (!isoString) return '';
    return formatInTimeZone(isoString, this.timezone!, 'yyyy-MM-dd\'T\'HH:mm');
  }

  zonedTimeStringToUTC(dateLocale: string): ISOString | undefined {
    if (!dateLocale) return undefined;
    return fromZonedTime(dateLocale, this.timezone!).toISOString();
  }
}
