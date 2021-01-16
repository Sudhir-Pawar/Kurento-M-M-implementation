const { RoomRegistry } = require("./RoomRegistry");
class IceCandidateRegistry {
  static candidates = {};
  static inCandidates = {};
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
        // console.log(candidate);
        webRtcEndpoint.addIceCandidate(candidate);
      });
      this.candidates[userId] = [];
    }
  }
  static onIceCandidateIncomingPeer = function (
    userId,
    room,
    participantId,
    candidate
  ) {
    const user = RoomRegistry.getRoomById(room.roomId).getParticipant(userId);
    if (user.inWebRtcEndpoints[participantId]) {
      return user.inWebRtcEndpoints[participantId].addIceCandidate(candidate);
    }
    if (!this.inCandidates[participantId]) {
      this.inCandidates[participantId] = [];
    }

    this.inCandidates[participantId].push(candidate);
  };

  static addIceCandidateIncomingPeer = function (
    participantId,
    inWebRtcEndpoint
  ) {
    const icecandidates = this.inCandidates[participantId];

    icecandidates.forEach((candidate) => {
      inWebRtcEndpoint.addIceCandidate(candidate);
    });

    this.inCandidates[participantId] = [];
  };
}

module.exports = { IceCandidateRegistry };
