// variation:
// -use bass for filter hp/lp effect
// !use gain for treb
// !use trebble for mid
// !use jog weel for rate_perm_up_small
// !use browse button for load to stopped deck
// !use pitch fader for deck3+4 volume 
// !use scratch for deck3+4 headphone
//
// use load button to load to deck3+4?
// use load button to shift?
// use bright leds to indicate shift
// use load button 1 for shift1:
// -> deck 3+4
// use load button 2 for shift2:
// -> more cue points


NumarkPartyMix = {}

// pitch ranges
// add/remove/modify steps to your liking
// default step must be set in Mixxx settings
// setting is stored per deck in pitchRange.currentRangeIdx
// NumarkPartyMix.pitchRanges = [0.08, 0.16, 1];

// whether the corresponding Mixxx option is enabled
// (Settings -> Preferences -> Waveforms -> Synchronize zoom level across all waveforms)
NumarkPartyMix.waveformsSynced = true;

// jogwheel
NumarkPartyMix.jogScratchSensitivity = 1024;
NumarkPartyMix.jogScratchAlpha = 1; // do NOT set to 2 or higher
NumarkPartyMix.jogScratchBeta = 1 / 32;
NumarkPartyMix.jogPitchSensitivity = 10;
// NumarkPartyMix.jogSeekSensitivity = 10000;

// autoloop sizes, for available values see:
// https://manual.mixxx.org/2.3/en/chapters/appendix/mixxx_controls.html#control-[ChannelN]-beatloop_X_toggle
NumarkPartyMix.autoLoopSizes = [
    "4",
    "8",
    "16",
    "32"
];

// beatjump values, for available values see:
// https://manual.mixxx.org/2.3/en/chapters/appendix/mixxx_controls.html#control-[ChannelN]-beatjump_X_forward
// underscores (_) at the end are needed because numeric values (e.g. 8) have two underscores (e.g. beatjump_8_forward),
// but "beatjump_forward"/"beatjump_backward" have only one underscore
// NumarkPartyMix.beatJumpValues = [
//     // "0.0625_",
//     // "0.125_",
//     // "0.25_",
//     // "0.5_",
//     "1_",
//     "2_",
//     "", // "beatjump_forward"/"beatjump_backward" - jump by the value selected in Mixxx GUI (4 by default)
//     "8_"
// ];

// dim all lights when inactive instead of turning them off
components.Button.prototype.off = 0x01;

// pad modes control codes
NumarkPartyMix.PadModeControls = {
    HOTCUE: 0x00,
    LOOP: 0x0B,
    SAMPLER: 0x0E,
    MODEBEATJUMP: 0x18,
};

// state variable, don't touch
// NumarkPartyMix.shifted = false;

NumarkPartyMix.init = function (id, debugging) {
    /// init party led switch off
    midi.sendShortMsg(0xb0, 0x40, 0x00);//0x60 seems to be max
    midi.sendShortMsg(0xb0, 0x42, 0x00);
    midi.sendShortMsg(0xb0, 0x43, 0x00);
    /// init headphone led switch off
    midi.sendShortMsg(0x80, 0x1B, 0x00);
    midi.sendShortMsg(0x81, 0x1B, 0x00);

    // initialize component containers
    NumarkPartyMix.deck = new components.ComponentContainer();
    var i;
    for (i = 0; i < 2; i++) {
        NumarkPartyMix.deck[i] = new NumarkPartyMix.Deck(i + 1);
    }

    NumarkPartyMix.browse = new NumarkPartyMix.Browse();
    NumarkPartyMix.gains = new NumarkPartyMix.Gains();

    // ignore pad mode button for now TODO
    // NumarkPartyMix.initPads();

    // The SysEx message to send to the controller to force the midi controller
    // to send the status of every item on the control surface.
    // 0x00 0x01 0x3F is Numark mfg. ID used in SysEx messages.
    var ControllerStatusSysex = [0xF0, 0x00, 0x01, 0x3F, 0x38, 0x48, 0xF7];

    // After midi controller receives this Outbound Message request SysEx Message,
    // midi controller will send the status of every item on the
    // control surface. (Mixxx will be initialized with current values)
    //
    // Explanation of Serato's Sysex message is here which helped figure out what Numark
    // was using for this controller:
    // https://www.mixxx.org/wiki/doku.php/serato_sysex
    midi.sendSysexMsg(ControllerStatusSysex, ControllerStatusSysex.length);

};

