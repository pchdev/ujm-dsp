import("stdfaust.lib");

// 'h:' horizontal group
// 'v:' vertical group
// 't:' tab group
// [0]: order of appearance
osc(n) = os.osci(
    hslider("h:oscillators/v:%n/[0]freq", 440, 20, 20000, 0.1)
) * hslider("h:oscillators/v:%n/[1]gain", 0, 0, 1, 0.01);

process = osc(0), osc(1);