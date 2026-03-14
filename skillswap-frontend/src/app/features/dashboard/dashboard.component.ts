import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SwapService } from '../../core/services/swap.service';
import { ProfileService } from '../../core/services/profile.service';
import { Swap } from '../../core/models/swap.model';
import { UserSkill } from '../../core/models/skill.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly swapService = inject(SwapService);
  private readonly profileService = inject(ProfileService);

  readonly isLoading = signal(true);
  readonly userSkills = signal<UserSkill[]>([]);
  readonly swaps = signal<Swap[]>([]);

  readonly currentUser = computed(() => this.authService.currentUser());

  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user?.full_name || user?.username || 'there';
  });

  readonly teachingSkills = computed(() =>
    this.userSkills().filter((s) => s.direction === 'teaching'),
  );

  readonly learningSkills = computed(() =>
    this.userSkills().filter((s) => s.direction === 'learning'),
  );

  readonly pendingSwaps = computed(() =>
    this.swaps()
      .filter((s) => s.status === 'pending')
      .slice(0, 3),
  );

  readonly activeSwapCount = computed(
    () => this.swaps().filter((s) => s.status === 'pending' || s.status === 'accepted').length,
  );

  readonly completedSwapCount = computed(
    () => this.swaps().filter((s) => s.status === 'completed').length,
  );

  ngOnInit(): void {
    const userId = this.currentUser()?.id;
    if (!userId) {
      this.isLoading.set(false);
      return;
    }

    forkJoin({
      skills: this.profileService.getUserSkills(userId),
      swaps: this.swapService.getSwaps(),
    }).subscribe({
      next: ({ skills, swaps }) => {
        this.userSkills.set(skills);
        this.swaps.set(swaps);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  getOtherUserName(swap: Swap): string {
    const userId = this.currentUser()?.id;
    const other = swap.requester_id === userId ? swap.responder : swap.requester;
    return other.full_name || other.username || 'Unknown User';
  }

  getSwapSkillSummary(swap: Swap): string {
    const userId = this.currentUser()?.id;
    if (swap.requester_id === userId) {
      return `You teach ${swap.requester_skill.name} · Learn ${swap.responder_skill.name}`;
    }
    return `They teach ${swap.requester_skill.name} · You teach ${swap.responder_skill.name}`;
  }
}
