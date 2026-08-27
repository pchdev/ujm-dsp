import("stdfaust.lib");

declare author "Pierre Cochard"

sine(f) = os.osci(f);
triangle(f) = os.triangle(f);
sawtooth(f) = os.sawtooth(f);
square(f) = os.square(f);

onoff = checkbox("on/off");

switch_gui(n) = nentry(
    "waveform %n[style:menu{
        'Sine':0; 'Triangle':1; 
        'Sawtooth':2; 'Square':3
    }]",
    0, 0, 3, 1
);

freq(n) = hslider("Osc. %n frequency", 60, 0, 127, 1) 
        : ba.midikey2hz;

gain(n) = hslider("Osc. %n amplitude", 0, 0, 1, 0.01);

voice(n, f) = sine(f), triangle(f), sawtooth(f), square(f) 
            : ba.selectn(4, switch_gui(n));

process = par(n, 3, voice(n, freq(n)) * gain(n)) 
        :> _        // merge
        : *(1/3)    // div. volume 
        <: _,_      // expand to stereo
;