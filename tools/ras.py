import math

class Grid:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [['.'] * w for _ in range(h)]
    def px(self, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < self.w and 0 <= y < self.h and c != '.':
            self.g[y][x] = c
    def get(self, x, y):
        if 0 <= x < self.w and 0 <= y < self.h: return self.g[y][x]
        return '.'
    def ellipse(self, cx, cy, rx, ry, c, fill=True):
        for y in range(self.h):
            for x in range(self.w):
                d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
                if fill and d <= 1.0: self.px(x, y, c)
                elif not fill and 0.72 <= d <= 1.0: self.px(x, y, c)
    def disc(self, cx, cy, r, c):
        self.ellipse(cx, cy, r, r, c)
    def rect(self, x0, y0, x1, y1, c):
        for y in range(int(y0), int(y1) + 1):
            for x in range(int(x0), int(x1) + 1): self.px(x, y, c)
    def line(self, x0, y0, x1, y1, c, w=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 3) + 1
        for i in range(n + 1):
            t = i / n
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            if w <= 1: self.px(x, y, c)
            else:
                r = (w - 1) / 2.0
                for dy in range(-int(math.ceil(r)), int(math.ceil(r)) + 1):
                    for dx in range(-int(math.ceil(r)), int(math.ceil(r)) + 1):
                        if dx * dx + dy * dy <= r * r + 0.3: self.px(x + dx, y + dy, c)
    def arc(self, cx, cy, rx, ry, a0, a1, c, w=1):
        n = int(max(rx, ry) * 6) + 8
        pts = []
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            pts.append((cx + math.cos(a) * rx, cy + math.sin(a) * ry))
        for i in range(len(pts) - 1):
            self.line(pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1], c, w)
    # grow a 1px edge of colour `c` around every non-empty pixel
    def edge(self, c, only=None):
        add = []
        for y in range(self.h):
            for x in range(self.w):
                if self.g[y][x] != '.': continue
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    n = self.get(x+dx, y+dy)
                    if n != '.' and n != c and (only is None or n in only):
                        add.append((x, y)); break
        for x, y in add: self.px(x, y, c)
    # replace the outermost ring of a colour set with `c`
    def shell(self, src, c):
        hits = []
        for y in range(self.h):
            for x in range(self.w):
                if self.g[y][x] in src:
                    for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                        if self.get(x+dx, y+dy) == '.': hits.append((x,y)); break
        for x, y in hits: self.px(x, y, c)
    def emit(self, indent='  '):
        return '\n'.join(indent + "'" + ''.join(r) + "'," for r in self.g)
    def show(self):
        print('\n'.join(''.join(r) for r in self.g))