NumarkPartyMix.shutdown = function () {
    // initialize leds
    var ledOff = components.Button.prototype.off;
    var ledOn = components.Button.prototype.on;

    // set modes back to HOTCUE
    midi.sendShortMsg(0x94, NumarkPartyMix.PadModeControls.HOTCUE, ledOn);
    midi.sendShortMsg(0x95, NumarkPartyMix.PadModeControls.HOTCUE, ledOn);

    // dim connections
    midi.sendShortMsg(0x90, 0x14, ledOff);
    midi.sendShortMsg(0x90, 0x15, ledOff);
    midi.sendShortMsg(0x90, 0x16, ledOff);
    midi.sendShortMsg(0x90, 0x17, ledOff);
    midi.sendShortMsg(0x91, 0x14, ledOff);
    midi.sendShortMsg(0x91, 0x15, ledOff);
    midi.sendShortMsg(0x91, 0x16, ledOff);
    midi.sendShortMsg(0x91, 0x17, ledOff);

    // dim LEDs for scratch buttons
    midi.sendShortMsg(0x90, 0x07, ledOff);
    midi.sendShortMsg(0x91, 0x07, ledOff);

    // untoggle (dim) PFL switches
    midi.sendShortMsg(0x80, 0x1B, ledOff);
    midi.sendShortMsg(0x81, 0x1B, ledOff);
};

/* i want to use scratch or load button implement
NumarkPartyMix.shift = function() {
    NumarkPartyMix.shifted = true;
    NumarkPartyMix.deck.shift();
    NumarkPartyMix.browse.shift();
    NumarkPartyMix.effect.shift();
};

NumarkPartyMix.unshift = function() {
    NumarkPartyMix.shifted = false;
    NumarkPartyMix.deck.unshift();
    NumarkPartyMix.browse.unshift();
    NumarkPartyMix.effect.unshift();
};
*/

NumarkPartyMix.Deck = function (number) {
    components.Deck.call(this, number);

    var channel = number - 1;
    var deck = this;
    this.scratchModeEnabled = false;

    // engine.scratchDisable("[Channel" + number + "]");

    this.playButton = new components.PlayButton({
        midi: [0x90 + channel, 0x00],
    });

    this.cueButton = new components.CueButton({
        midi: [0x90 + channel, 0x01],
    });

    this.syncButton = new components.SyncButton({
        midi: [0x90 + channel, 0x02],
    });

    this.padSection = new NumarkPartyMix.PadSection(number);

    // i want to use load for this
    // this.shiftButton = new components.Button({
    //     input: function(channel, control, value) {
    //         // each shift button shifts the entire controller.
    //         // more consistent with the logic burned into hardware
    //         if (this.isPress(channel, control, value)) {
    //             NumarkPartyMix.shift();
    //         } else {
    //             NumarkPartyMix.unshift();
    //         }
    //     }
    // });

    // this.scratchToggle = new components.Button({
    //     midi: [0x90 + channel, 0x07],
    //     input: function (channel, control, value,status, group) {
    //         if (!this.isPress(channel, control, value)) {
    //             return;
    //         }
    //         deck.scratchModeEnabled = !deck.scratchModeEnabled;
    //         if(deck.scratchModeEnabled){
    //             engine.scratchEnable(script.deckFromGroup(group), NumarkPartyMix.jogScratchSensitivity, 33+1/3, NumarkPartyMix.jogScratchAlpha, NumarkPartyMix.jogScratchBeta, true);
    //         }else{
    //             engine.scratchDisable(script.deckFromGroup(group));
    //         }
    //         // change the scratch mode status light
    //         this.send(deck.scratchModeEnabled ? this.on : this.off);
    //     },
    // });

    this.reconnectComponents(function (component) {
        if (component.group === undefined) {
            component.group = this.currentDeck;
        }
    });
};

