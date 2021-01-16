class UserRegistry {
  constructor(userId, username, webRtcEndpoint, inWebRtcEndpoint) {
    this.userId = userId;
    this.username = username;
    this.webRtcEndpoint = webRtcEndpoint;
    this.inWebRtcEndpoints = {};
  }
  getUserId() {
    return this.userId;
  }
  getUsername() {
    return this.username;
  }
  getWebRtcEndpoint() {
    return this.webRtcEndpoint;
  }
  addInWebRtcEndpoint(userId, inWebRtcEndpoint) {
    this.inWebRtcEndpoints[userId] = inWebRtcEndpoint;
  }
}

module.exports = { UserRegistry };
