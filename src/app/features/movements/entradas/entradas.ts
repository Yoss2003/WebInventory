import { UiEmptyStateComponent } from '../../../shared/ui/components/ui-empty-state.component';
import { UiTableActionDirective } from '../../../shared/ui/directives/ui-table-action.directive';
import { UiButtonDirective } from '../../../shared/ui/directives/ui-button.directive';
import { UiPageHeadingComponent } from '../../../shared/ui/components/ui-page-heading.component';
import { cleanArticleDisplayName } from '../../../shared/clean-article-name.pipe';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoneyPipe } from '../../../shared/money.pipe';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { TabViewTransitionDirective } from '../../../shared/ui/directives/tab-view-transition.directive';
import { MatDialog } from '@angular/material/dialog';
import { ModalStandardService } from '../../../shared/ui/services/modal-standard.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { forkJoin, filter, take, catchError, of } from 'rxjs';
import { CategoryService } from '../../../core/services/category';
import { BrandService } from '../../../core/services/brands';
import { ConfirmationDialogService } from '../../../shared/confirm-dialog/confirmation-dialog.service';
import { ArticleService } from '../../../core/services/articles';
import { InventoryContextService } from '../../../core/services/inventory-context';
import { MovementService } from '../../../core/services/movement';
import { Article } from '../../../core/models/article.model';
import { Movement } from '../../../core/models/movement.model';
import { ArticleFormComponent } from '../../articles/article-form/article-form';
import { ArticleDetailDialogComponent } from '../../articles/article-detail-dialog/article-detail-dialog';
import { MovementForm } from '../movement-form/movement-form';
import { MovementDetailDialogComponent } from '../movement-detail-dialog/movement-detail-dialog';
import { LoadingIndicatorComponent } from '../../../shared/loading/loading-indicator';

import { UiSearchComponent } from '../../../shared/ui/components/ui-search.component';
import { UiPaginationComponent } from '../../../shared/ui/components/ui-pagination/ui-pagination.component';

@Component({selector:'app-entradas',standalone:true,imports:[MoneyPipe, UiEmptyStateComponent, UiTableActionDirective, UiButtonDirective, UiPageHeadingComponent, CommonModule,MatIconModule,MatTabsModule,TabViewTransitionDirective,LoadingIndicatorComponent,UiSearchComponent,UiPaginationComponent],templateUrl:'./entradas.html',styleUrl:'./entradas.scss'})
export class EntradasComponent implements OnInit {
  private readonly dialog=inject(MatDialog);
  private readonly modalStandards = inject(ModalStandardService);
  private readonly confirms=inject(ConfirmationDialogService);
  private readonly articles=inject(ArticleService);
  private readonly inventoryContext=inject(InventoryContextService);
  private readonly movementsApi=inject(MovementService);
  private readonly toast = inject(ToastService);
  private readonly cdr=inject(ChangeDetectorRef);
  private readonly categories = inject(CategoryService);
  private readonly brands = inject(BrandService);

  selectedEntryTab=0;
  standard:Article[]=[];bulk:Article[]=[];serialized:Article[]=[];
  movements:Movement[]=[];
  private articleMap=new Map<number,Article>();
  private categoryMap = new Map<number, string>();
  private brandMap = new Map<number, string>();
  loading=false;hasLoaded=false;error='';
  search='';
  standardPage = 1; standardPageSize = 10;
  bulkPage = 1; bulkPageSize = 10;
  serializedPage = 1; serializedPageSize = 10;
  movementPage = 1; movementPageSize = 10;
  get paginatedStandard(): Article[] { const start = (this.standardPage - 1) * this.standardPageSize; return this.filteredStandard.slice(start, start + this.standardPageSize); }
  get paginatedBulk(): Article[] { const start = (this.bulkPage - 1) * this.bulkPageSize; return this.filteredBulk.slice(start, start + this.bulkPageSize); }
  get paginatedSerialized(): Article[] { const start = (this.serializedPage - 1) * this.serializedPageSize; return this.filteredSerialized.slice(start, start + this.serializedPageSize); }
  get paginatedMovements(): Movement[] { const start = (this.movementPage - 1) * this.movementPageSize; return this.filteredMovements.slice(start, start + this.movementPageSize); }
  setArticlePage(kind: 'standard' | 'bulk' | 'serialized', page: number): void { if (kind === 'standard') this.standardPage = page; else if (kind === 'bulk') this.bulkPage = page; else this.serializedPage = page; }
  setArticlePageSize(kind: 'standard' | 'bulk' | 'serialized', size: number): void { if (kind === 'standard') { this.standardPageSize = size; this.standardPage = 1; } else if (kind === 'bulk') { this.bulkPageSize = size; this.bulkPage = 1; } else { this.serializedPageSize = size; this.serializedPage = 1; } }
  resetPages(): void { this.standardPage = this.bulkPage = this.serializedPage = this.movementPage = 1; }

