import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { IDEATranslatePipe } from '@idea-ionic/common';

import { VoteRoutingModule } from './vote.routing.module';
import { VotePage } from './vote.page';

import { HTMLEditorModule } from '@common/htmlEditor.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslatePipe, VoteRoutingModule, HTMLEditorModule],
  declarations: [VotePage]
})
export class VoteModule {}
