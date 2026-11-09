import("stdfaust.lib");

drive = hslider("drive[unit:dB]", 3, -6, 24, 1) : ba.db2linear;

// Clamping 'x', high distortion/harmonics:
hardclip(x) = x * drive : max(-1) : min(1);

cubic(x) = 1.5 * (u - u^3/3) with {
    u = max(-1, min(1, x/1.5));
};

// Softclip:
softclip_tanh(x) = x * drive : ma.tanh;
softclip_cubc(x) = x * drive : cubic;

menu = nentry(
    "method[style:menu{'Hardclip':0; 'Softclip (tanh)':1; 'Softclip (cubic)':2}]",
    0, 0, 2, 1
);
x = os.osci(220);

process = x
    <: (hardclip, softclip_tanh, softclip_cubc)
     : ba.selectn(3, menu)
     : *(0.125)
    <: _,_;
