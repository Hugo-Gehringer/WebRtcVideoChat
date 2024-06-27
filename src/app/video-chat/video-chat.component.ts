import {Component, OnInit, ViewChild, ElementRef, OnDestroy} from '@angular/core';
import {WebrtcService} from "../service/webrtc.service";
import {Socket} from "socket.io-client";
import {BehaviorSubject} from "rxjs";

@Component({
  selector: 'app-video-chat',
  templateUrl: './video-chat.component.html',
  styleUrls: ['./video-chat.component.scss'],
})
export class VideoChatComponent implements OnInit, OnDestroy{
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  public remoteStreams: Map<string, MediaStream> = new Map();
  public localStream!: MediaStream;
  private socket !: Socket
  logs: string[] = [];


  constructor(public webrtcService: WebrtcService) {
    this.webrtcService.logs.subscribe((logs) => {
      this.logs = logs;
    });
  }

  ngOnDestroy(): void {
    this.socket.emit('peer-leave', { peerId: this.webrtcService.myPeerId });
  }

  async ngOnInit() {
    this.localStream = await this.webrtcService.getLocalStream();
    this.webrtcService.remoteStreams.subscribe(streams => {
      this.remoteStreams = streams;
    });
      await this.webrtcService.createOffer(this.webrtcService.myPeerId);
  }

  toggleVideo() {
    if (this.localVideo.nativeElement.srcObject) {
      let mediaStream: MediaStream = this.localVideo.nativeElement.srcObject as MediaStream;
      let enabled =mediaStream.getVideoTracks()[0].enabled;
      mediaStream.getVideoTracks()[0].enabled = !enabled;
    }
  }

  toggleMic() {
    if (this.localVideo.nativeElement.srcObject) {
      let mediaStream: MediaStream = this.localVideo.nativeElement.srcObject as MediaStream;
      let enabled = mediaStream.getAudioTracks()[0]?.enabled;
      if (enabled !== undefined)  mediaStream.getAudioTracks()[0].enabled = !enabled;
    }
    this.webrtcService.emitToggleMute()
  }

  isAudioMuted(){
    if (this.localVideo?.nativeElement?.srcObject) {
      let mediaStream: MediaStream = this.localVideo.nativeElement.srcObject as MediaStream;
      return mediaStream.getAudioTracks()[0]?.enabled;
    }
    return true
  }

  isVideoTrackActive(mediaStream : MediaStream): boolean {
    return mediaStream?.getVideoTracks()[0]?.enabled
  }
  isAudioTrackAvailable(mediaStream : MediaStream): boolean {
    return mediaStream?.getAudioTracks()[0]?.enabled
  }
  onLocalVideoLoaded() {
    console.log('Local video metadata loaded');
  }

}
