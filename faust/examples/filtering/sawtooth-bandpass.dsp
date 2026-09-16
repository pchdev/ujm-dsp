import("stdfaust.lib");

cutoff = hslider("cutoff[unit:Hz]", 1000, 20, 5000, 1);

process = os.sawtooth(220) : fi.bandpass(1, cutoff-100, cutoff+100);
