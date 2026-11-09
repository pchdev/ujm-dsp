import("stdfaust.lib");

// f: frequency (Hertz)
// c: speed (Hertz)
// d: depth (amplitude)
vibrato(f, c, d) = f + (f * os.osc(c) * d);

synth = os.sawtooth(vibrato(
    hslider("Frequency[unit:Hz]", 220, 20, 800, 1) : si.smoo, 
    hslider("Vibrato speed[unit:Hz]", 10, 0.125, 30, 1) : si.smoo, 
    hslider("Vibrato depth", 0.25, 0, 1, 0.01) : si.smoo
)) : fi.lowpass(2, 880);

process = synth * 0.25 <: _,_;
