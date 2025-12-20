import { Component, NgModule } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-meters',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './meters.html',
  styleUrl: './meters.scss',
})
export class Meters { }
