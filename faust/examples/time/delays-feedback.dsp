import("stdfaust.lib");

osc = os.osci(440);

// n: delay length (in samples)
// f: feedback coeff. [0, 1]
// x: input signal to be delayed
dfb(n, f, x) = (x + (_ * f)) @ n ~ _;

// We use an ADSR envelope, to make it percussive:
env = button("play") : en.adsr(
    0.0125, // attack time (s)
    0.25, // decay time (s)
    0.0, // sustain level
    0.0 // release time
);

del_l = hslider("Delay (left)", 0.25, 0, 5, 0.1) : ba.sec2samp;
del_r = hslider("Delay (right)", 0.5, 0, 5, 0.1) : ba.sec2samp;
fbk_l = hslider("Feedback (left)", 0.5, 0, 0.9, 0.01);
fbk_r = hslider("Feedback (right)", 0.5, 0, 0.9, 0.01);
drywet = hslider("Dry/Wet [style:knob]", 0.5, 0, 1, 0.01);

// Define our stereo delay:
del(x) = x * (1-drywet) + dfb(del_l, fbk_l, x) * drywet, 
         x * (1-drywet) + dfb(del_r, fbk_r, x) * drywet;

process = osc * env : del;