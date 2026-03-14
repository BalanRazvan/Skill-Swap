// src/app/features/edit-profile/edit-profile.component.ts
import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { Skill, SkillDirection, UserSkill } from '../../core/models/skill.model';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;
  readonly userSkills = signal<UserSkill[]>([]);
  readonly isLoadingSkills = signal(false);
  readonly isSaving = signal(false);
  readonly showAddSkillForm = signal(false);

  // Skill search state
  readonly skillSearchQuery = signal('');
  readonly skillSearchResults = signal<Skill[]>([]);
  readonly selectedSkill = signal<Skill | null>(null);
  readonly isSearching = signal(false);

  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  readonly teachingSkills = computed(() =>
    this.userSkills().filter((s) => s.direction === 'teaching')
  );

  readonly learningSkills = computed(() =>
    this.userSkills().filter((s) => s.direction === 'learning')
  );

  readonly addSkillDirection = signal<SkillDirection>('teaching');
  readonly isAddingTeaching = computed(() => this.addSkillDirection() === 'teaching');

  readonly proficiencyDots = [1, 2, 3, 4, 5];

  readonly profileForm = this.fb.nonNullable.group({
    full_name: [''],
    username: [''],
    bio: [''],
    location: [''],
    avatar_url: [''],
  });

  readonly addSkillForm = this.fb.nonNullable.group({
    direction: ['teaching'],
    proficiency_level: [3],
    description: [''],
  });

  ngOnInit(): void {
    const user = this.currentUser();

    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.profileForm.patchValue({
      full_name: user.full_name ?? '',
      username: user.username ?? '',
      bio: user.bio ?? '',
      location: user.location ?? '',
      avatar_url: user.avatar_url ?? '',
    });

    this.loadSkills(user.id);

    this.addSkillForm.get('direction')?.valueChanges.subscribe((val) => {
      this.addSkillDirection.set(val as SkillDirection);
    });
  }

  onSkillSearchChange(query: string): void {
    this.skillSearchQuery.set(query);
    this.selectedSkill.set(null);

    if (this.searchDebounce) clearTimeout(this.searchDebounce);

    if (!query.trim()) {
      this.skillSearchResults.set([]);
      return;
    }

    this.searchDebounce = setTimeout(() => {
      this.isSearching.set(true);
      this.profileService.getSkills({ search: query }).subscribe({
        next: (skills) => {
          this.skillSearchResults.set(skills);
          this.isSearching.set(false);
        },
        error: () => this.isSearching.set(false),
      });
    }, 300);
  }

  onSelectSkill(skill: Skill): void {
    this.selectedSkill.set(skill);
    this.skillSearchQuery.set(skill.name);
    this.skillSearchResults.set([]);
  }

  onAddSkill(): void {
    const skill = this.selectedSkill();
    if (!skill) return;

    const { direction, proficiency_level, description } = this.addSkillForm.getRawValue();

    this.profileService.addUserSkill({
      skill_id: skill.id,
      direction: direction as SkillDirection,
      proficiency_level: direction === 'teaching' ? proficiency_level : undefined,
      description: description || undefined,
    }).subscribe({
      next: (newUserSkill) => {
        this.userSkills.update((skills) => [...skills, newUserSkill]);
        this.resetAddSkillForm();
      },
    });
  }

  onRemoveSkill(userSkillId: string): void {
    this.profileService.deleteUserSkill(userSkillId).subscribe({
      next: () => {
        this.userSkills.update((skills) => skills.filter((s) => s.id !== userSkillId));
      },
    });
  }

  onSaveProfile(): void {
    if (this.profileForm.invalid) return;

    this.isSaving.set(true);
    this.profileService.updateProfile(this.profileForm.getRawValue()).subscribe({
      next: () => {
        this.authService.refreshProfile();
        this.isSaving.set(false);
        this.router.navigate(['/profile']);
      },
      error: () => this.isSaving.set(false),
    });
  }

  private loadSkills(userId: string): void {
    this.isLoadingSkills.set(true);
    this.profileService.getUserSkills(userId).subscribe({
      next: (skills) => {
        this.userSkills.set(skills);
        this.isLoadingSkills.set(false);
      },
      error: () => this.isLoadingSkills.set(false),
    });
  }

  private resetAddSkillForm(): void {
    this.showAddSkillForm.set(false);
    this.addSkillForm.reset({ direction: 'teaching', proficiency_level: 3 });
    this.addSkillDirection.set('teaching');
    this.skillSearchQuery.set('');
    this.selectedSkill.set(null);
    this.skillSearchResults.set([]);
  }
}
