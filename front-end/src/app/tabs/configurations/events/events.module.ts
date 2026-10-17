import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslatePipe } from '@idea-ionic/common';

import { EventsRoutingModule } from './events.routing.module';
import { EventsPage } from './events.page';
import { EventPage } from './event.page';

import { EditModeButtonsModule } from '@common/editModeButtons.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslatePipe, EventsRoutingModule, EditModeButtonsModule],
  declarations: [EventsPage, EventPage]
})
export class EventsModule {}
