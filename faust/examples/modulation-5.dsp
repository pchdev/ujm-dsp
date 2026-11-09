import("stdfaust.lib");

// Generates a random number at a certain frequency:
noise = no.lfnoise(10);

// Trigger when condition is true and different
// than last state:
trigger_if(c) = (c & (c != _)) ~ _;

// When noise is > 0, trigger the envelope:
envelope = trigger_if(noise > 0) : en.ar(0.125, 0.125);

// Noise * 880 means min: -880, max: 880
// We add a lower offset of 1080
// Frequency will go randomly from 200 to 1960 (1080 + 880)
process = os.osci((noise * 880) + 1080) 
        * envelope  
        * 0.25 <: _,_;
