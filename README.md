# Numark PartyMix MIDI controller mappings for Mixxx

![Image of NuMark PartyMix MIDI Controller](https://camo.githubusercontent.com/0e0a99eb9c5bd829144071d8ec9ca91ebf875c901a9fee27df7977f0c0824a88/68747470733a2f2f617773312e646973636f757273652d63646e2e636f6d2f66726565312f75706c6f6164732f6d697878782f6f726967696e616c2f32582f312f313664343164613861646664646634366332303537326539626331623162343734313839646561392e6a706567)

* [Mixxx Wiki Page for Numark Party Mix Controller](https://github.com/mixxxdj/mixxx/wiki/Numark-Party-Mix)  
* [Manufacturer's product page](https://www.numark.com/product/party-mix//)  
* [Mixxx Community Forum thread](https://mixxx.discourse.group/t/numark-party-mix-midi-mapping/16712/20)
* [git repository](https://github.com/olafklingt/mixxx_numark_partymix)

Work for this mapping was done by collaboration of the Mixxx community members at the [Numark Party Mix release announcement on the Mixxx community forums](https://www.mixxx.org/forums/viewtopic.php?f=7&t=9232&start=10#p38408) with special thanks to:
[DJ_Dexter](https://mixxx.discourse.group/u/dj_dexter/summary), [DarkPoubelle](https://mixxx.discourse.group/u/darkpoubelle/summary), [bearforce](https://mixxx.discourse.group/u/bearforce), [chriz](https://mixxx.discourse.group/u/chriz) , [rylito](https://mixxx.discourse.group/u/rylito), [angelfive](https://mixxx.discourse.group/u/fiveangle) , i restarted writing the mapping for 2.3 on the basis of (Numark Mixtrack Pro FX)
[https://mixxx.discourse.group/t/numark-mixtrack-pro-fx/19561] mapping.

# Installation

Put the .xml and the .js files in the user controller mapping folder or the system controller mapping folder of your Mixxx installation. More detailed information about where to place these files is available in the Mixxx documentation: [Controller Mapping File Locations](https://www.mixxx.org/wiki/doku.php/controller_mapping_file_locations)

# Features

- Supports Numark's SysEx message so when the PartyMix is plugged in and Mixxx loads, the controls in Mixxx should 'snap' to match the state they are in on the controller.
- switch off "party" leds on initialization.
- Pad function notes:
    - Cue mode: is mapped to the hotcue buttons in the UI for each deck
    - Loop mode: pads 1,2,3, and 4 are mapped to the 4,8,16 and 32 beat beatloop controls for each deck
    - Sampler mode:
        - Deck 1 pads are mapped to toggle playback on samplers 1-4 if loaded, or to load the selected track if no track is loaded. This functionality is currently quite dangerous because we don't have a shift function to stop/unload the track/sample.
    - Effect mode is used for Beatjump:
        - Pad 1: beatjump 1 Beat backward
        - Pad 2: beatjump 1 Beat forward
        - Pad 3: beatjump 4 Beat backward
        - Pad 4: beatjump 4 Beat forward

- The Scratch button switches between jug mode and scratch mode
- Rotary browse control notes:
    - A quick press toggles between scrolling the sidepane or the main browsing pane
    - Rotating scrolls up/down the list
    - ~~If focused on the side pane and hovering over an expandable item, a long press othe browse control will toggle expand/collapse of the item~~(todo)

