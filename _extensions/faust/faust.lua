local function escape_html(s)
  s = s:gsub("&", "&amp;")
  s = s:gsub("<", "&lt;")
  s = s:gsub(">", "&gt;")
  return s
end

local function default(value, fallback)
    if type(value) == "table" then
        return fallback
    end
    return value
end

function faust(args, kwargs, meta)
  local file = pandoc.utils.stringify(args[1])
  local deploy = default(kwargs["deploy"], "false")
  local type = default(kwargs["type"], "faust-editor")
  local source = io.open(file, "r")

  if not source then
    error("Could not open Faust file: " .. file)
  end

  local code = source:read("*all")
  source:close()
  local filename = file:match("([^/]+)$")
  local escaped = escape_html(code)
  local html
  if deploy == "true" then
      html = string.format([[
<div class="faust-example">
<div style="font-size: 40%%;">

<%s>
<!--
%s
-->
</%s>

</div>
</div>
]], type, escaped, type)
  else
    html = string.format([[
<div class="faust-example">

<details>
<summary><strong>run</strong></summary>

<div style="font-size: 40%%;">

<%s>
<!--
%s
-->
</%s>

</div>
</details>

</div>
]], type, escaped, type)
  end
  return pandoc.RawBlock("html", html)
end

-- ---------------------------------------------------------------------------
-- Faust Stepper: an interactive block diagram showing every wire's value,
-- sample by sample (faust-stepper/).
--
--   {{< stepper faust/examples/time/recursive.dsp >}}
--   {{< stepper code="process = +(1) ~ _;" >}}
--
-- Options (all optional):
--   n=3            start at sample n
--   input=step     signal fed to the inputs: impulse (default), step, ramp,
--                  alt, sine, zero
--   guess=true     start in guess mode (values hidden until clicked)
--   groups=false   hide the dashed boxes of definitions
--   height=520     iframe height in px
--   theme=light    light (default) or dark; "auto" follows the OS setting
--   path=...       location of the stepper's index.html, relative to the
--                  rendered page (default: faust-stepper/index.html)
--
-- In non-HTML formats (PDF), an iframe is impossible: if the document sets
-- `faust-stepper-url: https://.../faust-stepper/` in its metadata, a link to
-- the published stepper is shown instead; otherwise nothing is output.
-- ---------------------------------------------------------------------------

local function kwarg(kwargs, name, fallback)
  local v = kwargs[name]
  if v == nil then return fallback end
  v = pandoc.utils.stringify(v)
  if v == "" then return fallback end
  return v
end

local function urlencode(s)
  return (s:gsub("[^%w%-_%.~]", function(c)
    return string.format("%%%02X", string.byte(c))
  end))
end

function stepper(args, kwargs, meta)
  local code = kwarg(kwargs, "code", nil)
  if not code then
    if #args < 1 then
      error("stepper: give a .dsp file or code=\"...\"")
    end
    local file = pandoc.utils.stringify(args[1])
    local source = io.open(file, "r")
    if not source then
      error("Could not open Faust file: " .. file)
    end
    code = source:read("*all")
    source:close()
  end

  local path = kwarg(kwargs, "path", "faust-stepper/index.html")
  local height = kwarg(kwargs, "height", "520")
  local theme = kwarg(kwargs, "theme", "light")

  local hash = "embed=1"
  if theme ~= "auto" then hash = hash .. "&theme=" .. urlencode(theme) end
  local n = kwarg(kwargs, "n", nil)
  if n then hash = hash .. "&n=" .. urlencode(n) end
  local input = kwarg(kwargs, "input", nil)
  if input then hash = hash .. "&input=" .. urlencode(input) end
  if kwarg(kwargs, "guess", "false") == "true" then hash = hash .. "&guess=1" end
  if kwarg(kwargs, "groups", "true") == "false" then hash = hash .. "&groups=0" end
  hash = hash .. "&code=" .. urlencode(code)

  if not quarto.doc.is_format("html") then
    local base = meta["faust-stepper-url"]
    if base == nil then return pandoc.Null() end
    local url = pandoc.utils.stringify(base) .. "#" .. hash:gsub("^embed=1&?", "")
    return pandoc.Para({
      pandoc.Str("Interactive version (values on each wire, sample by sample): "),
      pandoc.Link(pandoc.Str("Faust Stepper"), url),
    })
  end

  local src = (path .. "#" .. hash):gsub("&", "&amp;")
  local html = string.format([[
<div class="faust-stepper">
<iframe src="%s" style="width: 100%%; height: %spx; border: 1px solid #ccc; border-radius: 6px;" loading="lazy" title="Faust stepper: values on each wire, sample by sample"></iframe>
</div>
]], src, height)
  return pandoc.RawBlock("html", html)
end
