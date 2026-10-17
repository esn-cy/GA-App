import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslatePipe } from '@idea-ionic/common';

import { MessageBubbleComponent } from './messageBubble.component';

import { SubjectModule } from './subject.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslatePipe, SubjectModule],
  declarations: [MessageBubbleComponent],
  exports: [MessageBubbleComponent]
})
export class MessageBubbleModule {}
