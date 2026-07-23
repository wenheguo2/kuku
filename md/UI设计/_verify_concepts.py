# -*- coding: utf-8 -*-
from pathlib import Path
p = Path(__file__).resolve().parent
for f in sorted(p.glob("概念*.html")):
    t = f.read_text(encoding="utf-8")
    print(f.name, "bytes=", f.stat().st_size, "cid=", t.count('class="cid"'), "phone=", t.count("class=\"phone"), "S-01=", "S-01" in t, "G-01=", "识字" in t, "price=", "¥88" in t)
