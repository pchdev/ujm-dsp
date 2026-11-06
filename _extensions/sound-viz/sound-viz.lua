local function default(value, fallback)
    if type(value) == "table" then
        return fallback
    end
    return value
end

local function debug_arg(name, value)
    io.stderr:write(
        "[sound-viz] " ..
        name ..
        ": type=" ..
        type(value) ..
        ", value=" ..
        tostring(value) ..
        "\n"
    )
end

function ripple(args, kwargs, meta)
  local amplitude = default(kwargs["amplitude"], "0.75")
  local frequency = default(kwargs["frequency"], "1")
  local speed = default(kwargs["speed"], "100")
  local id = "ripple-" .. tostring(math.random(100000, 999999))
  local html = string.format([[
<div
  class="ripple"
  id="%s"
  data-amplitude="%s"
  data-frequency="%s"
  data-speed="%s">
</div>
]], id, amplitude, frequency, speed)
  return pandoc.RawBlock("html", html)
end

function particles(args, kwargs, meta)
  local amplitude = default(kwargs["amplitude"], "15")
  local frequency = default(kwargs["frequency"], "1")
  local speed = default(kwargs["speed"], "80")
  local id = "particles-" .. tostring(math.random(100000, 999999))
  return pandoc.RawBlock("html", string.format([[
<div
  class="particles"
  id="%s"
  data-amplitude="%s"
  data-frequency="%s"
  data-speed="%s">
</div>
]], id, amplitude, frequency, speed))
end

function waveform(args, kwargs, meta)
  local amplitude = default(kwargs["amplitude"], "25")
  local frequency = default(kwargs["frequency"], "1")
  local waveform = default(kwargs["waveform"], "sine")
  local rate = default(kwargs["srate"], "5")
  local id = default(kwargs["id"], "default")
  return pandoc.RawBlock("html", string.format([[
    <div class="waveform-placeholder"
      data-waveform-id="%s"
      data-amplitude="%s"
      data-frequency="%s"
      data-srate="%s"
      data-waveform="%s"
    </div>
  ]], id, amplitude, frequency, rate, waveform))
end

function harmonics(args, kwargs, meta)
  local waveform = default(kwargs["waveform"], "sawtooth")
  local harmonics = default(kwargs["harmonics"], "1")
  local id = default(kwargs["id"], "default")

  return pandoc.RawBlock("html", string.format([[
    <div class="harmonics-placeholder"
      data-harmonics-id="%s"
      data-waveform="%s"
      data-harmonics="%s"
    ></div>
  ]], id, waveform, harmonics))
end

-- Dynamic range compressor: transfer function (+ time-domain view in "full" mode).
--   {{< compressor mode=static >}}   transfer function, threshold & ratio
--   {{< compressor >}}               everything: attack, release, makeup, signal view
-- Placeholders sharing an `id` share one widget (settings persist across slides).
function compressor(args, kwargs, meta)
  local id = default(kwargs["id"], "default")
  local mode = default(kwargs["mode"], "full")
  local threshold = default(kwargs["threshold"], "-20")
  local ratio = default(kwargs["ratio"], "4")
  local attack = default(kwargs["attack"], "20")
  local release = default(kwargs["release"], "150")
  local makeup = default(kwargs["makeup"], "0")
  local signal = default(kwargs["signal"], "burst")
  return pandoc.RawBlock("html", string.format([[
    <div class="compressor-placeholder"
      data-compressor-id="%s"
      data-mode="%s"
      data-threshold="%s"
      data-ratio="%s"
      data-attack="%s"
      data-release="%s"
      data-makeup="%s"
      data-signal="%s"
    ></div>
  ]], id, mode, threshold, ratio, attack, release, makeup, signal))
end

-- Clipper / waveshaper: transfer curve, waveform, spectrum and sound.
--   {{< clipper >}}  {{< clipper shape=tanh drive=12 >}}   (shape: hard|tanh|cubic)
function clipper(args, kwargs, meta)
  local id = default(kwargs["id"], "default")
  local shape = default(kwargs["shape"], "hard")
  local drive = default(kwargs["drive"], "6")
  return pandoc.RawBlock("html", string.format([[
    <div class="clipper-placeholder"
      data-clipper-id="%s"
      data-shape="%s"
      data-drive="%s"
    ></div>
  ]], id, shape, drive))
end
