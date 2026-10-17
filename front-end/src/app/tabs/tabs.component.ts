import { Component } from '@angular/core';

import { AppService } from '@app/app.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.component.html',
  styleUrls: ['tabs.component.scss'],
  standalone: false
})
export class TabsComponent {
  constructor(public app: AppService) {}
}
