import { CommonModule } from '@angular/common';
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  Signal,
} from '@angular/core';

type SwapStatus = 'pending' | 'accepted' | 'completed' | 'declined';

interface Swap {
  id: number;
  userName: string;
  avatarLetter: string;
  yourSkill: string;
  theirSkill: string;
  status: SwapStatus;
  direction: 'sent' | 'received';
  message?: string;
  date?: string;
}

@Component({
  selector: 'app-swaps',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './swaps.component.html',
  styleUrls: ['./swaps.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwapsComponent {
  readonly tabs = ['all', 'pending', 'accepted', 'completed', 'declined'] as const;

  activeTab = signal<typeof this.tabs[number]>('all');

  private initialSwaps: Swap[] = [
    {
      id: 1,
      userName: 'Miguel Alvarez',
      avatarLetter: 'M',
      yourSkill: 'Photoshop',
      theirSkill: 'Spanish (conversational)',
      status: 'pending',
      direction: 'received',
      message: 'Would love a 1-hour intro session',
      date: '2026-03-10',
    },
    {
      id: 2,
      userName: 'Sophie Chen',
      avatarLetter: 'S',
      yourSkill: 'Guitar (beginner)',
      theirSkill: 'Web Design',
      status: 'accepted',
      direction: 'sent',
      message: 'Looking forward to starting next week',
      date: '2026-02-25',
    },
    {
      id: 3,
      userName: 'Alex Kim',
      avatarLetter: 'A',
      yourSkill: 'Illustrator',
      theirSkill: 'Japanese (beginner)',
      status: 'completed',
      direction: 'received',
      message: 'Great session — thanks!',
      date: '2026-01-05',
    },
    {
      id: 4,
      userName: 'Priya Patel',
      avatarLetter: 'P',
      yourSkill: 'Yoga',
      theirSkill: 'Nutrition Basics',
      status: 'declined',
      direction: 'sent',
      message: 'Schedule conflict — declined',
      date: '2026-03-01',
    },
    {
      id: 5,
      userName: 'Noah Brown',
      avatarLetter: 'N',
      yourSkill: 'React.js',
      theirSkill: 'Guitar (intermediate)',
      status: 'pending',
      direction: 'sent',
      message: "I'll teach a 2-hour walkthrough",
      date: '2026-03-12',
    },
    {
      id: 6,
      userName: 'Lina Rossi',
      avatarLetter: 'L',
      yourSkill: 'Photography',
      theirSkill: 'Cooking (Italian)',
      status: 'accepted',
      direction: 'received',
      message: 'We agreed on weekend sessions',
      date: '2026-02-20',
    },
  ];

  swaps = signal<Swap[]>([...this.initialSwaps]);

  filteredSwaps = computed(() => {
    const t = this.activeTab();
    const list = this.swaps();
    if (t === 'all') return list;
    return list.filter((s) => s.status === t);
  });

  counts = computed(() => {
    const list = this.swaps();
    return {
      all: list.length,
      pending: list.filter((s) => s.status === 'pending').length,
      accepted: list.filter((s) => s.status === 'accepted').length,
      completed: list.filter((s) => s.status === 'completed').length,
      declined: list.filter((s) => s.status === 'declined').length,
    } as Record<string, number>;
  });

  setTab(tab: typeof this.tabs[number]) {
    this.activeTab.set(tab);
  }

  trackById(_index: number, item: Swap) {
    return item.id;
  }

  acceptSwap(id: number) {
    this.swaps.update((list) =>
      list.map((s) => (s.id === id ? { ...s, status: 'accepted' } : s))
    );
  }

  declineSwap(id: number) {
    this.swaps.update((list) =>
      list.map((s) => (s.id === id ? { ...s, status: 'declined' } : s))
    );
  }

  markComplete(id: number) {
    this.swaps.update((list) =>
      list.map((s) => (s.id === id ? { ...s, status: 'completed' } : s))
    );
  }

  removeSwap(id: number) {
    this.swaps.update((list) => list.filter((s) => s.id !== id));
  }

  messageSwap(swap: Swap) {
    console.log('Message', swap);
  }
}
