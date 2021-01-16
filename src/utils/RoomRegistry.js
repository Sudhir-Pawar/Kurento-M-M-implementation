const { v4: uuidv4, validate: uuidValidte } = require("uuid");
const { UserRegistry } = require("./UserRegistry");

class RoomRegistry {
  static rooms = [];
  constructor(roomId, createdBy, pipeline) {
    this.roomId = roomId;
    this.createdBy = createdBy;
    this.participants = [];
    this.pipeline = pipeline;
  }
  addParticipants(participant) {
    if (!(participant instanceof UserRegistry))
      throw new Error(
        "Error: participant not a instanse of type UserRegistry class."
      );
    if (
      participant.userId === null ||
      participant.username === null ||
      participant.webRtcEndpoint === null ||
      participant.inWebRtcEndpoint === null
    )
      return false;
    this.participants.push(participant);
    return true;
  }
  static validateRoom(room) {
    if (
      !uuidValidte(room.roomId) ||
      room.createdBy === null ||
      this.roomExits(room)
    )
      return false;
    return true;
  }
  static roomExits(roomId) {
    if (this.rooms.find((room) => room.roomId === roomId)) {
      return true;
    }
    return false;
  }
  static registerRoom(room) {
    if (!this.validateRoom(room)) return false;
    this.rooms.push(room);
    room.addParticipants(room.createdBy);
    return true;
  }

  static getRoomById(roomId) {
    return this.rooms.find((room) => room.roomId === roomId);
  }
  getParticipant(userId) {
    return this.participants.find(
      (participant) => participant.userId === userId
    );
  }
  removeParticipant(userId) {
    this.participants = this.participants.filter(
      (participant) => participant.userId !== userId
    );
  }
  getParticipantIndex(userId) {
    let index = -1;
    this.participants.find((participant, _index) => {
      if (participant.userId === userId) {
        index = _index;
        return;
      }
    });
    return index;
  }
  getParticipants() {
    return this.participants;
  }
  getRoomId() {
    return this.roomId;
  }
  getCreatedBy() {
    return this.createdBy;
  }
  static createRoom(createdBy, pipeline) {
    if (!(createdBy instanceof UserRegistry))
      throw new Error(
        "Error: createdBy not a instanse of type UserRegistry class."
      );
    const room = new RoomRegistry(uuidv4(), createdBy, pipeline);
    this.registerRoom(room);
    return room;
  }
}

module.exports = { RoomRegistry };
