import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IDEATranslatePipe } from '@idea-ionic/common';

import { TabsComponentRoutingModule } from './tabs.routing.module';
import { TabsComponent } from './tabs.component';

@NgModule({
  imports: [IonicModule, CommonModule, FormsModule, IDEATranslatePipe, TabsComponentRoutingModule],
  declarations: [TabsComponent]
})
export class TabsModule {}
