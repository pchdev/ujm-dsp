import("stdfaust.lib");

SR = 48000;
gui = vbargraph("value[style:numerical]", 0, SR);

// We make the '1' (increment) variable:
counter(i, n) = ((_ + i) % n) ~ _;

// Outputs the value '1' 
// whenever the counter reaches 48000
// (every second):
count1s = counter(1, SR) == 0;

process = counter(count1s, 4) : gui;