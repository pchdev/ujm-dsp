import("stdfaust.lib");

// Simple sine oscillator at low frequency:
osc = os.osci(110);

// We use an ADSR envelope, to make it percussive:
env = button("play") : en.adsr(
    0.0125, // attack time (s)
    0.25, // decay time (s)
    0.0, // sustain level
    0.0 // release time
);

// Define our stereo delay,
// with constant delay times:
del(x) = 
    x + x @ ba.sec2samp(0.5), 
    x + x @ ba.sec2samp(0.25);

process = osc * env : del;