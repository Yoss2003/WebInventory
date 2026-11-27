import { UiEmptyStateComponent } from '../../../shared/ui/components/ui-empty-state.component';
import { UiStatusComponent } from '../../../shared/ui/components/ui-status.component';
import { UiTableActionDirective } from '../../../shared/ui/directives/ui-table-action.directive';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiPageHeadingComponent } from '../../../shared/ui/components/ui-page-heading.component';
import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ModalStandardService } from '../../../shared/ui/services/modal-standard.service';
import { ConfirmationDialogService } from '../../../shared/confirm-dialog/confirmation-dialog.service';
import { CategoryService } from '../../../core/services/category';
import { Category } from '../../../core/models/category.model';
import { CategoryParentFormComponent } from '../category-parent-form/category-parent-form';
import { CategoryChildFormComponent } from '../category-child-form/category-child-form';
import { ToastService } from '../../../shared/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';

import { UiSearchComponent } from '../../../shared/ui/components/ui-search.component';
import { UiPaginationComponent } from '../../../shared/ui/components/ui-pagination/ui-pagination.component';
import { UiTablePagingDirective } from '../../../shared/ui/directives/ui-table-paging.directive';

@Component({
  selector:'app-category-list',standalone:true,
  imports:[UiEmptyStateComponent, UiStatusComponent, UiTableActionDirective, UiButtonDirective, UiPageHeadingComponent, MatTableModule,MatCardModule,MatButtonModule,MatIconModule,MatInputModule,MatCheckboxModule,FormsModule,CommonModule,UiSearchComponent,UiTablePagingDirective, UiPaginationComponent],
  templateUrl:'./category-list.html',styleUrl:'./category-list.scss',
  animations:[trigger('detailExpand',[
    state('collapsed,void',style({height:'0px',minHeight:'0'})),
    state('expanded',style({height:'*'})),
    transition('expanded <=> collapsed',animate('225ms cubic-bezier(0.4,0.0,0.2,1)'))
  ])]
})
export class CategoryListComponent implements OnInit {
  private readonly categoryService=inject(CategoryService);
  private readonly authService=inject(AuthService);
  get canManage():boolean {
    return [1, 2].includes(Number(this.authService.getSession()?.roleId));
  }
  private readonly modalStandards = inject(ModalStandardService);
  private readonly confirms=inject(ConfirmationDialogService);
  private readonly cdr=inject(ChangeDetectorRef);
  private readonly toast=inject(ToastService);
  columnsToDisplay=['expand','name','description','isActive','actions'];
  dataSource=new MatTableDataSource<Category>();
  page = 1;
  pageSize = 10;
  private readonly subcategoryPages = new Map<number, number>();
  private readonly subcategoryPageSizes = new Map<number, number>();
  getSubcategoryPage(id: number): number { return this.subcategoryPages.get(id) ?? 1; }
  getSubcategoryPageSize(id: number): number { return this.subcategoryPageSizes.get(id) ?? 10; }
  paginatedSubcategories(category: Category): Category[] {
    const rows = category.subcategorias ?? [];
    const start = (this.getSubcategoryPage(category.id) - 1) * this.getSubcategoryPageSize(category.id);
    return rows.slice(start, start + this.getSubcategoryPageSize(category.id));
  }
  setSubcategoryPage(id: number, page: number): void { this.subcategoryPages.set(id, page); }
  setSubcategoryPageSize(id: number, size: number): void { this.subcategoryPageSizes.set(id, size); this.subcategoryPages.set(id, 1); }
  get paginatedCategories(): Category[] { const start = (this.page - 1) * this.pageSize; return this.dataSource.filteredData.slice(start, start + this.pageSize); }
  expandedElement:Category|null=null;
  mostrarInactivos=false;
  loading=false;hasLoaded=false;error='';
  private rawData:Category[]=[];
  get rawDataCount():number{return this.rawData.length;}
  ngOnInit():void{this.loadData();}
  loadData():void{
    if(this.loading)return;
    this.loading=true;this.error='';this.cdr.markForCheck();
    this.categoryService.getCategories(true).subscribe({
      next:data=>{this.rawData=data;this.processData();this.loading=false;this.hasLoaded=true;this.cdr.markForCheck();},
      error:err=>{
        this.loading=false;this.hasLoaded=true;
        this.error=String(err?.error?.error??'No fue posible actualizar categorías. Los datos anteriores pueden estar desactualizados.');
        this.toast.error(this.error);this.cdr.markForCheck();
      }
    });
  }
  processData():void{
    let parents=this.rawData.filter(c=>!c.parentCategoryId);
    let children=this.rawData.filter(c=>c.parentCategoryId);
    if(!this.mostrarInactivos){parents=parents.filter(p=>p.isActive);children=children.filter(c=>c.isActive);}
    parents.forEach(p=>{
      p.subcategorias=children.filter(c=>c.parentCategoryId===p.id)
        .sort((a,b)=>a.isActive===b.isActive?0:a.isActive?-1:1);
    });
    this.dataSource.data=parents.sort((a,b)=>a.isActive===b.isActive?0:a.isActive?-1:1);
    this.cdr.markForCheck();
  }
  toggleInactivos():void{this.page=1;this.processData();}
  applyFilterText(text:string):void{this.page=1;this.dataSource.filter=text.trim().toLocaleLowerCase('es');}
  nuevaCategoriaPadre(categoriaEdit?:Category):void{
    const ref=this.modalStandards.open(CategoryParentFormComponent,'mainForm',{panelClass:'inv-seven-modal',enterAnimationDuration:260,exitAnimationDuration:220,width:'min(540px,calc(100vw - 24px))',maxWidth:'calc(100vw - 24px)',data:categoriaEdit||null});
    ref.afterClosed().subscribe(ok=>{if(ok)this.loadData();});
  }
  nuevaCategoriaHija(categoriaEdit?:Category):void{
    const parents=this.rawData.filter(p=>!p.parentCategoryId&&(p.isActive||p.id===categoriaEdit?.parentCategoryId));
    const ref=this.modalStandards.open(CategoryChildFormComponent,'wizard',{enterAnimationDuration:260,exitAnimationDuration:220,
      width:'min(700px,calc(100vw - 24px))',maxWidth:'calc(100vw - 24px)',maxHeight:'calc(100dvh - 28px)',data:{categoriaEdit:categoriaEdit||null,padres:parents}
    });
    ref.afterClosed().subscribe(ok=>{if(ok)this.loadData();});
  }
  eliminarCategoria(id:number,event:Event):void{
    event.stopPropagation();
    this.confirms.confirm({
      title:'Desactivar categoría',
      message:'¿Desactivar esta categoría? Sus artículos y movimientos históricos se conservarán.',
      confirmLabel:'Desactivar',tone:'danger',icon:'category'
    }).subscribe(confirmed=>{
      if(!confirmed)return;
      this.categoryService.deleteCategory(id).subscribe({
        next:()=>{this.toast.success('Categoría desactivada.');this.loadData();},
        error:err=>this.toast.error(String(err?.error?.error??'No se pudo desactivar la categoría.'))
      });
    });
  }
}
