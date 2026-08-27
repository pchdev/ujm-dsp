import("stdfaust.lib");

// We can declare our custom functions:
osc440 = os.oscrc(440) * 0.25;
osc880 = os.oscrc(880) * 0.25;

// And call them from anywhere:
process = osc440, osc880;