NumarkPartyMix.Deck.prototype = new components.Deck();


NumarkPartyMix.PadSection = function (deckNumber) {
    components.ComponentContainer.call(this);

    this.blinkTimer = 0;
    this.blinkLedState = true;

    // initialize leds
    var ledOff = components.Button.prototype.off;
    var ledOn = components.Button.prototype.on;
    midi.sendShortMsg(0x93 + deckNumber, 0x00, ledOn); // cue

    this.modes = {};
    this.modes[NumarkPartyMix.PadModeControls.HOTCUE] = new NumarkPartyMix.ModeHotcue(deckNumber);
    this.modes[NumarkPartyMix.PadModeControls.LOOP] = new NumarkPartyMix.ModeLoop(deckNumber);
    this.modes[NumarkPartyMix.PadModeControls.SAMPLER] = new NumarkPartyMix.ModeSampler(deckNumber);
    this.modes[NumarkPartyMix.PadModeControls.MODEBEATJUMP] = new NumarkPartyMix.ModeBeatjump(deckNumber);

    this.modeButtonPress = function (channel, control, value) {
        this.setMode(channel, control);
    };

    this.padPress = function (channel, control, value, status, group) {
        var i = (control - 0x14) % 8;
        this.currentMode.connections[i].input(channel, control, value, status, group);
    };

    this.setMode = function (channel, control) {
        var newMode = this.modes[control];
        this.currentMode.forEachComponent(function (component) {
            component.disconnect();
        });

        // set the correct shift state for new mode
        // if (this.isShifted) {
        //     newMode.shift();
        // } else {
        //     newMode.unshift();
        // }

        newMode.forEachComponent(function (component) {
            component.connect();
            component.trigger();
        });

        this.currentMode = newMode;
    };

    // start an infinite timer that toggles led state
    this.blinkLedOn = function (midi1, midi2) {
        this.blinkLedOff();
        this.blinkLedState = true;
        this.blinkTimer = engine.beginTimer(NumarkPartyMix.blinkDelay, function () {
            midi.sendShortMsg(midi1, midi2, this.blinkLedState ? ledOn : ledOff);
            this.blinkLedState = !this.blinkLedState;
        });
    };

    // stop the blink timer
    this.blinkLedOff = function () {
        if (this.blinkTimer === 0) {
            return;
        }

        engine.stopTimer(this.blinkTimer);
        this.blinkTimer = 0;
    };

    this.disablePadLights = function () {
        for (var i = 0; i < 4; i++) {
            midi.sendShortMsg(0x93 + deckNumber, 0x14 + i, ledOff);
        }
    };

    this.currentMode = this.modes[NumarkPartyMix.PadModeControls.HOTCUE];
};
NumarkPartyMix.PadSection.prototype = Object.create(components.ComponentContainer.prototype);


