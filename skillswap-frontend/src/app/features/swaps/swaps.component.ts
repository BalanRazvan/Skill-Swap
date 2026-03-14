import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { SwapService } from '../../core/services/swap.service';
import { AuthService } from '../../core/services/auth.service';
import { Swap, SwapStatus } from '../../core/models/swap.model';

@Component({
  selector: 'app-swaps',
  standalone: true,
  imports: [TitleCasePipe, DatePipe],
  templateUrl: './swaps.component.html',
  styleUrls: ['./swaps.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwapsComponent implements OnInit {
  private readonly swapService = inject(SwapService);
  private readonly authService = inject(AuthService);

  readonly tabs = ['all', 'pending', 'accepted', 'completed', 'declined'] as const;
  readonly activeTab = signal<string>('all');
  readonly swaps = signal<Swap[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? '');

  readonly filteredSwaps = computed(() => {
    const tab = this.activeTab();
    const list = this.swaps();
    if (tab === 'all') return list;
    if (tab === 'declined') {
      return list.filter((s) => s.status === 'declined' || s.status === 'cancelled');
    }
    return list.filter((s) => s.status === tab);
  });

  readonly counts = computed(() => {
    const list = this.swaps();
    return {
      all: list.length,
      pending: list.filter((s) => s.status === 'pending').length,
      accepted: list.filter((s) => s.status === 'accepted').length,
      completed: list.filter((s) => s.status === 'completed').length,
      declined: list.filter((s) => s.status === 'declined' || s.status === 'cancelled').length,
    } as Record<string, number>;
  });

  ngOnInit(): void {
    this.loadSwaps();
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
  }

  getDirection(swap: Swap): 'sent' | 'received' {
    return swap.requester_id === this.currentUserId() ? 'sent' : 'received';
  }

  getOtherUserInitial(swap: Swap): string {
    const user = this.getDirection(swap) === 'sent' ? swap.responder : swap.requester;
    if (user.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user.username) return user.username.charAt(0).toUpperCase();
    return '?';
  }

  getOtherUserName(swap: Swap): string {
    const user = this.getDirection(swap) === 'sent' ? swap.responder : swap.requester;
    return user.full_name || user.username || 'Unknown User';
  }

  acceptSwap(swap: Swap): void {
    this.updateStatus(swap.id, 'accepted');
  }

  declineSwap(swap: Swap): void {
    this.updateStatus(swap.id, 'declined');
  }

  withdrawSwap(swap: Swap): void {
    this.updateStatus(swap.id, 'cancelled');
  }

  markComplete(swap: Swap): void {
    this.updateStatus(swap.id, 'completed');
  }

  cancelAccepted(swap: Swap): void {
    this.updateStatus(swap.id, 'cancelled');
  }

  private loadSwaps(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.swapService.getSwaps().subscribe({
      next: (swaps) => {
        this.swaps.set(swaps);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load swaps. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  private updateStatus(swapId: string, status: SwapStatus): void {
    this.swapService.updateSwapStatus(swapId, status).subscribe({
      next: () => this.loadSwaps(),
      error: (err) => {
        const detail = err.error?.detail || 'Failed to update swap status.';
        this.errorMessage.set(detail);
      },
    });
  }
}
