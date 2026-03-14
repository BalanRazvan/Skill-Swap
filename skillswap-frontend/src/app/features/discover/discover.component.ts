import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './discover.component.html',
  styleUrl: './discover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoverComponent {}
