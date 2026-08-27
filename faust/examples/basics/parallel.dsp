import("stdfaust.lib");

// Here, we use the Parallel Operator ','
// to put two signals in parallel:
process = (os.oscrc(440) * 0.25), (os.oscrc(880) * 0.25);