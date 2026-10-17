import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslatePipe } from '@idea-ionic/common';

import { ArchiveRoutingModule } from './archive.routing.module';
import { ArchivePage } from './archive.page';

import { OpportunityModule } from '../opportunity.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslatePipe, ArchiveRoutingModule, OpportunityModule],
  declarations: [ArchivePage]
})
export class ArchiveModule {}
