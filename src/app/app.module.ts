// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
// import { VideoChatComponent } from './components/video-chat/video-chat.component';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import {RouterOutlet} from "@angular/router";
import {VideoChatComponent} from "./video-chat/video-chat.component";
import {NgOptimizedImage} from "@angular/common";
import {NgIconsModule} from "@ng-icons/core";
import {MatCardModule} from '@angular/material/card';

const config: SocketIoConfig = { url: 'http://localhost:3000', options: {
  extraHeaders: {
    'Access-Control-Allow-Origin': '*',
  }
  } };

@NgModule({
  declarations: [
    AppComponent,
    VideoChatComponent
  ],
  imports: [
    BrowserModule,
    SocketIoModule.forRoot(config),
    RouterOutlet,
    NgOptimizedImage,
    NgIconsModule.withIcons({  }),
    MatCardModule

  ],
  providers: [
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
