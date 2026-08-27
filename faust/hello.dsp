import("stdfaust.lib");

// Here, we use the 'oscrc' function
// from the 'os' (oscillators) library:
process = os.oscrc(440) * 0.25;
