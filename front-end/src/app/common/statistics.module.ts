import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { IDEATranslatePipe } from '@idea-ionic/common';

import { StatisticsButtonComponent, StatisticsComponent } from './statistics.component';
import { DateTimezonePipe } from './dateTimezone.pipe';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslatePipe, DateTimezonePipe],
  declarations: [StatisticsComponent, StatisticsButtonComponent],
  exports: [StatisticsComponent, StatisticsButtonComponent]
})
export class StatisticsModule {}
