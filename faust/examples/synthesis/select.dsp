import("stdfaust.lib");

wave1 = os.triangle(440);
wave2 = os.square(440);

switch_gui = nentry("waveform", 0, 0, 1, 1);

process = wave1, wave2 : select2(switch_gui) * 0.25;