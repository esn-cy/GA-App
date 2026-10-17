import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslatePipe } from '@idea-ionic/common';

import { AuthRoutingModule } from './auth-routing.module';
import { AuthPage } from './auth.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, IDEATranslatePipe, AuthRoutingModule],
  declarations: [AuthPage]
})
export class AuthModule {}
