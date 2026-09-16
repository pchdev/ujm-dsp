import("stdfaust.lib");

cutoff = hslider("cutoff[unit:Hz]", 1000, 20, 5000, 1);

process = os.sawtooth(220) : fi.highpass(2, cutoff);
