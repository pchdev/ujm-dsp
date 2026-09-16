import("stdfaust.lib");

cutoff = hslider("cutoff[unit:Hz]", 200, 20, 5000, 1);

process = os.sawtooth(220) : fi.lowpass(2, cutoff);
