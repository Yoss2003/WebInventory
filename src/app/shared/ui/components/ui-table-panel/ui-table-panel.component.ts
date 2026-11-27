import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-table-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ui-table-panel.component.html',
  styleUrl: './ui-table-panel.component.scss'
})
export class UiTablePanelComponent {
  @Input() mode: 'fill' | 'content' = 'fill';
  @Input() loading = false;
  @Input() skeletonRows = 5;
  @Input() label = 'registros';
  readonly skeletonItems = [0, 1, 2, 3, 4, 5];
}