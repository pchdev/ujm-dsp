import("stdfaust.lib");

cutoff = hslider("cutoff[unit:Hz]", 200, 20, 5000, 1);

// Compile-time constant,
// Cannot be used with a slider:
ORDER = 1;

process = os.sawtooth(220) : fi.lowpass(ORDER, cutoff);
