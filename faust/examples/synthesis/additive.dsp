import("stdfaust.lib");

// Use the 'par' primitive, which allows to 
// programatically put signal expressions 
// in parallel.
sine8 = par(n, 8, os.osci(220*(n+1)));
process = sine8 :> _ * 1/16 <: _,_;

// OR we could list the frequencies that we want manually:
frequencies = (220, 440, 550, 551, 880, 1200);

// And connect to a parallel group of sine oscillators:
process = frequencies 
        : par(i, 6, os.osci) 
        :> _ 
        : /(12) 
        <: _,_;