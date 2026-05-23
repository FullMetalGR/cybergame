const CommuncationBus = {
  protocol: "CYBERGAME_V1",
  version: "1.0.0",

  // communication
  emit(event, data) {},
  on(event, handler) {},
  off(event, handler) {},

  // request/response
  request(event, data) {},
  respond(event, handler) {},

  // lifecycle & sync
  ready() {},
  heartbeat() {},

  // analytics
  track(event, metadata) {},
  flush() {},

  // security
  setAllowedOrigins(list) {},
  setAuth(token) {},

  // optional command registry
  registerCommand(event, handler) {},
};
