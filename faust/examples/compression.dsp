import("stdfaust.lib");

// Noise bursts as input:
x = no.pink_noise * en.ar(0.02, 0.02, ba.pulse(ma.SR));

// Demo:
process = x <: dm.compressor_demo;

// Parameters:
process = x : co.compressor_mono(
    hslider("ratio", 4, 1, 20, 0.1), 
    hslider("threshold[unit:dB]", -9, -60, 0, 0.1), 
    hslider("attack[unit:s]", 0.01, 0, 1, 0.001), 
    hslider("release[unit:s]", 0.2, 0, 1, 0.001)
) * ba.db2linear(
        hslider("makeup [unit:dB]", 6, -48, 12, 1)
    )   
<: _,_;
