/**
 * Persistência leve no cliente (preferências de lobby/prática).
 * Prefixo evita colisão com outras chaves do projeto.
 */
(function (global) {
  "use strict";

  var PREFIX = "mf.frontier.";

  var KEYS = {
    DISPLAY_NAME: PREFIX + "displayName",
    PRACTICE_DIFFICULTY: PREFIX + "practiceDifficulty",
    PRACTICE_OPPONENTS: PREFIX + "practiceOpponentCount",
    MOCK_ROOM_CODE: PREFIX + "mockRoomCode",
  };

  /**
   * @param {string} key
   * @param {string} value
   */
  function setString(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }

  /**
   * @param {string} key
   * @returns {string | null}
   */
  function getString(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  var FrontierStorage = {
    KEYS: KEYS,
    setString: setString,
    getString: getString,
  };

  global.FrontierStorage = FrontierStorage;
})(typeof window !== "undefined" ? window : globalThis);
