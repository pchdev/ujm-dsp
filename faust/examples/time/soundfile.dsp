import("stdfaust.lib");

// We declare a root directory, 
// from which we can retrieve a 
// collection of sound files:
declare soundfiles "https://raw.githubusercontent.com/sletz/faust-sampler/main";

// We declare a soundfile with one output (mono); 
violin = soundfile("sound[url:{'violon.wav'}]", 1) : (!,!,_);

// Play for 5 seconds:
length = ma.SR * 5;

counter(i, n) = ((_ + i) % n) ~ _;
sampler(s) = 0, counter(s, length) : violin;

process = sampler(1);


