import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslatePipe } from '@idea-ionic/common';

import { EmailTemplateComponent } from './emailTemplate.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslatePipe],
  declarations: [EmailTemplateComponent],
  exports: [EmailTemplateComponent]
})
export class EmailTemplateModule {}
