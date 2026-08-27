import("stdfaust.lib");

SR = 48000;
gui = vbargraph("value[style:numerical]", 0, SR);
counter(n) = ((_ + 1) % n) ~ _;

process = counter(SR): gui;