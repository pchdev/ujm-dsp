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

del_l = hslider("Delay (left)", 0.25, 0, 5, 0.1) : ba.sec2samp;
del_r = hslider("Delay (right)", 0.5, 0, 5, 0.1) : ba.sec2samp;
drywet = hslider("Dry/Wet [style:knob]", 0.5, 0, 1, 0.01);

// Define our stereo delay:
del(x) = 
    x * (1-drywet) + (x @ del_l) * drywet, 
    x * (1-drywet) + (x @ del_r) * drywet;

process = osc * env : del;