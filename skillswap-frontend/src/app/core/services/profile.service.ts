import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Profile, ProfileUpdate } from '../models/profile.model';
import { UserSkill } from '../models/skill.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/profiles`;
  private readonly SKILLS_URL = `${environment.apiUrl}/skills`;

  getProfiles(params?: {
    search?: string;
    skill?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Observable<Profile[]> {
    let httpParams = new HttpParams();

    if (params?.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params?.skill) {
      httpParams = httpParams.set('skill', params.skill);
    }
    if (params?.category) {
      httpParams = httpParams.set('category', params.category);
    }
    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.offset) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }

    return this.http.get<Profile[]>(this.API_URL, { params: httpParams });
  }

  getUserSkills(userId: string): Observable<UserSkill[]> {
    return this.http.get<UserSkill[]>(`${this.SKILLS_URL}/user/${userId}`);
  }

  updateProfile(data: ProfileUpdate): Observable<Profile> {
    return this.http.put<Profile>(`${this.API_URL}/me`, data);
  }
}
