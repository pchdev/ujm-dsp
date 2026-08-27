import("stdfaust.lib");
// https://faustlibraries.grame.fr/libs/physmodels

// Guitars:
guitar1 = pm.elecGuitar_ui_MIDI;
guitar2 = pm.nylonGuitar_ui_MIDI;
guitar3 = pm.guitar_ui_MIDI;

// Orchestral:
violin = pm.violin_ui_MIDI;
clarinet = pm.clarinet_ui_MIDI;
brass = pm.brass_ui_MIDI;
flute = pm.flute_ui_MIDI

// Percussions:
djembe = pm.djembe_ui_MIDI;
marimba = pm.marimba_ui_MIDI;

// Bells:
bell1 = pm.churchBell_ui;
bell2 = pm.englishBell_ui;
bell3 = pm.frenchBell_ui;
bell4 = pm.germanBell_ui;
bell5 = pm.russianBell_ui;
bell6 = pm.standardBell_ui;

// Voice:
vocal = pm.SFFormantModelBP_ui;
