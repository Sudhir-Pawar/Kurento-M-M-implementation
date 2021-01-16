const socket = io();

const $videoLocal = document.querySelector(".local-video");
const $videoRemote = document.querySelector(".remote-video");

const $inputUsername = document.querySelector("#username");
const $inputRoomId = document.querySelector("#roomId");

const $btnCreateRoom = document.querySelector("#create-room");
const $btnJoinRoom = document.querySelector("#join-room");
const $divVideoContainer = document.querySelector("#video-container");

let room = null,
  message = null,
  webRtcPeer = null,
  inComWebRtcPeers = {};
let username = "";

socket.on("message", function (message) {
  switch (message.eventType) {
    case "icecandidate":
      console.log(message.candidate);
      webRtcPeer.addIceCandidate(message.candidate);
      break;
    case "icecandidate-incommingpeer":
      inComWebRtcPeers[message.participant.userId].addIceCandidate(
        message.candidate
      );
      break;
    case "newparticipant":
      receiveStream(message.participant);
      break;
    default:
      break;
  }
});

$btnJoinRoom.addEventListener("click", async (e) => {
  e.preventDefault();
  const roomId = $inputRoomId.value;
  if (roomId !== "") {
    message = { eventType: "join-room", roomId };
    await createOrJoinRoom(message);
  }
});

$btnCreateRoom.addEventListener("click", async (e) => {
  e.preventDefault();
  message = { eventType: "create-room" };
  await createOrJoinRoom(message);
});

const createOrJoinRoom = async function (message) {
  username = $inputUsername.value;
  if (username !== "") {
    try {
      const { sdpOffer } = await createWebRtcPeer();
      message = { ...message, user: { username }, sdpOffer };
      socket.emit("message", message, function (error, _room, sdpAnswer) {
        if (error) return console.log("unable to create or join room", error);
        room = _room;
        webRtcPeer.processAnswer(sdpAnswer);
        message = { eventType: "newparticipant", user: { username }, room };
        if (room.participants.length > 1) iterateRoomParticipants();
        socket.emit("message", message);
      });
    } catch (error) {
      console.log(error);
    }
  } else {
    console.log("Username null");
  }
};

const createWebRtcPeer = function () {
  return new Promise((resolve, reject) => {
    const onIceCandidate = function (candidate) {};

    const options = {
      localVideo: $videoLocal,
      onicecandidate: onIceCandidate,
      mediaConstraints: {
        audio: true,
        video: true,
      },
      configuration: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    };

    const _webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(
      options,
      function (error) {
        if (error) return reject(error);
        webRtcPeer = _webRtcPeer;
        webRtcPeer.peerConnection.onicecandidate = function (event) {
          let message = {
            eventType: "icecandidate",
            candidate: event.candidate,
            room,
            user: {
              username,
            },
          };
          socket.emit("message", message);
        };
        this.generateOffer((error, sdpOffer) => {
          if (error) return reject(error);
          resolve({ sdpOffer });
        });
      }
    );
  });
};

const iterateRoomParticipants = async function () {
  room.participants.forEach(async (participant) => {
    if (participant.userId !== socket.id) await receiveStream(participant);
  });
};
const receiveStream = async function (participant) {
  const { sdpOffer } = await createIncomingWebRtcPeer(participant);
  message = {
    eventType: "sdpOffer-incomingpeer",
    user: { username },
    room,
    participant,
    sdpOffer,
  };
  socket.emit("message", message, function (error, sdpAnswer, _participant) {
    if (error) console.log("Unable to add offer", error);
    inComWebRtcPeers[_participant.userId].processAnswer(sdpAnswer);
  });
};

const createIncomingWebRtcPeer = function (participant) {
  return new Promise((resolve, reject) => {
    const div = document.createElement("div");
    div.className = "remote-video-container";
    const divName = document.createElement("div");
    divName.appendChild(document.createTextNode(participant.username));
    const video = document.createElement("video");
    video.id = participant.userId;
    video.autoplay = true;
    video.muted = false;
    video.playsInline = true;
    div.appendChild(video);
    div.appendChild(divName);
    $divVideoContainer.appendChild(div);

    const onIceCandidate = function (candidate) {};
    let options = {
      remoteVideo: video,
      onicecandidate: onIceCandidate,
      configuration: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    };
    inComWebRtcPeers[
      participant.userId
    ] = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
      if (error) return reject(error);
      inComWebRtcPeers[
        participant.userId
      ].peerConnection.onicecandidate = function (event) {
        if (event.candidate === null) return;
        message = {
          eventType: "icecandidate-incomingpeer",
          user: { username },
          participant,
          candidate: event.candidate,
          room,
        };
        socket.emit("message", message);
      };
      this.generateOffer((error, sdpOffer) => {
        if (error) return reject(error);
        resolve({ sdpOffer });
      });
    });
  });
};
