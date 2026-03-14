import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Message, Conversation } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = `${environment.apiUrl}/messages`;

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.BASE_URL}/conversations`);
  }

  getSwapMessages(swapId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.BASE_URL}/swap/${swapId}`);
  }

  sendMessage(swapId: string, content: string): Observable<Message> {
    return this.http.post<Message>(this.BASE_URL, { swap_id: swapId, content });
  }
}
