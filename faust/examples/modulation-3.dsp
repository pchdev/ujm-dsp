import("stdfaust.lib");

// Envelopes are available with the 'en' prefix:
gate = button("Trigger!");

env = gate : en.adsr(
    hslider("Attack[unit:ms]", 0.5, 0, 1, 0.01) : si.smoo,
    hslider("Decay[unit:ms]", 0.5, 0, 1, 0.01) : si.smoo,
    hslider("Sustain", 0.5, 0, 1, 0.01) : si.smoo,
    hslider("Release[unit:ms]", 0.5, 0, 1, 0.01) : si.smoo
);

process = os.osci(440)
        * env
        * 0.25
       <: _,_;

// Now, let's try to add a lowpass filter,
// and modulate the cutoff frequency with the same envelope
