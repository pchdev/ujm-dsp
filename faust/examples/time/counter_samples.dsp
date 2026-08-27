import("stdfaust.lib");

// We could use our previous definition 
// of the counter, and wrap it around the 
// value of the sample rate (using modulo)
// But there's going to be something wrong
// with it...
increment = (_ + 1) ~ _;
bad_counter = increment % 48000;

// This solution works:
counter = ((_ + 1) % 48000) ~ _;
//        (     A         ) ~ B

// We can put all of this in a function
// and make the limit of the counter variable:
counter(n) = ((_ + 1) % n) ~ _;

process = counter(ma.SR);