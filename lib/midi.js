var midimessage = require('midimessage')

module.exports = function (player) {
  /**
  * Connect a player to a midi input
  *
  * The options accepts:
  *
  * - channels: the channels to listen to. Listen to all channels by default.
  *
  * @param {MIDIInput} input
  * @param {Object} options - (Optional)
  * @return {SamplePlayer} the player
  * @example
  * var piano = player(...)
  * window.navigator.requestMIDIAccess().then(function (midiAccess) {
  *   midiAccess.inputs.forEach(function (midiInput) {
  *     piano.listenToMidi(midiInput)
  *   })
  * })
  */
  player.listenToMidi = function (input, options) {
    var started = {}
    var recordingNoteOnEvents = {}
    var opts = options || {}
    var gain = opts.gain || function (vel) { return vel / 127 }
    let timeOffset
    if (opts.recording === true) timeOffset = performance.now()

    input.onmidimessage = function (msg) {
      var mm = msg.messageType ? msg : midimessage(msg)
      if (mm.messageType === 'noteon' && mm.velocity === 0) {
        mm.messageType = 'noteoff'
      }
      if (opts.channels !== undefined && !opts.channels.includes(mm.channel + 1)) return

      switch (mm.messageType) {
        case 'noteon':
          started[mm.key] = player.play(
            opts.transpose ? mm.key + opts.transpose : mm.key,
            0,
            { gain: gain(mm.velocity) }
          )
          if (opts.recording === true) recordingNoteOnEvents[mm.key] = mm
          break
        case 'noteoff':
          if (opts.recording === true && recordingNoteOnEvents[mm.key]) {
            opts.recordBuffer.push({
              ...recordingNoteOnEvents[mm.key],
              duration: mm._event.timeStamp - recordingNoteOnEvents[mm.key]._event.timeStamp,
              timeStamp: recordingNoteOnEvents[mm.key]._event.timeStamp - timeOffset,
              noteOffVelocity: mm.velocity
            })
            delete recordingNoteOnEvents[mm.key]
          }
          if (started[mm.key]) {
            started[mm.key].stop()
            delete started[mm.key]
          }
          break
      }
    }
    return player
  }
  return player
}
