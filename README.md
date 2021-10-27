# Numark PartyMix MIDI controller mappings for Mixxx

![Image of NuMark PartyMix MIDI Controller](https://camo.githubusercontent.com/0e0a99eb9c5bd829144071d8ec9ca91ebf875c901a9fee27df7977f0c0824a88/68747470733a2f2f617773312e646973636f757273652d63646e2e636f6d2f66726565312f75706c6f6164732f6d697878782f6f726967696e616c2f32582f312f313664343164613861646664646634366332303537326539626331623162343734313839646561392e6a706567)

* [Mixxx Wiki Page for Numark Party Mix Controller](https://github.com/mixxxdj/mixxx/wiki/Numark-Party-Mix)  
* [Manufacturer's product page](https://www.numark.com/product/party-mix//)  
* [Mixxx Community Forum thread](https://mixxx.discourse.group/t/numark-party-mix-midi-mapping/16712/20)

Work for this mapping was done by collaboration of the Mixxx community members at the [Numark Party Mix release announcement on the Mixxx community forums](https://www.mixxx.org/forums/viewtopic.php?f=7&t=9232&start=10#p38408) with special thanks to:
[DJ_Dexter](https://mixxx.discourse.group/u/dj_dexter/summary), [DarkPoubelle](https://mixxx.discourse.group/u/darkpoubelle/summary), [bearforce](https://mixxx.discourse.group/u/bearforce), [chriz](https://mixxx.discourse.group/u/chriz) , and [rylito](https://mixxx.discourse.group/u/rylito)

# Installation

Put the .xml and the .js files in the user controller mapping folder or the system controller mapping folder of your Mixxx installation. More detailed information about where to place these files is available in the Mixxx documentation: [Controller Mapping File Locations](https://www.mixxx.org/wiki/doku.php/controller_mapping_file_locations)

# Features

- Supports Numark's SysEx message so when the PartyMix is plugged in and Mixxx loads, the controls in Mixxx should 'snap' to match the state they are in on the controller
- Pad function notes:
    - Cue mode: is mapped to the hotcue buttons in the UI for each deck
    - Loop mode: pads 1,2,3, and 4 are mapped to the 1,2,4, and 8 beat beatloop controls for each deck
    - Sampler mode:
        - Deck 1 pads are mapped to toggle playback on samplers 1-4 if loaded, or to load the selected track if no track is loaded
        - If using the Deere skin which supports a sample bank, the Deck 2 pads will select the relevant sample bank and the Deck 1 pads will change accordingly
        - The behavior of the LEDs can be changed in the script by setting the USE_FLASH boolean value at the top. The default behavior is for the pad to be dark when no track is loaded, dimly lit when a track is loaded, and brightly lit while a sample is playing. This can be changed to be dimly lit when no track is loaded, brightly lit when a track is loaded, and flashing while a sample is playing
    - Effect mode:
        - Deck 1 pads 1 and 2 toggle effects units 1 and 2 and Deck 2 pads 1 and 2 toggle effects units 3 and 4
        - Pads 3 and 4 are currently mapped to the brake and spinback effects for each respective deck
- The Scratch button can be pressed quickly to 'latch' (toggle) from Vinyl mode into Scratch mode. If it is held down, it will stay in Scratch mode until released
- Rotary browse control notes:
    - A quick press toggles between scrolling the sidepane or the main browsing pane
    - Rotating scrolls up/down the list
    - If focused on the side pane and hovering over an expandable item, a long press of the browse control will toggle expand/collapse of the item

## Other Notes:

- If you're not using the Deere skin, the Deck 2 pads will remain dimly lit in Sampler mode since the other skins do not support sample banks. If you would rather disable this feature, so that the Deck 2 pad LEDs remain off in Sampler mode when using other skins, this can be done by setting the **USE_SAMPLE_BANK** boolean setting at the top of the script
- The rate (pitch) sliders for each deck are reversed on this controller. In order for them to move in the same direction on the UI as they do on the physical controller, go into the **Options -> Interface -> Speed Slider Direction** and select **Down Increases Speed (Technics SL-1210)**.
