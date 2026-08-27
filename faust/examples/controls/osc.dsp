import("stdfaust.lib");

// https://faustdoc.grame.fr/manual/osc/
// listening port: 5510
declare options "[osc:on]";

// sliders
oscFreq = hslider("oscFreq [osc:/oscillator/freq]", 80, 50, 500, 0.01);
lfoFreq = hslider("lfoFreq [osc:/lfo/freq]", 1, 0.01, 8, 0.01);
lfoRange = hslider("lfoRange [osc:/lfo/range]", 1000, 10, 5000, 0.01) : si.smoo;
noiseGain = hslider("noiseGain [osc:/noise/gain]", 0, 0, 1, 0.01) <: _*_;
masterVol = hslider("masterVol [osc:/master/volume]", 0.8, 0, 1, 0.01) <: _*_;
panning = hslider("pan [osc:/master/panning]", 0.5, 0, 1, 0.01)  : si.smoo;

// buttons
activateNoise = button("activateNoise [osc:/noise/enabled]");
killSwitch = 1-button("killSwitch [osc:/master/kill]");
LFO = os.lf_triangle(lfoFreq) * 0.5 + 0.5;

process = os.oscrc(440) * 0.25 
        * killSwitch 
        * os.sawtooth(oscFreq) 
        + no.noise * noiseGain * activateNoise 
        : fi.resonlp(LFO * lfoRange + 50, 5, 1)
        * masterVol 
        <: _ * (1-panning), _ * panning;

