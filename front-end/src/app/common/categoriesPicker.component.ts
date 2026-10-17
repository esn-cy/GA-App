import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IDEATranslatePipe } from '@idea-ionic/common';

import { TopicCategoryService } from '@tabs/configurations/categories/categories.service';

import { TopicCategoryAttached } from '@models/category.model';

@Component({
  imports: [FormsModule, IonicModule, IDEATranslatePipe],
  selector: 'app-categories-picker',
  template: `
    <ion-item [lines]="lines" [color]="color">
      <ion-select
        interface="popover"
        labelPlacement="stacked"
        [compareWith]="compareWithCategory"
        [(ngModel)]="category"
        (ngModelChange)="categoryChange.emit($event)"
        [disabled]="!editMode || !categories"
      >
        <div slot="label">
          {{ 'CATEGORIES.CATEGORY' | translate }}
          @if (obligatory) {
            <ion-text class="obligatoryDot"></ion-text>
          }
        </div>
        @if (!obligatory) {
          <ion-select-option [value]="null"></ion-select-option>
        }
        @for (category of categories; track category.categoryId) {
          <ion-select-option [value]="category">
            {{ category.name }}
          </ion-select-option>
        }
      </ion-select>
    </ion-item>
  `,
  styles: []
})
export class CategoriesPickerComponent implements OnInit {
  /**
   * The category picked.
   */
  @Input() category: TopicCategoryAttached | null | undefined;
  @Output() categoryChange = new EventEmitter<TopicCategoryAttached | null | undefined>();
  /**
   * The colour of the item.
   */
  @Input() color: string | undefined;
  /**
   * The lines attribute of the item.
   */
  @Input() lines: 'full' | 'inset' | 'none' | undefined;
  /**
   * Whether the component is editable.
   */
  @Input() editMode = false;
  /**
   * Whether picking the category is obligatory.
   */
  @Input() obligatory = false;

  categories: TopicCategoryAttached[] | undefined;

  constructor(private _categories: TopicCategoryService) {}

  async ngOnInit(): Promise<void> {
    this.categories = await this._categories.getList();
  }

  compareWithCategory(c1: TopicCategoryAttached, c2: TopicCategoryAttached): boolean {
    return c1 && c2 ? c1.categoryId === c2.categoryId : c1 === c2;
  }
}
