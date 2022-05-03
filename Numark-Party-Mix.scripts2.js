var NumarkPartyMix = {};

// jogwheel
// I am not sure if the jogwheel is behaving consistently,
// or if my variables are wrong.
// If one is scratching the point in a track is moving.
// Maybe these variables need improvement.
NumarkPartyMix.jogScratchSensitivity = 340;
NumarkPartyMix.jogScratchAlpha = 1 / 8; // do NOT set to 2 or higher
NumarkPartyMix.jogScratchBeta = 1 / 8 / 32;
NumarkPartyMix.jogPitchSensitivity = 10;
NumarkPartyMix.jogSearchSensitivity = 1 / 2;

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
    BEATJUMP1: 0x0E,
    BEATJUMP2: 0x18,
};

NumarkPartyMix.scratchEnabled = {}; // holds state of scratch button for all decks

NumarkPartyMix.init = function(_id, _debugging) {
    /// init party led switch off
    midi.sendShortMsg(0xb0, 0x40, 0x00);//0x60 seems to be max
    midi.sendShortMsg(0xb0, 0x42, 0x00);
    midi.sendShortMsg(0xb0, 0x43, 0x00);
    /// init headphone led switch off
    midi.sendShortMsg(0x80, 0x1B, 0x00);
    midi.sendShortMsg(0x81, 0x1B, 0x00);

    // initialize component containers
    NumarkPartyMix.deck = new components.ComponentContainer({outConnect: false});
    for (var i = 0; i < 2; i++) {
        NumarkPartyMix.deck[i] = new NumarkPartyMix.Deck([i + 1, i + 3], i);
    }

    NumarkPartyMix.browse = new NumarkPartyMix.Browse();
    NumarkPartyMix.gains = new NumarkPartyMix.Gains();

    // 0x00 0x01 0x3F is Numark mfg. ID used in SysEx messages.
    midi.sendSysexMsg([0xF0, 0x00, 0x01, 0x3F, 0x38, 0x48, 0xF7]);

};

NumarkPartyMix.shutdown = function() {
    // initialize leds
    var ledOff = components.Button.prototype.off;
    var ledOn = components.Button.prototype.on;

    // modes HOTCUE
    midi.sendShortMsg(0x94, NumarkPartyMix.PadModeControls.HOTCUE, ledOn);
    midi.sendShortMsg(0x95, NumarkPartyMix.PadModeControls.HOTCUE, ledOn);

    // dim pads
    midi.sendShortMsg(0x84, 0x14, ledOff);
    midi.sendShortMsg(0x84, 0x15, ledOff);
    midi.sendShortMsg(0x84, 0x16, ledOff);
    midi.sendShortMsg(0x84, 0x17, ledOff);
    midi.sendShortMsg(0x85, 0x14, ledOff);
    midi.sendShortMsg(0x85, 0x15, ledOff);
    midi.sendShortMsg(0x85, 0x16, ledOff);
    midi.sendShortMsg(0x85, 0x17, ledOff);

    // scratch buttons
    midi.sendShortMsg(0x80, 0x07, ledOff);
    midi.sendShortMsg(0x81, 0x07, ledOff);

    // PFL switches
    midi.sendShortMsg(0x80, 0x1B, ledOff);
    midi.sendShortMsg(0x81, 0x1B, ledOff);

    // play buttons
    midi.sendShortMsg(0x80, 0x00, ledOff);
    midi.sendShortMsg(0x81, 0x00, ledOff);

    // cue buttons
    midi.sendShortMsg(0x80, 0x01, ledOff);
    midi.sendShortMsg(0x81, 0x01, ledOff);

    // sync buttons
    midi.sendShortMsg(0x80, 0x02, ledOff);
    midi.sendShortMsg(0x81, 0x02, ledOff);
};

