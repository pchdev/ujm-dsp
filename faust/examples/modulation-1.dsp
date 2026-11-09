import("stdfaust.lib");

// Basic amplitude modulation:
// First oscillator is called the 'carrier'
// the other is called 'modulator':
process = os.osci(440) * os.osci(1)
        * 0.25
       <: _,_;

// Let's also try with frequency!
