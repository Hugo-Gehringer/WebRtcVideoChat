import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {WebrtcService} from "./service/webrtc.service";
import {Socket} from "socket.io-client";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
private socket! : Socket;

  constructor(private webrtcService: WebrtcService) {

  }


}