  private matchesQuery(values: unknown[]): boolean {
    const q = this.search.trim().toLocaleLowerCase('es');
    return !q || values.some(v => String(v ?? '').toLocaleLowerCase('es').includes(q));
  }
  private matchesArticle(a: Article): boolean {
    return this.matchesQuery([a.name, a.code, a.model, a.barcode]);
  }
  get filteredStandard(): Article[] { return this.standard.filter(a => this.matchesArticle(a)); }
  get filteredBulk(): Article[] { return this.bulk.filter(a => this.matchesArticle(a)); }
  get filteredSerialized(): Article[] { return this.serialized.filter(a => this.matchesArticle(a)); }
  get filteredMovements(): Movement[] {
    return this.movements.filter(m => this.matchesQuery([
      this.articleName(m.articleId), this.articleCode(m.articleId), m.observation
    ]));
  }
  ngOnInit():void{this.inventoryContext.activeInventoryId$.pipe(filter(id=>id!==null),take(1)).subscribe(()=>this.loadRealData());}
  loadRealData():void{
    if(this.loading)return;
    this.loading=true;this.error='';this.cdr.markForCheck();
    forkJoin({
      articles: this.articles.getArticles(),
      movements: this.movementsApi.getMovements(),
      categories: this.categories.getCategories().pipe(catchError(() => of([]))),
      brands: this.brands.getBrands().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ articles, movements, categories, brands }) => {
        this.categoryMap = new Map(categories.map(c => [Number(c.id), c.name]));
        this.brandMap = new Map(brands.map(b => [Number(b.id), b.name]));

        const inventoryArticles = articles.filter(a => a.inventoryId === this.inventoryContext.activeInventoryId);
        const active=inventoryArticles.filter(a=>a.isActive);
        const ids=new Set(inventoryArticles.map(a=>a.id));
        const type=(a:Article):number=>{
          const v=String(a.tracking ?? a.trackingMode ?? 0).toLocaleLowerCase('es');
          return v==='serialized'||v==='serializado'||v==='1'?1:v==='bulk'||v==='a granel'||v==='2'?2:0;
        };
        this.standard=active.filter(a=>type(a)===0);
        this.serialized=active.filter(a=>type(a)===1);
        this.bulk=active.filter(a=>type(a)===2);
        this.articleMap=new Map(inventoryArticles.map(a=>[a.id,a]));
        this.movements=movements.filter(m=>m.actionId===1&&ids.has(m.articleId)).sort((a,b)=>new Date(b.movementDate).getTime()-new Date(a.movementDate).getTime());
        this.loading=false;this.hasLoaded=true;this.cdr.markForCheck();
      },error:err=>{
        this.loading=false;this.hasLoaded=true;
        this.error=String(err?.error?.error??'No se pudieron cargar las entradas. Los datos anteriores pueden estar desactualizados.');
        this.toast.error(this.error);
        this.cdr.markForCheck();
      }
    });
  }
  articleName(id:number):string{return cleanArticleDisplayName(this.articleMap.get(id)?.name ?? `Artículo #${id}`);}
  articleCode(id:number):string{return this.articleMap.get(id)?.code||'—';}
  newArticle():void{this.editArticle(null);}
  editArticle(id:number|null):void{
    const ref=this.modalStandards.open(ArticleFormComponent,'mainForm',{enterAnimationDuration:260,exitAnimationDuration:220,width:'1080px',maxWidth:'calc(100vw - 24px)',maxHeight:'calc(100dvh - 24px)',disableClose:true,data:{id}});
    ref.afterClosed().subscribe((result: boolean | { created: boolean; tracking: number } | undefined)=>{
      if (!result) return;
      if (typeof result === 'object' && result.created)
        this.selectedEntryTab = result.tracking === 1 ? 2 : result.tracking === 2 ? 1 : 0;
      this.loadRealData();
    });
  }
  newEntry():void{
    const ref=this.modalStandards.open(MovementForm,'mainForm',{width:'min(600px,calc(100vw - 24px))',data:{actionId:1}});
    ref.afterClosed().subscribe(ok=>{if(ok)this.loadRealData();});
  }
  showArticle(id: number): void {
    const article = this.articleMap.get(id);
    const inv = this.inventoryContext.options.find(
      i => Number(i.id) === Number(article?.inventoryId ?? this.inventoryContext.activeInventoryId)
    ) as { name?: string; inventoryName?: string } | undefined;

    const ref = this.modalStandards.open(ArticleDetailDialogComponent, 'detail', {
      panelClass: ['inv-seven-modal', 'article-detail-wide-modal'],
      enterAnimationDuration: 260,
      exitAnimationDuration: 220,
      data: {
        id,
        articleName: article ? cleanArticleDisplayName(article.name) : undefined,
        categoryName: article ? (this.categoryMap.get(Number(article.categoryId)) || `#${article.categoryId}`) : undefined,
        brandName: article?.brandId ? (this.brandMap.get(Number(article.brandId)) || `#${article.brandId}`) : '—',
        inventoryName: inv?.name || inv?.inventoryName || undefined
      },
      width: 'min(1380px, calc(100vw - 24px))',
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 24px)'
    });

    ref.afterClosed().subscribe(changed => {
      if (changed || ref.componentInstance?.hasChanges) {
        this.loadRealData();
      }
    });
  }
  showMovement(m:Movement):void{
    this.modalStandards.open(MovementDetailDialogComponent,'detail',{panelClass:'inv-seven-modal',enterAnimationDuration:260,exitAnimationDuration:220,data:{movement:m,articleName:this.articleName(m.articleId),articleCode:this.articleCode(m.articleId)},width:'min(650px,calc(100vw - 24px))'});
  }
  deleteArticle(a:Article,event:Event):void{
    event.stopPropagation();
    this.confirms.confirm({
      title:'Dar de baja artículo',
      message:`¿Dar de baja «${a.name}»? Solo se permite con stock 0 y sin asignaciones pendientes.`,
      confirmLabel:'Dar de baja',tone:'danger',icon:'block'
    }).subscribe(confirmed=>{
      if(!confirmed)return;
      this.articles.deleteArticle(a.id).subscribe({
        next: () => { this.toast.success('Artículo dado de baja.'); this.loadRealData(); },
        error: err => this.toast.error(String(err?.error?.error ?? 'No se puede dar de baja el artículo.'))
      });
    });
  }
}
