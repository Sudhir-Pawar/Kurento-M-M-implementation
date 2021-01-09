class UserRegistry {
  constructor(userId, username, webRtcEndpoint) {
    this.userId = userId;
    this.username = username;
    this.webRtcEndpoint = webRtcEndpoint;
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
}

module.exports = { UserRegistry };
