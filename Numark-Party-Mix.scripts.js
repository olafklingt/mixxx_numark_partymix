var NumarkPartyMix = {};

// jogwheel
NumarkPartyMix.jogScratchSensitivity = 1024;
NumarkPartyMix.jogScratchAlpha = 1; // do NOT set to 2 or higher
NumarkPartyMix.jogScratchBeta = 1 / 32;
NumarkPartyMix.jogPitchSensitivity = 10;

// autoloop sizes, for available values see:
// https://manual.mixxx.org/2.3/en/chapters/appendix/mixxx_controls.html#control-[ChannelN]-beatloop_X_toggle
NumarkPartyMix.autoLoopSizes = [
    "4",
    "8",
    "16",
    "32"
];

// dim all lights when inactive instead of turning them off
components.Button.prototype.off = 0x01;

// pad modes control codes
NumarkPartyMix.PadModeControls = {
    HOTCUE: 0x00,
    LOOP: 0x0B,
    SAMPLER: 0x0E,
    EFX: 0x18,
};

NumarkPartyMix.init = function(_id, _debugging) {
    /// init party led switch off
    midi.sendShortMsg(0xb0, 0x40, 0x00);//0x60 seems to be max
    midi.sendShortMsg(0xb0, 0x42, 0x00);
    midi.sendShortMsg(0xb0, 0x43, 0x00);
    /// init headphone led switch off
    midi.sendShortMsg(0x80, 0x1B, 0x00);
    midi.sendShortMsg(0x81, 0x1B, 0x00);

    // initialize component containers
    NumarkPartyMix.deck = new components.ComponentContainer();
    for (var i = 0; i < 2; i++) {
        NumarkPartyMix.deck[i] = new NumarkPartyMix.Deck(i + 1);
    }

    NumarkPartyMix.browse = new NumarkPartyMix.Browse();
    NumarkPartyMix.gains = new NumarkPartyMix.Gains();

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

NumarkPartyMix.shutdown = function() {
    // initialize leds
    var ledOff = components.Button.prototype.off;
    var ledOn = components.Button.prototype.on;

    // set modes back to HOTCUE
    midi.sendShortMsg(0x94, NumarkPartyMix.PadModeControls.HOTCUE, ledOn);
    midi.sendShortMsg(0x95, NumarkPartyMix.PadModeControls.HOTCUE, ledOn);

    // dim connections
    midi.sendShortMsg(0x84, 0x14, ledOff);
    midi.sendShortMsg(0x84, 0x15, ledOff);
    midi.sendShortMsg(0x84, 0x16, ledOff);
    midi.sendShortMsg(0x84, 0x17, ledOff);
    midi.sendShortMsg(0x85, 0x14, ledOff);
    midi.sendShortMsg(0x85, 0x15, ledOff);
    midi.sendShortMsg(0x85, 0x16, ledOff);
    midi.sendShortMsg(0x85, 0x17, ledOff);

    // dim LEDs for scratch buttons
    midi.sendShortMsg(0x90, 0x07, ledOff);
    midi.sendShortMsg(0x91, 0x07, ledOff);

    // untoggle (dim) PFL switches
    midi.sendShortMsg(0x80, 0x1B, ledOff);
    midi.sendShortMsg(0x81, 0x1B, ledOff);
};

NumarkPartyMix.Deck = function(deckNumber) {
    components.Deck.call(this, deckNumber);

    var channel = deckNumber - 1;
    var deck = this;
    this.scratchModeEnabled = false;

    this.playButton = new components.PlayButton({
        midi: [0x90 + channel, 0x00],
    });

    this.cueButton = new components.CueButton({
        midi: [0x90 + channel, 0x01],
    });

    this.syncButton = new components.SyncButton({
        midi: [0x90 + channel, 0x02],
    });

    this.headphoneButton = new components.Button({
        midi: [0x90 + channel, 0x1B],
        group: "[Channel" + deckNumber + "]",
        inKey: "pfl",
        outKey: "pfl",
        output: function() {
            if (engine.getParameter("[Channel" + deckNumber + "]", "pfl") === 1) {
                midi.sendShortMsg(0x90 + channel, 0x1B, 0x7F);
            } else {
                midi.sendShortMsg(0x80 + channel, 0x1B, 0x00);
            }
        }
    });

    this.loadButton = new components.Button({
        inKey: "LoadSelectedTrack"
    });

    this.volume = new components.Pot({
        inKey: "volume"
    });

    this.gain = new components.Pot({
        inKey: "pregain"
    });

    this.treble = new components.Pot({
        group: "[EqualizerRack1_" + this.currentDeck + "_Effect1]",
        inKey: "parameter3"
    });

    this.bass = new components.Pot({
        group: "[EqualizerRack1_" + this.currentDeck + "_Effect1]",
        inKey: "parameter1"
    });

    this.pitch = new components.Pot({
        inKey: "rate",
        invert: false
    });

    this.padSection = new NumarkPartyMix.PadSection(deckNumber);

    this.scratchToggle = new components.Button({
        midi: [0x90 + channel, 0x07],
        input: function(channel, control, value, _status, group) {
            if (!this.isPress(channel, control, value)) {
                return;
            }
            deck.scratchModeEnabled = !deck.scratchModeEnabled;
            if (deck.scratchModeEnabled) {
                engine.scratchEnable(script.deckFromGroup(group), NumarkPartyMix.jogScratchSensitivity, 33 + 1 / 3, NumarkPartyMix.jogScratchAlpha, NumarkPartyMix.jogScratchBeta, true);
            } else {
                engine.scratchDisable(script.deckFromGroup(group));
            }
            // change the scratch mode status light
            this.send(deck.scratchModeEnabled ? this.on : this.off);
        },
    });

    this.reconnectComponents(function(component) {
        if (component.group === undefined) {
            component.group = this.currentDeck;
        }
    });
};

NumarkPartyMix.Deck.prototype = new components.Deck();

NumarkPartyMix.PadSection = function(deckNumber) {
    components.ComponentContainer.call(this);

    // initialize leds
    var ledOff = components.Button.prototype.off;
    var ledOn = components.Button.prototype.on;
    midi.sendShortMsg(0x93 + deckNumber, 0x00, ledOn);

    this.modes = {};
    this.modes[NumarkPartyMix.PadModeControls.HOTCUE] = new NumarkPartyMix.ModeHotcue(deckNumber);
    this.modes[NumarkPartyMix.PadModeControls.LOOP] = new NumarkPartyMix.ModeLoop(deckNumber);
    this.modes[NumarkPartyMix.PadModeControls.SAMPLER] = new NumarkPartyMix.ModeSampler(deckNumber);
    this.modes[NumarkPartyMix.PadModeControls.EFX] = new NumarkPartyMix.ModeEFX(deckNumber);

    this.modeButtonPress = function(channel, control, _value) {
        this.setMode(channel, control);
    };

    this.padPress = function(channel, control, value, status, group) {
        var i = (control - 0x14) % 8;
        this.currentMode.connections[i].input(channel, control, value, status, group);
    };

    this.setMode = function(_channel, control) {
        var newMode = this.modes[control];
        this.currentMode.forEachComponent(function(component) {
            component.disconnect();
        });

        newMode.forEachComponent(function(component) {
            component.connect();
            component.trigger();
        });

        this.currentMode = newMode;
    };

    this.currentMode = this.modes[NumarkPartyMix.PadModeControls.HOTCUE];
};
NumarkPartyMix.PadSection.prototype = Object.create(components.ComponentContainer.prototype);


NumarkPartyMix.ModeHotcue = function(deckNumber) {
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

NumarkPartyMix.ModeLoop = function(deckNumber) {
    components.ComponentContainer.call(this);

    this.control = NumarkPartyMix.PadModeControls.AUTOLOOP;

    this.connections = new components.ComponentContainer();
    for (var i = 0; i < 4; i++) {
        this.connections[i] = new components.Button({
            group: "[Channel" + deckNumber + "]",
            midi: [0x93 + deckNumber, 0x14 + i],
            size: NumarkPartyMix.autoLoopSizes[i],
            inKey: "beatloop_" + NumarkPartyMix.autoLoopSizes[i] + "_toggle",
            outKey: "beatloop_" + NumarkPartyMix.autoLoopSizes[i] + "_enabled",
            outConnect: false
        });
    }
};
NumarkPartyMix.ModeLoop.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.ModeSampler = function(deckNumber) {
    components.ComponentContainer.call(this);
    this.control = NumarkPartyMix.PadModeControls.SAMPLER;
    var sampleoffset = (deckNumber - 1)*4;
    this.connections = new components.ComponentContainer();
    for (var i = 0; i < 4; i++) {
        this.connections[i] = new components.SamplerButton({
            midi: [0x93 + deckNumber, 0x14 + i],
            number: 1 + i + sampleoffset,
            outConnect: false,
            unshift: null,
            outKey: "play_indicator",
            input: function(channel, control, value, status, _group) {
                if (this.isPress(channel, control, value, status)) {
                    if (engine.getValue(this.group, "track_loaded") === 0) {
                        engine.setValue(this.group, "LoadSelectedTrack", 1);
                    } else {
                        if (engine.getValue(this.group, "play") === 1) {
                            engine.setValue(this.group, "start_stop", 1);
                        } else {
                            engine.setValue(this.group, "start_play", 1);
                        }
                    }
                }
            }
        });
    }
};
NumarkPartyMix.ModeSampler.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.ModeEFX = function(deckNumber) {
    components.ComponentContainer.call(this);

    // this.control = NumarkPartyMix.PadModeControls.EFX;

    var fx = [
        "[EffectRack1_EffectUnit" + deckNumber + "_Effect1]",
        "[EffectRack1_EffectUnit" + deckNumber + "_Effect2]",
        "[EffectRack1_EffectUnit" + deckNumber + "_Effect3]"
    ];

    this.connections = new components.ComponentContainer();
    var p = this.connections;

    fx.forEach(function(fx, i) {
        p[i] = new components.Button({
            midi: [0x93 + deckNumber, 0x14 + i],
            group: fx,
            inKey: "enabled",
            outKey: "enabled",
            outConnect: false
        });
    });
    p[3] = new components.Button({
        midi: [0x93 + deckNumber, 0x17],
        type: components.Button.prototype.types.toggle,
        group: "[EffectRack1_EffectUnit" + deckNumber + "]",
        inKey: "mix_mode",
        outKey: "mix_mode",
        output: function() {
            if (engine.getParameter("[EffectRack1_EffectUnit" + deckNumber + "]", "mix_mode") === 0) {
                midi.sendShortMsg(0x93 + deckNumber, 0x17, 0x7F); // cue
            } else {
                midi.sendShortMsg(0x83 + deckNumber, 0x17, 0x01); // cue
            }
        },
        outConnect: false
    });
};
NumarkPartyMix.ModeEFX.prototype = Object.create(components.ComponentContainer.prototype);

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
        input: function(channel, control, value, status, group) {
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

NumarkPartyMix.Gains = function() {
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
};
NumarkPartyMix.Gains.prototype = new components.ComponentContainer();

NumarkPartyMix.wheelTurn = function(channel, _control, value, _status, group) {
    var newValue = value;
    if (value >= 64) {
        // correct the value if going backwards
        newValue -= 128;
    }
    if (NumarkPartyMix.deck[channel].scratchModeEnabled && script.deckFromGroup(group)) {
        // scratch
        engine.scratchTick(script.deckFromGroup(group), newValue);
    } else {
        // jog
        engine.setValue(group, "jog", newValue / NumarkPartyMix.jogPitchSensitivity);
    }
};
