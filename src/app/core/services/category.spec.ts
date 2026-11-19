import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoryService } from './category';
import { API_URL } from '../config/api.config';
import { Category } from '../models/category.model';

describe('CategoryService', () => {
  let service: CategoryService;
  let httpMock: HttpTestingController;
  const baseUrl = `${API_URL}/Categories`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CategoryService]
    });
    service = TestBed.inject(CategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('consulta categorías usando API_URL y reutiliza la caché', () => {
    const mockData = [{ id: 1, name: 'Electrónicos' }] as Category[];
    let firstResult: Category[] = [];
    let secondResult: Category[] = [];

    service.getCategories().subscribe(data => (firstResult = data));
    service.getCategories().subscribe(data => (secondResult = data));

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);

    expect(firstResult).toEqual(mockData);
    expect(secondResult).toEqual(mockData);
  });

  it('crea una categoría con allowSimilar e invalida la caché', () => {
    const payload = { name: 'Accesorios' } as Partial<Category>;
    const created = { id: 2, name: 'Accesorios' } as Category;

    service.createCategory(payload, true).subscribe(res => {
      expect(res).toEqual(created);
    });

    const postReq = httpMock.expectOne(`${baseUrl}?allowSimilar=true`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual(payload);
    postReq.flush(created);

    service.getCategories().subscribe();
    const getReq = httpMock.expectOne(baseUrl);
    expect(getReq.request.method).toBe('GET');
    getReq.flush([created]);
  });

  it('actualiza y elimina categorías contra el endpoint central', () => {
    const category = { id: 5, name: 'Audio' } as Category;

    service.updateCategory(category).subscribe();
    const putReq = httpMock.expectOne(`${baseUrl}/5`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush(null);

    service.deleteCategory(5).subscribe();
    const delReq = httpMock.expectOne(`${baseUrl}/5`);
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null);
  });
});