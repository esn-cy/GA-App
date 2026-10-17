import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { IDEATranslatePipe } from '@idea-ionic/common';

import { AttachmentsComponent } from './attachments.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslatePipe],
  declarations: [AttachmentsComponent],
  exports: [AttachmentsComponent]
})
export class AttachmentsModule {}
