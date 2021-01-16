const express = require("express");
const socketio = require("socket.io");
const path = require("path");
const http = require("http");
const {
  argv,
  createMediaPipeline,
  createWebRtcEndpoint,
  processOfferAndAddInPeer,
  processOfferAndAddToRoom,
} = require("./utils/kurentoClient");
const { RoomRegistry } = require("./utils/RoomRegistry");
const { IceCandidateRegistry } = require("./utils/IceCandidateRegistry");

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, "../public")));

io.on("connection", (socket) => {
  socket.on("message", async (message, callback) => {
    switch (message.eventType) {
      case "create-room":
        createRoom(message.user, message.sdpOffer, socket, callback);
        break;
      case "join-room":
        joinRoom(
          message.user,
          message.sdpOffer,
          message.roomId,
          socket,
          callback
        );
        break;
      case "icecandidate":
        addIceCandiate(message.user, message.room, message.candidate, socket);
        break;
      case "icecandidate-incomingpeer":
        addIceCandiateIncommingPeer(
          message.user,
          message.room,
          message.participant,
          message.candidate,
          socket
        );
        break;
      case "sdpOffer-incomingpeer":
        await createInEndPointAndProcessOffer(
          message.user,
          message.room,
          message.participant,
          message.sdpOffer,
          socket,
          callback
        );
        break;
      case "newparticipant":
        await newParticipantArrived(message.user, message.room, socket);
        break;
      default:
        console.log("Unidentified event. Executing default code");
        break;
    }
  });
});

const createInEndPointAndProcessOffer = async function (
  _user,
  _room,
  participant,
  sdpOffer,
  socket,
  callback
) {
  console.log("check for user and participant", _user, participant);
  const room = RoomRegistry.getRoomById(_room.roomId);
  const user = room.getParticipant(socket.id);
  const inWebRtcEndpoint = user.inWebRtcEndpoints[participant.userId];
  console.log("Check inwebendpoint", inWebRtcEndpoint);
  if (!inWebRtcEndpoint) {
    console.log("if not present");
    createWebRtcEndpoint(
      room.pipeline,
      async function (error, _inWebRtcEndpoint) {
        if (error)
          return callback(
            "Unable to create incoming webRtcEndpoint" + error,
            undefined,
            undefined
          );
        await processOfferAndAddInPeer(
          _inWebRtcEndpoint,
          true,
          _user,
          room,
          participant,
          sdpOffer,
          socket,
          callback
        );
      }
    );
  } else {
    console.log("if present");
    await processOfferAndAddInPeer(
      inWebRtcEndpoint,
      false,
      _user,
      room,
      participant,
      sdpOffer,
      socket,
      callback
    );
  }
};

const newParticipantArrived = async function (user, _room, socket) {
  const room = RoomRegistry.getRoomById(_room.roomId);
  const participant = room.getParticipant(socket.id);
  let message = { eventType: "newparticipant", room, participant };
  socket.broadcast.emit("message", message);
  // await makeConnection(socket, room);
};

const addIceCandiateIncommingPeer = function (
  user,
  room,
  participant,
  candidate,
  socket
) {
  IceCandidateRegistry.onIceCandidateIncomingPeer(
    socket.id,
    room,
    participant.userId,
    candidate
  );
};
const addIceCandiate = function (user, room, candidate, socket) {
  IceCandidateRegistry.onIceCandidate(socket.id, room, candidate);
};

const joinRoom = function (user, sdpOffer, roomId, socket, callback) {
  const room = RoomRegistry.getRoomById(roomId);
  if (!room) {
    return callback("Error: Room not found for this roomId: " + roomId);
  }
  createWebRtcEndpoint(room.pipeline, async (error, webRtcEndpoint) => {
    if (error) return callback(error, undefined, undefined);
    await processOfferAndAddToRoom(
      webRtcEndpoint,
      room.pipeline,
      user,
      room,
      sdpOffer,
      socket,
      callback
    );
  });
};

const createRoom = async function (user, sdpOffer, socket, callback) {
  try {
    await createMediaPipeline((error, pipeline) => {
      if (error) return callback(error, undefined, undefined);

      createWebRtcEndpoint(pipeline, async (error, webRtcEndpoint) => {
        if (error) return callback(error, undefined, undefined);

        await processOfferAndAddToRoom(
          webRtcEndpoint,
          pipeline,
          user,
          null,
          sdpOffer,
          socket,
          callback
        );
      });
    });
  } catch (error) {
    callback(error, undefined, undefined);
  }
};

server.listen(PORT, (error) => {
  if (error) return console.log(error);
  console.log("server started on port: " + PORT);
});
