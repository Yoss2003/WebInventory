import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface ArticleSupplierReference {
  id: number;
  inventoryId?: number;
  companyId?: number;
  ruc: string;
  businessName: string;
  isActive: boolean;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  statusId?: number;
  estado?: string | null;
  condicion?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  relationshipDescription?: string | null;
  fiscalDataJson?: string | null;
  lookupFromCache?: boolean;
  reused?: boolean;
}

export interface ArticleParameterReference {
  id: number;
  inventoryId: number;
  companyId: number;
  parameterType: string;
  name: string;
  description?: string | null;
}

export interface CurrencyReference {
  id: number;
  currencyCode: string | null;
  currencyName: string;
}

export interface ExchangeRateReference {
  id: number;
  baseCurrency: string;
  quoteCurrency: string;
  buyPrice: number;
  sellPrice: number;
  date: string;
}

/** Catálogos de referencia del formulario de artículos. */
@Injectable({ providedIn: 'root' })
export class ArticleReferenceDataService {
  private readonly http = inject(HttpClient);

  suppliers(): Observable<ArticleSupplierReference[]> {
    return this.http.get<ArticleSupplierReference[]>(`${API_URL}/Suppliers`);
  }

  lookupSupplierRuc(ruc: string): Observable<Partial<ArticleSupplierReference>> {
    return this.http.get<Partial<ArticleSupplierReference>>(
      `${API_URL}/Suppliers/ruc/${encodeURIComponent(ruc)}`
    );
  }

  createSupplier(input: Partial<ArticleSupplierReference> & { inventoryId: number }): Observable<ArticleSupplierReference> {
    return this.http.post<ArticleSupplierReference>(`${API_URL}/Suppliers`, input);
  }

  updateSupplier(id: number, input: Partial<ArticleSupplierReference>): Observable<void> {
    return this.http.put<void>(`${API_URL}/Suppliers/${id}`, input);
  }

  parameters(): Observable<ArticleParameterReference[]> {
    return this.http.get<ArticleParameterReference[]>(`${API_URL}/Parameters`);
  }

  currencies(): Observable<CurrencyReference[]> {
    return this.http.get<CurrencyReference[]>(`${API_URL}/Currencies`);
  }

  todayExchangeRate(currency: 'USD' | 'EUR'): Observable<ExchangeRateReference> {
    return this.http.get<ExchangeRateReference>(`${API_URL}/ExchangeRates/today/${currency}`);
  }
}