NumarkPartyMix.ModeHotcue = function (deckNumber) {
    components.ComponentContainer.call(this);

    this.control = NumarkPartyMix.PadModeControls.HOTCUE;

    this.connections = new components.ComponentContainer();
    for (var i = 0; i < 4; i++) {
        this.connections[i] = new components.HotcueButton({
            group: "[Channel" + deckNumber + "]",
            midi: [0x93 + deckNumber, 0x14 + i],
            number: i + 1,
            outConnect: false
        });
    }
};
NumarkPartyMix.ModeHotcue.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.ModeLoop = function (deckNumber) {
    components.ComponentContainer.call(this);

    this.control = NumarkPartyMix.PadModeControls.AUTOLOOP;

    this.connections = new components.ComponentContainer();
    for (var i = 0; i < 4; i++) {
        this.connections[i] = new components.Button({
            group: "[Channel" + deckNumber + "]",
            midi: [0x93 + deckNumber, 0x14 + i],
            size: NumarkPartyMix.autoLoopSizes[i],
            // shift: function () {
            //     this.inKey = "beatlooproll_" + this.size + "_activate";
            //     this.outKey = "beatlooproll_" + this.size + "_activate";
            // },
            // unshift: function () {
            //     this.inKey = "beatloop_" + this.size + "_toggle";
            //     this.outKey = "beatloop_" + this.size + "_enabled";
            // },
            inKey: "beatloop_" + NumarkPartyMix.autoLoopSizes[i] + "_toggle",
            outKey: "beatloop_" + NumarkPartyMix.autoLoopSizes[i] + "_enabled",
        outConnect: false
        });
    }
};
NumarkPartyMix.ModeLoop.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.ModeSampler = function (deckNumber) {
    components.ComponentContainer.call(this);
    this.control = NumarkPartyMix.PadModeControls.SAMPLER;

    this.connections = new components.ComponentContainer();
    for (var i = 0; i < 4; i++) {
        this.connections[i] = new components.SamplerButton({
            midi: [0x93 + deckNumber, 0x14 + i],
            number: 1 + i,
            outConnect: false
        });
    }
};
NumarkPartyMix.ModeSampler.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.ModeBeatjump = function (deckNumber) {
    components.ComponentContainer.call(this);

    this.control = NumarkPartyMix.PadModeControls.BEATJUMP;

    const jumps = [
        "beatjump_1_backward",
        "beatjump_1_forward",
        "beatjump_4_backward",
        "beatjump_4_forward"
    ];

    this.connections = new components.ComponentContainer();
    var p = this.connections;

    // print("modebeatjumpinit")
    // midi.sendShortMsg(0x93+deckNumber, 0x14, 0x01);
    // midi.sendShortMsg(0x93+deckNumber, 0x15, 0x7f);
    // midi.sendShortMsg(0x93+deckNumber, 0x16, 0x01);
    // midi.sendShortMsg(0x93+deckNumber, 0x17, 0x7f);

    jumps.forEach(function (jump, i) {
        p[i] = new components.Button({
            midi: [0x93 + deckNumber, 0x14 + i],
            // input: function (channel, control, value, status, group) {
            //     if (this.isPress(channel, control, value)) {
            //         engine.setParameter("[Channel" + deckNumber + "]", jump, 1);
            //     }
            // },
            group: "[Channel" + deckNumber + "]",
            inKey: jump,
            outKey: jump,
            outConnect: false
        });
    })
};
NumarkPartyMix.ModeBeatjump.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.Browse = function() {
    var pressturn = false;

    this.knob = new components.Encoder({
        input: function(channel, control, value) {
            var direction;
            if (pressturn) {
                if (value > 0x40) {
                    engine.setParameter("[Library]", "MoveFocusForward", 1);
                } else {
                    engine.setParameter("[Library]", "MoveFocusBackward", 1);
                }
            } else {
                direction = (value > 0x40) ? -1 : 1;
                engine.setParameter("[Library]", "MoveVertical", direction);
            }
        }
    });

    this.knobButton = new components.Button({
        group: "[Library]",
        type: components.Button.prototype.types.powerWindow,
        isLongPressed: false,
        input: function(channel, control, value, status) {
            pressturn = this.isPress(channel, control, value, status);
            if (pressturn) {
                this.inToggle();
                this.isLongPressed = false;
                this.longPressTimer = engine.beginTimer(this.longPressTimeout, function() {
                    this.isLongPressed = true;
                    this.longPressTimer = 0;
                }, true);
            } else {
                this.inToggle();
                if (this.longPressTimer !== 0) {
                    engine.stopTimer(this.longPressTimer);
                    this.longPressTimer = 0;
                }
                this.isLongPressed = false;
            }
        },
        inToggle: function() {
            if (! (pressturn || this.isLongPressed)) {
                engine.setParameter("[Library]", "GoToItem", 1);
            }
        }
    });
};
NumarkPartyMix.Browse.prototype = new components.ComponentContainer();


