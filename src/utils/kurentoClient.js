const kurento = require("kurento-client");
const minimist = require("minimist");
const { RoomRegistry } = require("./RoomRegistry");
const { UserRegistry } = require("./UserRegistry");
const { IceCandidateRegistry } = require("./IceCandidateRegistry");

let kurentoClient = null;

const argv = minimist(process.argv.slice(2), {
  default: {
    as_uri: "https://localhost:3000/",
    ws_uri: "ws://54.145.222.179:8888/kurento",
  },
});

const getKurentoClient = async function () {
  if (kurentoClient !== null) return kurentoClient;
  try {
    kurentoClient = await kurento(argv.ws_uri);
    return kurentoClient;
  } catch (error) {
    throw new Error(
      "Unable to establish connection with kurento media server. Error: " +
        error
    );
  }
};

const createMediaPipeline = async function (callback) {
  const kurentoClient = await getKurentoClient();
  kurentoClient.create("MediaPipeline", function (error, pipeline) {
    if (error)
      callback(
        "Unable to create kurento media pipeline. Error:" + error,
        undefined
      );

    callback(undefined, pipeline);
  });
};

const createWebRtcEndpoint = function (pipeline, callback) {
  pipeline.create("WebRtcEndpoint", function (error, webRtcEndpoint) {
    if (error)
      callback("Unable to create webRtcEndpoint. Error:" + error, undefined);
    callback(undefined, webRtcEndpoint);
  });
};

const makeConnection = function (userId, participantId, roomId) {
  const user = RoomRegistry.getRoomById(roomId).getParticipant(userId);
  const participant = RoomRegistry.getRoomById(roomId).getParticipant(
    participantId
  );
  participant.webRtcEndpoint.connect(
    user.inWebRtcEndpoints[participantId],
    function (error) {
      if (error) {
        console.log(
          "Unable to connect from: " +
            userId +
            " to participant: " +
            participantId
        );
      }
    }
  );
};
const processOfferAndAddInPeer = async function (
  inWebRtcEndpoint,
  addInpeer,
  _user,
  room,
  participant,
  sdpOffer,
  socket,
  callback
) {
  inWebRtcEndpoint.processOffer(sdpOffer, async function (error, sdpAnswer) {
    if (error)
      return callback(
        "Unbale to process offer for incomingpeer" + error,
        undefined,
        undefined
      );
    inWebRtcEndpoint.on("IceComponentStateChange", function (event) {
      console.log("IceComponentStateChange: ", event);
    });

    inWebRtcEndpoint.on("OnIceCandidate", function (event) {
      const candidate = kurento.getComplexType("IceCandidate")(event.candidate);
      const message = {
        eventType: "icecandidate-incommingpeer",
        candidate,
        participant,
      };
      sendMessage(socket, message);
    });
    IceCandidateRegistry.addIceCandidateIncomingPeer(
      participant.userId,
      inWebRtcEndpoint
    );
    await inWebRtcEndpoint.gatherCandidates();
    if (addInpeer) {
      RoomRegistry.getRoomById(room.roomId)
        .getParticipant(socket.id)
        .addInWebRtcEndpoint(participant.userId, inWebRtcEndpoint);
    }
    makeConnection(socket.id, participant.userId, room.roomId);
    callback(undefined, sdpAnswer, participant);
  });
};
const processOfferAndAddToRoom = async function (
  webRtcEndpoint,
  pipeline,
  user,
  room,
  sdpOffer,
  socket,
  callback
) {
  webRtcEndpoint.processOffer(sdpOffer, async function (error, sdpAnswer) {
    if (error)
      return callback(
        "Unable to create sdpAnswer. Error:" + error,
        undefined,
        undefined
      );
    if (!room) {
      room = RoomRegistry.createRoom(
        new UserRegistry(socket.id, user.username, webRtcEndpoint),
        pipeline
      );
    } else {
      room.addParticipants(
        new UserRegistry(socket.id, user.username, webRtcEndpoint)
      );
    }

    IceCandidateRegistry.addIceCandidate(
      socket.id,
      room.roomId,
      webRtcEndpoint
    );
    webRtcEndpoint.on("IceComponentStateChange", function (event) {
      // console.log("IceComponentStateChange: ", event);
    });
    webRtcEndpoint.on("OnIceCandidate", function (event) {
      const candidate = kurento.getComplexType("IceCandidate")(event.candidate);
      const message = {
        eventType: "icecandidate",
        candidate,
      };
      sendMessage(socket, message);
    });
    await webRtcEndpoint.gatherCandidates();
    callback(undefined, room, sdpAnswer);
  });
};

const sendMessage = function (socket, message) {
  socket.emit("message", message);
};
module.exports = {
  getKurentoClient,
  kurentoClient,
  argv,
  createMediaPipeline,
  createWebRtcEndpoint,
  processOfferAndAddToRoom,
  processOfferAndAddInPeer,
};
