const kurento = require("kurento-client");
const minimist = require("minimist");

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
module.exports = {
  getKurentoClient,
  kurentoClient,
  argv,
  createMediaPipeline,
  createWebRtcEndpoint,
};
