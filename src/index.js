const express = require("express");
const socketio = require("socket.io");
const kurento = require("kurento-client");
const path = require("path");
const http = require("http");
const {
  getKurentoClient,
  argv,
  createMediaPipeline,
  createWebRtcEndpoint,
} = require("./utils/kurentoClient");
const { RoomRegistry } = require("./utils/RoomRegistry");
const { UserRegistry } = require("./utils/UserRegistry");
const { IceCandidateRegistry } = require("./utils/IceCandidateRegistry");

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, "../public")));

io.on("connection", (socket) => {
  socket.on("message", (message, callback) => {
    switch (message.eventType) {
      case "create-room":
        createRoom(message.user, message.sdpOffer, socket, callback);
        break;
      case "icecandidate":
        console.log(message.user, message.room, message.candidate);
        addIceCandiate(message.user, message.room, message.candidate, socket);
        break;
      default:
        console.log("Unidentified event. Executing default code");
        break;
    }
  });
});

const addIceCandiate = function (user, room, candidate, socket) {
  IceCandidateRegistry.onIceCandidate(socket.id, room, candidate);
};

const createRoom = async function (user, sdpOffer, socket, callback) {
  try {
    await createMediaPipeline((error, pipeline) => {
      if (error) return callback(error, undefined, undefined);

      createWebRtcEndpoint(pipeline, (error, webRtcEndpoint) => {
        if (error) return callback(error, undefined, undefined);
        webRtcEndpoint.processOffer(
          sdpOffer,
          async function (error, sdpAnswer) {
            if (error)
              return callback(
                "Unable to create sdpAnswer. Error:" + error,
                undefined,
                undefined
              );
            const room = RoomRegistry.createRoom(
              new UserRegistry(socket.id, user.username, webRtcEndpoint),
              pipeline
            );
            IceCandidateRegistry.addIceCandidate(
              socket.id,
              room.roomId,
              webRtcEndpoint
            );
            webRtcEndpoint.on("IceComponentStateChange", function (event) {
              console.log("IceComponentStateChange: ", event);
            });
            webRtcEndpoint.on("OnIceCandidate", function (event) {
              const candidate = kurento.getComplexType("IceCandidate")(
                event.candidate
              );
              const message = {
                eventType: "icecandidate",
                candidate,
              };
              sendMessage(socket, message);
            });
            await webRtcEndpoint.gatherCandidates();
            console.log("Gathering candidates");
            callback(undefined, room, sdpAnswer);
          }
        );
      });
    });
  } catch (error) {
    callback(error, undefined, undefined);
  }
};

const sendMessage = function (socket, message) {
  socket.emit("message", message);
};

server.listen(PORT, (error) => {
  if (error) return console.log(error);
  console.log("server started on port: " + PORT);
});
