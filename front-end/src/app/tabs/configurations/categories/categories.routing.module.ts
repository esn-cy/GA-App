import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CategoriesPage } from './categories.page';
import { CategoryPage } from './category.page';

const routes: Routes = [
  { path: '', component: CategoriesPage },
  { path: ':categoryId', component: CategoryPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CategoriesRoutingModule {}
