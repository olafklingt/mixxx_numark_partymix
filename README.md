# Numark PartyMix MIDI controller mappings for Mixxx

* [Mixxx Wiki Page for Numark Party Mix Controller](https://github.com/mixxxdj/mixxx/wiki/Numark-Party-Mix)  
* [Manufacturer's product page](https://www.numark.com/product/party-mix//)  
* [Mixxx Community Forum thread](https://mixxx.discourse.group/t/numark-party-mix-midi-mapping/16712/42)
* [git repository](https://github.com/olafklingt/mixxx_numark_partymix)

This is a complete rewrite of the Numark Party Mix Controller on the basis of [Numark Mixtrack Pro FX](https://github.com/mixxxdj/mixxx/blob/main/res/controllers/Numark%20Mixtrack%20Pro%20FX.midi.xml)

This repository is primarily for variations that I find useful.

The code is not beautiful. I don't know if very line makes something useful and I don't care because It Works For Me(tm). Please don't look at it if you don't want to use it, if it doesn't work for you feel free to contact me.

# Installation

Put the .xml and the .js files in the user controller mapping folder or the system controller mapping folder of your Mixxx installation. More detailed information about where to place these files is available in the Mixxx documentation: [Controller Mapping File Locations](https://www.mixxx.org/wiki/doku.php/controller_mapping_file_locations)

# Variants

__Numark Party Mix__ - original mapping

__Numark Party Mix TMB__ - Instead of Gain Treble Bass the 3 Knobs are used for Treble Middle Bass

__Numark Party Mix GMQ__ - Instead of Gain Treble Bass the 3 Knobs are used for: Gain Middle QuickEffect (usually "HP/LP" Filter)

__Numark Party Mix 4Deck__ - use load button 1 2 to switch to deck 3 or 4 use "Party Lights" to indicate lower decks

## Strongly modified variants

These variants are for 4 Decks and provide what is most useful for me.

The use:

- use load button 1 2 to switch to deck 3 or 4 and use "Party Lights" to indicate lower decks

- 4 faders for volume (assign speed/pitch Fader to volume of Deck 3+4) 

- 4 round buttons for pfl (use scratch enable button for pfl of Deck 3+4)

- Jogweels are used to control speed/pitch relatively (this makes it is easy to make both rapid and minimal speed changes)

- The 4 Pad modes are:
    
    - Cue

    - Loop

    - Beat Jump +-1 +-4

    - Beat Jump +-8 +-16

__Numark Party Mix GMQ 4Decks 4Faders NoScratch__ - variant with Gain Mid and QuickEffect (usually "HP/LP" Filter)

__Numark Party Mix QTB 4Decks 4Faders NoScratch__ - variant with QuickEffect (usually "HP/LP" Filter) Treble EQ and Bass EQ
