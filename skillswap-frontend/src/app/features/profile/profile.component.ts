import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { UserSkill } from '../../core/models/skill.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);

  readonly currentUser = this.authService.currentUser;
  readonly isAuthLoading = this.authService.isLoading;
  readonly isAuthenticated = this.authService.isAuthenticated;

  readonly skills = signal<UserSkill[]>([]);
  readonly isLoadingSkills = signal(false);

  readonly teachingSkills = computed(() =>
    this.skills().filter((s) => s.direction === 'teaching'),
  );

  readonly learningSkills = computed(() =>
    this.skills().filter((s) => s.direction === 'learning'),
  );

  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user?.full_name || user?.username || 'User';
  });

  readonly initial = computed(() => {
    const name = this.currentUser()?.full_name || this.currentUser()?.username;
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  readonly proficiencyDots = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    const user = this.currentUser();
    if (user) {
      this.loadSkills(user.id);
    }
  }

  onLogout(): void {
    this.authService.logout();
  }

  private loadSkills(userId: string): void {
    this.isLoadingSkills.set(true);

    this.profileService.getUserSkills(userId).subscribe({
      next: (skills) => {
        this.skills.set(skills);
        this.isLoadingSkills.set(false);
      },
      error: () => {
        this.isLoadingSkills.set(false);
      },
    });
  }
}
