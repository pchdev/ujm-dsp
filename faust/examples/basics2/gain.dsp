import("stdfaust.lib");

// We add the '[style:knob]' metadata,
// and we also specify the unit:
gain = hslider("gain[style:knob][unit:dB]", -6, -96, 6, 1) : ba.db2linear;

saw_freq = hslider("saw_freq[unit:Hz]", 440, 20, 10000, 1);
cutoff = hslider("cutoff[unit:Hz]", 440, 20, 10000, 1);

saw_filter = os.sawtooth(saw_freq) : fi.lowpass(1, cutoff);

process =  saw_filter * gain <: _,_;