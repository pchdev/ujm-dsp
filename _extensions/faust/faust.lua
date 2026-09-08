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
