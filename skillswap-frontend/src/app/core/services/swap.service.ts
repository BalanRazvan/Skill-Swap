import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Swap, SwapCreate, SwapStatus } from '../models/swap.model';

@Injectable({ providedIn: 'root' })
export class SwapService {
  private readonly http = inject(HttpClient);
  private readonly SWAPS_URL = `${environment.apiUrl}/swaps`;

  getSwaps(params?: { status?: SwapStatus; role?: 'requester' | 'responder' }): Observable<Swap[]> {
    let httpParams = new HttpParams();
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.role) {
      httpParams = httpParams.set('role', params.role);
    }
    return this.http.get<Swap[]>(this.SWAPS_URL, { params: httpParams });
  }

  createSwap(data: SwapCreate): Observable<Swap> {
    return this.http.post<Swap>(this.SWAPS_URL, data);
  }

  updateSwapStatus(swapId: string, status: SwapStatus): Observable<Swap> {
    return this.http.patch<Swap>(`${this.SWAPS_URL}/${swapId}/status`, { status });
  }
}