NumarkPartyMix.Deck = function(deckNumbers, channel) {
    components.Deck.call(this, deckNumbers);

    this.playButton = new components.PlayButton({
        midi: [0x90 + channel, 0x00],
    });

    this.cueButton = new components.CueButton({
        midi: [0x90 + channel, 0x01],
    });

    this.syncButton = new components.SyncButton({
        midi: [0x90 + channel, 0x02],
    });

    this.headphoneButton12 = new components.Button({
        midi: [0x90 + channel, 0x1B],
        input: function(channel, _control, value, _status) {
            engine.setValue("[Channel" + (channel + 1) + "]", "pfl", value > 0 ? 1 : 0);
            this.output();
        },
        output: function() {
            deck = (script.deckFromGroup(this.group) - 1) % 2;
            var group12 = "[Channel" + (deck + 1) + "]";
            var value = engine.getValue(group12, "pfl") === 0 ? 0x00 : 0x7f;
            var note = (value > 0x00 ? 0x90 : 0x80) + deck;
            midi.sendShortMsg(note, 0x1B, value);
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

    this.middle = new components.Pot({
        group: "[EqualizerRack1_" + this.currentDeck + "_Effect1]",
        inKey: "parameter2"
    });

    this.bass = new components.Pot({
        group: "[EqualizerRack1_" + this.currentDeck + "_Effect1]",
        inKey: "parameter1"
    });

    this.quickEffect = new components.Pot({
        group: "[QuickEffectRack1_" + this.currentDeck + "]",
        inKey: "super1"
    });

    this.pitch = new components.Pot({
        inKey: "rate",
        invert: false
    });

    this.padSection = new NumarkPartyMix.PadSection(channel, this.currentDeck);

    this.scratchToggle = new components.Button({
        midi: [0x90 + channel, 0x07],
        input: function(_channel, _control, _value, _status) {
            NumarkPartyMix.scratchEnabled[this.group] = !NumarkPartyMix.scratchEnabled[this.group];
            if (!NumarkPartyMix.scratchEnabled[this.group]) {
                engine.scratchDisable(script.deckFromGroup(this.group));
            }
            this.output();
        },
        output: function() {
            this.send(NumarkPartyMix.scratchEnabled[this.group] ? this.on : this.off);
        }
    });

    this.wheelToSpeed = new components.Encoder({
        group: this.currentDeck,
        input: function(_channel, _control, value) {
            if (value >= 64) {
                engine.setValue(this.group, "rate_perm_down_small", 1);
            } else {
                engine.setValue(this.group, "rate_perm_up_small", 1);
            }
        }
    });

    this.wheelTurn = new components.Encoder({
        group: this.currentDeck,
        touchTimer: 0,
        touchTimout: 0,
        input: function(channel, _control, value, _status) {
            //clockwise (slow-fast) 0x01 - 0x06
            //counter-clockwise (slow-fast) 0x7F - 0x7A1212
            //transform counter-clockwise messages to negative values
            if (this.touchTimer !== 0) {
                engine.stopTimer(this.touchTimer);
                this.touchTimer = 0;
            }
            var newValue = value;
            if (value >= 0x40) {
                newValue -= 0x80;
            }

            if (NumarkPartyMix.scratchEnabled[this.group]) {
                this.touchTimer = engine.beginTimer(50, function() {
                    engine.scratchDisable(script.deckFromGroup(this.group));
                }, true);

                if (!engine.isScratching(script.deckFromGroup(this.group))) {
                    engine.scratchEnable(script.deckFromGroup(this.group), NumarkPartyMix.jogScratchSensitivity, 33 + 1 / 3, NumarkPartyMix.jogScratchAlpha, NumarkPartyMix.jogScratchBeta, true);
                }
                engine.scratchTick(script.deckFromGroup(this.group), newValue); // Scratch!
            } else {
                if (engine.getValue(this.group, "play") > 0) {
                    engine.setValue(this.group, "jog", newValue / NumarkPartyMix.jogPitchSensitivity); // fine jog to sync
                } else {
                    engine.setValue(this.group, "jog", newValue / NumarkPartyMix.jogSearchSensitivity); // scrup through track

                }
            }
        }
    });

    this.reconnectComponents(function(component) {
        if (component.group === undefined) {
            component.group = this.currentDeck;
        }
    });
};
NumarkPartyMix.Deck.prototype = new components.Deck();

NumarkPartyMix.PadSection = function(channel, currentDeck) {
    components.ComponentContainer.call(this);

    // initialize leds
    midi.sendShortMsg(0x94 + channel, 0x00, components.Button.prototype.on);

    this.modes = {};
    this.modes[NumarkPartyMix.PadModeControls.HOTCUE] = new NumarkPartyMix.ModeHotcue(channel, currentDeck);
    this.modes[NumarkPartyMix.PadModeControls.LOOP] = new NumarkPartyMix.ModeLoop(channel, currentDeck);
    this.modes[NumarkPartyMix.PadModeControls.BEATJUMP1] = new NumarkPartyMix.ModeBeatjump1(channel, currentDeck);
    this.modes[NumarkPartyMix.PadModeControls.BEATJUMP2] = new NumarkPartyMix.ModeBeatjump2(channel, currentDeck);

    this.padPress = function(channel, control, value, status) {
        var i = (control - 0x14) % 8;
        this.currentMode.connections[i].input(channel, control, value, status, this.group);
    };

    this.modeButtonPress = function(channel, control, _value) {
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

    this.group = currentDeck;
    this.currentMode = this.modes[NumarkPartyMix.PadModeControls.HOTCUE];
};
NumarkPartyMix.PadSection.prototype = Object.create(components.ComponentContainer.prototype);


NumarkPartyMix.ModeHotcue = function(channel, currentDeck) {
    components.ComponentContainer.call(this);

    this.control = NumarkPartyMix.PadModeControls.HOTCUE;

    this.connections = new components.ComponentContainer();
    for (var i = 0; i < 4; i++) {
        this.connections[i] = new components.HotcueButton({
            group: currentDeck,
            midi: [0x94 + channel, 0x14 + i],
            number: i + 1,
            outConnect: false
        });
    }
};
NumarkPartyMix.ModeHotcue.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.ModeLoop = function(channel, currentDeck) {
    components.ComponentContainer.call(this);

    this.control = NumarkPartyMix.PadModeControls.AUTOLOOP;

    this.connections = new components.ComponentContainer();
    for (var i = 0; i < 4; i++) {
        this.connections[i] = new components.Button({
            group: currentDeck,
            midi: [0x94 + channel, 0x14 + i],
            size: NumarkPartyMix.autoLoopSizes[i],
            inKey: "beatloop_" + NumarkPartyMix.autoLoopSizes[i] + "_toggle",
            outKey: "beatloop_" + NumarkPartyMix.autoLoopSizes[i] + "_enabled",
            outConnect: false
        });
    }
};
NumarkPartyMix.ModeLoop.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.ModeSampler = function(channel, currentDeck) {
    components.ComponentContainer.call(this);
    this.control = NumarkPartyMix.PadModeControls.SAMPLER;
    var sampleoffset = channel * 4;
    this.connections = new components.ComponentContainer();
    for (var i = 0; i < 4; i++) {
        this.connections[i] = new components.SamplerButton({
            group: currentDeck,
            midi: [0x94 + channel, 0x14 + i],
            number: 1 + i + sampleoffset,
            outConnect: false,
            unshift: null,
            outKey: "play_indicator",
            input: function(channel, control, value, status, group) {
                this.number = (((script.deckFromGroup(group) - 1) * 4) + control - 19);
                var sampler = "[Sampler" + this.number + "]";
                if (this.isPress(channel, control, value, status)) {
                    if (engine.getValue(sampler, "track_loaded") === 0) {
                        engine.setValue(sampler, "LoadSelectedTrack", 1);
                    } else {
                        if (engine.getValue(sampler, "play") === 1) {
                            engine.setValue(sampler, "start_stop", 1);
                        } else {
                            engine.setValue(sampler, "start_play", 1);
                        }
                    }
                }
            }
        });
    }
};
NumarkPartyMix.ModeSampler.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.ModeEFX = function(channel, currentDeck) {
    components.ComponentContainer.call(this);

    this.control = NumarkPartyMix.PadModeControls.EFX;

    var fx = [
        "_Effect1]",
        "_Effect2]",
        "_Effect3]"
    ];

    this.connections = new components.ComponentContainer();
    var p = this.connections;

    fx.forEach(function(fx, i) {
        p[i] = new components.Button({
            group: "[EffectRack1_EffectUnit" + script.deckFromGroup(currentDeck) + fx,
            midi: [0x94 + channel, 0x14 + i],
            key: "meta",
            outConnect: false
        });
    });
    p[3] = new components.Button({
        midi: [0x94 + channel, 0x17],
        type: components.Button.prototype.types.toggle,
        group: "[EffectRack1_EffectUnit" + script.deckFromGroup(currentDeck) + "]",
        inKey: "mix_mode",
        outKey: "mix_mode",
        output: function() {
            if (engine.getParameter("[EffectRack1_EffectUnit" + script.deckFromGroup(currentDeck) + "]", "mix_mode") === 0) {
                midi.sendShortMsg(0x94 + channel, 0x17, 0x7F);
            } else {
                midi.sendShortMsg(0x84 + channel, 0x17, 0x01);
            }
        },
        outConnect: false
    });
};
NumarkPartyMix.ModeEFX.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.ModeBeatjump1 = function(channel, currentDeck) {
    components.ComponentContainer.call(this);

    this.control = NumarkPartyMix.PadModeControls.BEATJUMP1;

    const jumps = [
        "beatjump_1_backward",
        "beatjump_1_forward",
        "beatjump_4_backward",
        "beatjump_4_forward"
    ];

    this.connections = new components.ComponentContainer();
    var p = this.connections;

    jumps.forEach(function (jump, i) {
        p[i] = new components.Button({
            group: currentDeck,
            midi: [0x94 + channel, 0x14 + i],
            inKey: jump,
            outKey: jump,
            outConnect: false
        });
    })
};
NumarkPartyMix.ModeBeatjump1.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.ModeBeatjump2 = function(channel, currentDeck) {
    components.ComponentContainer.call(this);

    this.control = NumarkPartyMix.PadModeControls.BEATJUMP2;

    const jumps = [
        "beatjump_8_backward",
        "beatjump_8_forward",
        "beatjump_16_backward",
        "beatjump_16_forward"
    ];

    this.connections = new components.ComponentContainer();
    var p = this.connections;

    jumps.forEach(function (jump, i) {
        p[i] = new components.Button({
            group: currentDeck,
            midi: [0x94 + channel, 0x14 + i],
            inKey: jump,
            outKey: jump,
            outConnect: false
        });
    })
};
NumarkPartyMix.ModeBeatjump2.prototype = Object.create(components.ComponentContainer.prototype);

NumarkPartyMix.Browse = function() {
    this.switchDeck = new components.Button({
        input: function(_channel, control, _value, _status, _group) {
            NumarkPartyMix.deck[control - 2].toggle();
            // really bad way to switch the lights with the deck
            NumarkPartyMix.deck[control - 2].scratchToggle.output();
            // the problem is that i still need to trigger the output of the right function
            NumarkPartyMix.deck[control - 2].headphoneButton12.output();
            var d = script.deckFromGroup(NumarkPartyMix.deck[control - 2].currentDeck);
            midi.sendShortMsg(0xb0, 0x42 + ((d) % 2), d > 2 ? 0x08 : 0);//use party light as indicator
            NumarkPartyMix.deck[control - 2].padSection.group = NumarkPartyMix.deck[control - 2].currentDeck;
        }
    });

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
            if (!(pressturn || this.isLongPressed)) {
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