NumarkPartyMix.Gains = function () {
    this.mainGain = new components.Pot({
        group: "[Master]",
        inKey: "gain"
    });

    this.cueGain = new components.Pot({
        group: "[Master]",
        inKey: "headGain"
    });

    this.cueMix = new components.Pot({
        group: "[Master]",
        inKey: "headMix"
    });

    // this.gain = new components.Pot({
    //     inKey: "pregain"
    // });

    this.pfl1 = new components.Button({
        midi: [0x90, 0x1B],
        // group: "[Channel1]",
        key: "pfl",
        output: function(value) {
            var note = (value === 0x00 ? 0x80 : 0x90);
            midi.sendShortMsg(note, 0x1B, this.outValueScale(value));
        }
    });

    this.pfl2 = new components.Button({
        midi: [0x91, 0x1B],
        // group: "[Channel2]",
        key: "pfl",
        output: function(value) {
            var note = (value === 0x00 ? 0x81 : 0x91);
            midi.sendShortMsg(note, 0x1B, this.outValueScale(value));
        }
    });

    this.scratchAsPfl3 = new components.Button({
        type: components.Button.prototype.types.toggle,
        midi: [0x90, 0x07],
        group: "[Channel3]",
        key: 'pfl',
    });
    this.scratchAsPfl4 = new components.Button({
        type: components.Button.prototype.types.toggle,
        midi: [0x91, 0x07],
        group: "[Channel4]",
        key: 'pfl',
    });

    this.volume1 = new components.Pot({
        group: "[Channel1]",
        inKey: "volume"
    });

    // reuse gain for treble
    this.treble1 = new components.Pot({
        group: "[EqualizerRack1_[Channel1]_Effect1]",
        inKey: "parameter3"
    });

    // reuse treble for mid
    this.mid1 = new components.Pot({
        group: "[EqualizerRack1_[Channel1]_Effect1]",
        inKey: "parameter2"
    });

    this.bass1 = new components.Pot({
        group: "[EqualizerRack1_[Channel1]_Effect1]",
        inKey: "parameter1"
    });

    this.volume2 = new components.Pot({
        group: "[Channel2]",
        inKey: "volume"
    });

    // reuse gain for treble
    this.treble2 = new components.Pot({
        group: "[EqualizerRack1_[Channel2]_Effect1]",
        inKey: "parameter3"
    });

    // reuse treble for mid
    this.mid2 = new components.Pot({
        group: "[EqualizerRack1_[Channel2]_Effect1]",
        inKey: "parameter2"
    });

    this.bass2 = new components.Pot({
        group: "[EqualizerRack1_[Channel2]_Effect1]",
        inKey: "parameter1"
    });

    this.volume3 = new components.Pot({
        group: "[Channel3]",
        inKey: "volume"
    });

    this.volume4 = new components.Pot({
        group: "[Channel4]",
        inKey: "volume"
    });

    // this.filter = new components.Pot({
    //     group: "[QuickEffectRack1_" + this.currentDeck + "]",
    //     inKey: "super1"
    // });

    // this.pitch = new components.Pot({
    //     inKey: "rate",
    //     invert: false
    // });

};
NumarkPartyMix.Gains.prototype = new components.ComponentContainer();

NumarkPartyMix.wheelTurn = function (channel, control, value, status, group) {
    var newValue = value;
    if (value >= 64) {
        // correct the value if going backwards
        newValue -= 128;
        engine.setValue(group, "rate_perm_down_small",1)
    } else {
        engine.setValue(group, "rate_perm_up_small",1)
    }

    // print(script.deckFromGroup(group));
    // if (NumarkPartyMix.deck[channel].scratchModeEnabled && script.deckFromGroup(group)) {
    //     // scratch
    //     engine.scratchTick(script.deckFromGroup(group), newValue); // Scratch!
    // } else {
    //     // jog
    //     print(newValue);
    //     engine.setValue(group, "jog", newValue / NumarkPartyMix.jogPitchSensitivity);
    // }
};
