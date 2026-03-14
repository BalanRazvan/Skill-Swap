import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  viewChild,
  ElementRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { MessageService } from '../../core/services/message.service';
import { Message, Conversation } from '../../core/models/message.model';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly chatMessagesRef = viewChild<ElementRef<HTMLDivElement>>('chatMessages');

  readonly conversations = signal<Conversation[]>([]);
  readonly selectedConversation = signal<Conversation | null>(null);
  readonly messages = signal<Message[]>([]);
  readonly isLoadingConversations = signal(true);
  readonly isLoadingMessages = signal(false);
  readonly isSending = signal(false);
  readonly newMessage = signal('');

  readonly currentUserId = computed(() => this.authService.currentUser()?.id);

  ngOnInit(): void {
    this.messageService.getConversations().subscribe({
      next: (conversations) => {
        this.conversations.set(conversations);
        this.isLoadingConversations.set(false);
      },
      error: () => this.isLoadingConversations.set(false),
    });
  }

  selectConversation(conversation: Conversation): void {
    if (this.selectedConversation()?.swap_id === conversation.swap_id) return;

    this.selectedConversation.set(conversation);
    this.isLoadingMessages.set(true);
    this.messages.set([]);

    this.messageService.getSwapMessages(conversation.swap_id).subscribe({
      next: (messages) => {
        this.messages.set(messages);
        this.isLoadingMessages.set(false);
        this.clearUnreadCount(conversation.swap_id);
        this.scrollToBottom();
      },
      error: () => this.isLoadingMessages.set(false),
    });
  }

  sendMessage(): void {
    const content = this.newMessage().trim();
    const conversation = this.selectedConversation();
    if (!content || !conversation || this.isSending()) return;

    this.isSending.set(true);
    this.messageService.sendMessage(conversation.swap_id, content).subscribe({
      next: (message) => {
        this.messages.update((msgs) => [...msgs, message]);
        this.newMessage.set('');
        this.isSending.set(false);
        this.updateConversationLastMessage(conversation.swap_id, message);
        this.scrollToBottom();
      },
      error: () => this.isSending.set(false),
    });
  }

  getInitial(conversation: Conversation): string {
    const name = conversation.other_user?.full_name || conversation.other_user?.username || '?';
    return name.charAt(0).toUpperCase();
  }

  getDisplayName(conversation: Conversation): string {
    return conversation.other_user?.full_name || conversation.other_user?.username || 'Unknown';
  }

  formatTime(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }

  private clearUnreadCount(swapId: string): void {
    this.conversations.update((convs) =>
      convs.map((c) => (c.swap_id === swapId ? { ...c, unread_count: 0 } : c)),
    );
  }

  private updateConversationLastMessage(swapId: string, message: Message): void {
    this.conversations.update((convs) =>
      convs.map((c) =>
        c.swap_id === swapId
          ? { ...c, last_message: message.content, last_message_at: message.created_at }
          : c,
      ),
    );
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.chatMessagesRef()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
