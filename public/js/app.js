const socket = io();

const $videoLocal = document.querySelector(".local-video");
const $videoRemote = document.querySelector(".remote-video");

const $inputUsername = document.querySelector("#username");

const $btnCreateRoom = document.querySelector("#create-room");
const $btnJoinRoom = document.querySelector("#join-room");

let room = null,
  message = null,
  webRtcPeer = null;

let username = "";

socket.on("message", function (message) {
  switch (message.eventType) {
    case "icecandidate":
      console.log(message.candidate);
      webRtcPeer.addIceCandidate(message.candidate);
      break;

    default:
      break;
  }
});

$btnCreateRoom.addEventListener("click", async (e) => {
  e.preventDefault();
  username = $inputUsername.value;
  if (username !== "") {
    try {
      const { _webRtcPeer, sdpOffer } = await createWebRtcPeer();
      message = {
        eventType: "create-room",
        user: {
          username,
        },
        sdpOffer,
      };
      socket.emit("message", message, function (error, _room, sdpAnswer) {
        if (error) return console.log("unable to create room", error);
        room = _room;
        webRtcPeer.processAnswer(sdpAnswer);
      });
    } catch (error) {
      console.log(error);
    }
  } else {
    console.log("Username null");
  }
});

const createWebRtcPeer = function () {
  return new Promise((resolve, reject) => {
    const onIceCandidate = function (candidate) {
      console.log(candidate);
    };

    const options = {
      localVideo: $videoLocal,
      remoteVideo: $videoRemote,
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
          resolve({ _webRtcPeer, sdpOffer });
        });
      }
    );
  });
};
