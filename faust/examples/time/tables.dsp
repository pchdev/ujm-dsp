import("stdfaust.lib");

counter(i, n) = ((_ + i) % n) ~ _;

// We define a maximum length for our buffer:
BUFFER_MAX = 48000 * 5;

// r: read position in samples.
// w: write position in samples.
// x: input signal to write.
buffer(r, w, x) = rwtable(BUFFER_MAX, 0.0, w, x, r);

// Define our read/write cursors:
record = counter(button("record"), BUFFER_MAX) 
       : vbargraph("vrec[style:numerical]", 0, BUFFER_MAX);

play = counter(button("play"), BUFFER_MAX) 
     : vbargraph("vplay[style:numerical]", 0, BUFFER_MAX);

// And we have now a (very) simple looper:
process = buffer(play, record, _);

