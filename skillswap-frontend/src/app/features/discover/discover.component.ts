import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { ProfileService } from '../../core/services/profile.service';
import { Profile } from '../../core/models/profile.model';
import { UserSkill } from '../../core/models/skill.model';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export interface DiscoverCard {
  profile: Profile;
  teachingSkills: UserSkill[];
  learningSkills: UserSkill[];
}

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [],
  templateUrl: './discover.component.html',
  styleUrl: './discover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoverComponent implements OnInit {
  private readonly profileService = inject(ProfileService);

  readonly cards = signal<DiscoverCard[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly selectedCardId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProfiles();
  }

  toggleCard(profileId: string): void {
    if (this.selectedCardId() === profileId) {
      this.selectedCardId.set(null);
    } else {
      this.selectedCardId.set(profileId);
    }
  }

  private loadProfiles(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.profileService.getProfiles().pipe(
      switchMap((profiles) => {
        if (profiles.length === 0) {
          return of([]);
        }

        const skillRequests = profiles.map((profile) =>
          this.profileService.getUserSkills(profile.id)
        );

        return forkJoin(skillRequests).pipe(
          switchMap((allSkills) => {
            const cards: DiscoverCard[] = profiles.map((profile, index) => {
              const skills = allSkills[index];
              return {
                profile,
                teachingSkills: skills.filter((s) => s.direction === 'teaching'),
                learningSkills: skills.filter((s) => s.direction === 'learning'),
              };
            });
            return of(cards);
          })
        );
      })
    ).subscribe({
      next: (cards) => {
        this.cards.set(cards);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load profiles. Is the backend running?');
        this.isLoading.set(false);
      },
    });
  }

  getInitial(profile: Profile): string {
    if (profile.full_name) {
      return profile.full_name.charAt(0).toUpperCase();
    }
    if (profile.username) {
      return profile.username.charAt(0).toUpperCase();
    }
    return '?';
  }

  getDisplayName(profile: Profile): string {
    return profile.full_name || profile.username || 'Unknown User';
  }

  getLocation(profile: Profile): string {
    return profile.location || 'No location set';
  }
}
