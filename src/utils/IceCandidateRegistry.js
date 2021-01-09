const { RoomRegistry } = require("./RoomRegistry");
class IceCandidateRegistry {
  static candidates = {};
  constructor(userId, roomId, candidate) {
    this.userId = userId;
    this.roomId = roomId;
    this.candidate = candidate;
  }
  getUserId() {
    return this.userId;
  }
  getRoomId() {
    return this.roomId;
  }
  getCandidate() {
    return this.candidate;
  }
  static onIceCandidate(userId, room, candidate) {
    if (!candidate) return;
    if (userId && room !== null) {
      const user = room.getParticipant(userId, roomId);
      if (user) {
        return user.webRtcEndpoint.addIceCandidate(candidate);
      }
    }
    if (!this.candidates[userId]) this.candidates[userId] = [];

    this.candidates[userId].push(candidate);
  }
  static addIceCandidate(userId, roomId, webRtcEndpoint) {
    const icecandidates = this.candidates[userId];
    if (icecandidates) {
      icecandidates.forEach((candidate) => {
        console.log(candidate);
        webRtcEndpoint.addIceCandidate(candidate);
      });
      this.candidates[userId] = [];
    }
  }
}

module.exports = { IceCandidateRegistry };
