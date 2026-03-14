import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../core/services/profile.service';
import { SwapService } from '../../core/services/swap.service';
import { AuthService } from '../../core/services/auth.service';
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
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './discover.component.html',
  styleUrl: './discover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoverComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly swapService = inject(SwapService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly cards = signal<DiscoverCard[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly selectedCardId = signal<string | null>(null);

  readonly isAuthenticated = computed(() => this.authService.isAuthenticated());
  readonly currentUserTeachingSkills = signal<UserSkill[]>([]);
  readonly isLoadingUserSkills = signal(false);
  readonly swapRequestCardId = signal<string | null>(null);
  readonly isSubmittingSwap = signal(false);
  readonly swapSuccessCardId = signal<string | null>(null);
  readonly swapError = signal('');

  readonly swapForm = this.fb.nonNullable.group({
    requesterSkillId: ['', Validators.required],
    responderSkillId: ['', Validators.required],
    message: [''],
  });

  ngOnInit(): void {
    this.loadProfiles();
  }

  toggleCard(profileId: string): void {
    if (this.selectedCardId() === profileId) {
      this.selectedCardId.set(null);
      this.swapRequestCardId.set(null);
    } else {
      this.selectedCardId.set(profileId);
      this.swapRequestCardId.set(null);
      this.swapSuccessCardId.set(null);
    }
  }

  openSwapRequest(cardId: string): void {
    this.swapForm.reset();
    this.swapError.set('');
    this.swapRequestCardId.set(cardId);

    if (this.currentUserTeachingSkills().length === 0) {
      const user = this.authService.currentUser();
      if (user) {
        this.isLoadingUserSkills.set(true);
        this.profileService.getUserSkills(user.id).subscribe({
          next: (skills) => {
            this.currentUserTeachingSkills.set(
              skills.filter((s) => s.direction === 'teaching')
            );
            this.isLoadingUserSkills.set(false);
          },
          error: () => {
            this.isLoadingUserSkills.set(false);
          },
        });
      }
    }
  }

  cancelSwapRequest(): void {
    this.swapRequestCardId.set(null);
    this.swapForm.reset();
    this.swapError.set('');
  }

  submitSwapRequest(card: DiscoverCard): void {
    if (this.swapForm.invalid) return;

    this.isSubmittingSwap.set(true);
    this.swapError.set('');

    const { requesterSkillId, responderSkillId, message } = this.swapForm.getRawValue();

    this.swapService.createSwap({
      responder_id: card.profile.id,
      requester_skill_id: requesterSkillId,
      responder_skill_id: responderSkillId,
      message,
    }).subscribe({
      next: () => {
        this.isSubmittingSwap.set(false);
        this.swapRequestCardId.set(null);
        this.swapSuccessCardId.set(card.profile.id);
        this.swapForm.reset();
      },
      error: (err) => {
        this.isSubmittingSwap.set(false);
        if (err.status === 409) {
          this.swapError.set('You already have a swap request for these skills with this user.');
        } else if (err.status === 400) {
          this.swapError.set(err.error?.detail || 'Invalid request.');
        } else {
          this.swapError.set('Failed to send swap request. Please try again.');
        }
      },
    });
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
        const currentUser = this.authService.currentUser();
        const filtered = currentUser
          ? cards.filter((c) => c.profile.id !== currentUser.id)
          : cards;
        this.cards.set(filtered);
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
