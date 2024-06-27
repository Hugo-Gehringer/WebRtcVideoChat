import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebrtcService {
  private socket: Socket;
  public localStream!: MediaStream;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  public myPeerId!: string;
  public remoteStreams = new BehaviorSubject<Map<string, MediaStream>>(new Map());
  private configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };
  public logs = new BehaviorSubject<string[]>([]);


  constructor() {
    this.socket = io('https://signalingservernode.onrender.com');
    // this.socket = io('http://localhost:3000');

    this.socket.on('connect', () => {
      this.myPeerId = this.socket.id!;
    });

    this.socket.on('offer', (message) => {
      console.log(message);
      this.handleOffer(message);
    });

    this.socket.on('answer', (message) => {
      this.handleAnswer(message);
    });

    this.socket.on('candidate', (message) => {
      this.handleCandidate(message);
    });

    this.socket.on('peer-leave', (message) => {
      this.handlePeerLeave(message);
      console.log("peer leave, peer id :", message)
    });

    this.socket.on("toggle-mute", (peerId) => {
      const audioTrack = this.findMediaStreamByPeerId(peerId)?.getAudioTracks()[0];
      console.log("audio track to mute", audioTrack);
      if(audioTrack?.enabled){
        this.handleMute(peerId)
      }else {
        this.handleUnmute(peerId)
      }
    })
  }

  async getLocalStream(): Promise<MediaStream> {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: {width: 640, height: 360},
      audio: true,
    });
    return this.localStream;
  }

  async createOffer(peerId: string) {
    const peerConnection = this.createPeerConnection(peerId);
    if (!peerConnection) return;

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    this.socket.emit('offer', { offer, peerId });
  }

  async handleOffer({ offer, peerId }: { offer: RTCSessionDescriptionInit; peerId: string }) {
    const peerConnection = this.createPeerConnection(peerId);
    if (!peerConnection) return;

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      // Check signaling state after setting the remote description
      if (peerConnection.signalingState !== 'have-remote-offer') {
        console.warn('Expected signaling state to be "have-remote-offer"');
        return;
      }
      console.log(`Creating answer for peer ${peerId}`);
      const answer = await peerConnection.createAnswer();

      await peerConnection.setLocalDescription(answer);

      this.socket.emit('answer', { answer, peerId });
    } catch (error) {
      console.error(`Error handling offer for peer ${peerId}:`, error);
    }
  }


  async handleAnswer({ answer, peerId }: { answer: RTCSessionDescriptionInit; peerId: string }) {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleCandidate({ candidate, peerId }: { candidate: RTCIceCandidate; peerId: string }) {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection && peerConnection.signalingState !== 'closed') {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  createPeerConnection(peerId: string): RTCPeerConnection | undefined {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId);
    }

    const peerConnection = new RTCPeerConnection(this.configuration);
    console.log(`Creating new peer connection for ${peerId}`);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to peer ${peerId}`);
        this.socket.emit('candidate', { candidate: event.candidate, peerId });
      }
    };

    const remoteStream = new MediaStream();
    peerConnection.ontrack = (event) => {
      remoteStream.addTrack(event.track);
      this.remoteStreams.value.set(peerId, remoteStream);
      this.remoteStreams.next(this.remoteStreams.value);
      console.log(this.remoteStreams.value)
    };

    this.localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, this.localStream);
    });
    this.addLog(`Peer connected : ${peerId}`);

    this.peerConnections.set(peerId, peerConnection);
    return peerConnection;
  }

  handleMute(peerId: string) {
    const remoteStreamData = this.remoteStreams.value.get(peerId);
    if (remoteStreamData) {
      remoteStreamData.getAudioTracks()[0].enabled = false;
      this.remoteStreams.next(this.remoteStreams.value);
    }
    console.log('peer muted', peerId)
  }

  handleUnmute(peerId: string) {
    const remoteStreamData = this.remoteStreams.value.get(peerId);
    if (remoteStreamData) {
      remoteStreamData.getAudioTracks()[0].enabled = true;
      this.remoteStreams.next(this.remoteStreams.value);
    }
    console.log('peer unmuted', peerId)
  }

  handlePeerLeave(peerId: string) {
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(peerId);
    }

    this.remoteStreams.value.delete(peerId);
    this.remoteStreams.next(this.remoteStreams.value);
    this.addLog(`Peer disconnected : ${peerId}`);

  }

  findMediaStreamByPeerId(peerId :string) {
    return this.remoteStreams.value.get(peerId);
  }

  emitToggleMute() {
    this.socket.emit("toggle-mute", this.myPeerId)
  }

  private addLog(message: string) {
    const currentLogs = this.logs.value;
    currentLogs.push(message);
    this.logs.next(currentLogs);
  }
}
