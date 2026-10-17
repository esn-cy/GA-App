import { Component } from '@angular/core';

import { registerIcons } from './icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent {
  constructor() {
    registerIcons();
  }
}
