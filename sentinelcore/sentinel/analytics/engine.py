"""Analytics rule engine (detector-agnostic).

Pipeline:  frames -> Detector (YOLO/TensorRT/OpenVINO on server, or the edge
box) -> Tracker -> RuleEngine -> events.

This module implements the Tracker and the rules in pure Python so it can be
unit-tested without a GPU. The Detector is an interface; plug in a real model
(see detectors.py). Coordinates are normalised 0..1 (x right, y down).

Rules implemented
  zone_intrusion   object of given classes inside polygon for >= min_frames
  line_crossing    track crosses a directed line (a->b); direction 'any'|'left_to_right'|'right_to_left'
  loitering        person stays inside polygon >= seconds
  people_count     in/out counter on a directed line (emits count updates)
  occupancy        number of objects inside polygon > max_occupancy
  object_left      stationary non-person object inside polygon >= seconds
  crowd_density    objects in polygon per unit area above threshold
False-alarm controls: class filter, min confidence, min box area, min track age.
"""
from __future__ import annotations

from dataclasses import dataclass, field

Point = tuple[float, float]


FULL_FRAME = [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0]]


# ------------------------------------------------------------------ geometry
def point_in_polygon(p: Point, poly: list[Point]) -> bool:
    """Ray casting; points on the boundary may count either way."""
    x, y = p
    inside = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xin = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xin:
                inside = not inside
    return inside


def polygon_area(poly: list[Point]) -> float:
    s = 0.0
    for i in range(len(poly)):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % len(poly)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def side_of_line(p: Point, a: Point, b: Point) -> float:
    """>0 left of a->b, <0 right (in image coords with y down this is mirrored,
    but consistent, which is all direction checks need)."""
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])


def segments_intersect(p1: Point, p2: Point, a: Point, b: Point) -> bool:
    d1, d2 = side_of_line(p1, a, b), side_of_line(p2, a, b)
    d3, d4 = side_of_line(a, p1, p2), side_of_line(b, p1, p2)
    return (d1 * d2 < 0) and (d3 * d4 < 0)


# ------------------------------------------------------------------ data types
@dataclass
class Detection:
    cls: str
    conf: float
    box: tuple[float, float, float, float]  # x1, y1, x2, y2 normalised

    @property
    def foot(self) -> Point:
        """Bottom-centre: where the object touches the ground."""
        return ((self.box[0] + self.box[2]) / 2, self.box[3])

    @property
    def area(self) -> float:
        return max(0.0, self.box[2] - self.box[0]) * max(0.0, self.box[3] - self.box[1])


@dataclass
class Track:
    id: int
    cls: str
    conf: float
    box: tuple[float, float, float, float]
    first_ts: float
    last_ts: float
    age: int = 1
    missed: int = 0
    history: list[Point] = field(default_factory=list)

    @property
    def foot(self) -> Point:
        return ((self.box[0] + self.box[2]) / 2, self.box[3])


def iou(a, b) -> float:
    ix1, iy1, ix2, iy2 = max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0.0


class IouTracker:
    """Greedy IoU tracker. Good enough for fixed cameras at >= 5 fps; replace
    with ByteTrack/BoT-SORT for crowded scenes."""

    def __init__(self, iou_threshold: float = 0.3, max_missed: int = 10, max_foot_distance: float = 0.08) -> None:
        self.iou_threshold = iou_threshold
        # Second pass: same class, foot points close together. Keeps identity when the
        # box changes shape suddenly (a fall) or moves quickly between frames.
        self.max_foot_distance = max_foot_distance
        self.max_missed = max_missed
        self.tracks: dict[int, Track] = {}
        self._next = 1

    def update(self, dets: list[Detection], ts: float) -> list[Track]:
        unmatched = set(range(len(dets)))
        pairs = sorted(((iou(t.box, dets[i].box), tid, i) for tid, t in self.tracks.items()
                        for i in range(len(dets)) if t.cls == dets[i].cls), reverse=True)
        used_tracks: set[int] = set()
        for score, tid, i in pairs:
            if score < self.iou_threshold:
                break
            if tid in used_tracks or i not in unmatched:
                continue
            t, d = self.tracks[tid], dets[i]
            t.box, t.conf, t.last_ts, t.missed = d.box, d.conf, ts, 0
            t.age += 1
            t.history.append(t.foot)
            del t.history[:-50]
            used_tracks.add(tid)
            unmatched.discard(i)
        dist_pairs = sorted(
            (((self.tracks[tid].foot[0] - dets[i].foot[0]) ** 2 + (self.tracks[tid].foot[1] - dets[i].foot[1]) ** 2) ** 0.5, tid, i)
            for tid in self.tracks if tid not in used_tracks for i in unmatched if self.tracks[tid].cls == dets[i].cls)
        for dist, tid, i in dist_pairs:
            if dist > self.max_foot_distance:
                break
            if tid in used_tracks or i not in unmatched:
                continue
            t, d = self.tracks[tid], dets[i]
            t.box, t.conf, t.last_ts, t.missed = d.box, d.conf, ts, 0
            t.age += 1
            t.history.append(t.foot)
            del t.history[:-50]
            used_tracks.add(tid)
            unmatched.discard(i)
        for tid in list(self.tracks):
            if tid not in used_tracks:
                self.tracks[tid].missed += 1
                if self.tracks[tid].missed > self.max_missed:
                    del self.tracks[tid]
        for i in unmatched:
            d = dets[i]
            t = Track(self._next, d.cls, d.conf, d.box, ts, ts)
            t.history.append(t.foot)
            self.tracks[self._next] = t
            self._next += 1
        return [t for t in self.tracks.values() if t.missed == 0]


# ------------------------------------------------------------------ rules
@dataclass
class EventOut:
    type: str
    ts: float
    track_id: int | None
    object_class: str
    confidence: float
    zone: str
    details: dict = field(default_factory=dict)


class Rule:
    type = "base"

    def __init__(self, cfg: dict) -> None:
        self.cfg = cfg
        self.name = cfg.get("name", self.type)
        self.classes = set(cfg.get("classes", ["person"]))
        self.min_conf = float(cfg.get("min_confidence", 0.5))
        self.min_area = float(cfg.get("min_box_area", 0.0005))
        self.min_age = int(cfg.get("min_track_age", 3))
        # No polygon = the whole picture.
        self.polygon = [tuple(p) for p in cfg.get("polygon") or FULL_FRAME]

    def eligible(self, t: Track) -> bool:
        area = (t.box[2] - t.box[0]) * (t.box[3] - t.box[1])
        return t.cls in self.classes and t.conf >= self.min_conf and area >= self.min_area and t.age >= self.min_age

    def process(self, tracks: list[Track], ts: float) -> list[EventOut]:  # pragma: no cover
        raise NotImplementedError


class ZoneIntrusion(Rule):
    type = "zone_intrusion"

    def __init__(self, cfg):
        super().__init__(cfg)
        self.fired: set[int] = set()

    def process(self, tracks, ts):
        out = []
        for t in tracks:
            if t.id in self.fired or not self.eligible(t):
                continue
            if point_in_polygon(t.foot, self.polygon):
                self.fired.add(t.id)
                out.append(EventOut(self.type, ts, t.id, t.cls, t.conf, self.name))
        return out


class LineCrossing(Rule):
    type = "line_crossing"

    def __init__(self, cfg):
        super().__init__(cfg)
        self.a, self.b = tuple(cfg["line"][0]), tuple(cfg["line"][1])
        self.direction = cfg.get("direction", "any")
        self.fired: set[int] = set()

    def crossing(self, t: Track) -> str | None:
        if len(t.history) < 2:
            return None
        p1, p2 = t.history[-2], t.history[-1]
        if not segments_intersect(p1, p2, self.a, self.b):
            return None
        return "left_to_right" if side_of_line(p1, self.a, self.b) > 0 else "right_to_left"

    def process(self, tracks, ts):
        out = []
        for t in tracks:
            if not self.eligible(t):
                continue
            d = self.crossing(t)
            if d and (self.direction in ("any", d)) and (t.id, d) not in self.fired:
                self.fired.add((t.id, d))
                out.append(EventOut(self.type, ts, t.id, t.cls, t.conf, self.name, {"direction": d}))
        return out


class PeopleCount(LineCrossing):
    """Counts crossings: left_to_right = in, right_to_left = out."""
    type = "people_count"

    def __init__(self, cfg):
        cfg = {"min_track_age": 2, **cfg}
        super().__init__(cfg)
        self.count_in = 0
        self.count_out = 0

    def process(self, tracks, ts):
        out = []
        for t in tracks:
            if not self.eligible(t):
                continue
            d = self.crossing(t)
            if d and (t.id, d) not in self.fired:
                self.fired.add((t.id, d))
                if d == "left_to_right":
                    self.count_in += 1
                else:
                    self.count_out += 1
                out.append(EventOut(self.type, ts, t.id, t.cls, t.conf, self.name,
                                    {"direction": "in" if d == "left_to_right" else "out",
                                     "in": self.count_in, "out": self.count_out,
                                     "net": self.count_in - self.count_out}))
        return out


class Loitering(Rule):
    type = "loitering"

    def __init__(self, cfg):
        super().__init__(cfg)
        self.seconds = float(cfg.get("seconds", 60))
        self.entered: dict[int, float] = {}
        self.fired: set[int] = set()

    def process(self, tracks, ts):
        out = []
        live = set()
        for t in tracks:
            if not self.eligible(t) or not point_in_polygon(t.foot, self.polygon):
                self.entered.pop(t.id, None)
                continue
            live.add(t.id)
            start = self.entered.setdefault(t.id, ts)
            if ts - start >= self.seconds and t.id not in self.fired:
                self.fired.add(t.id)
                out.append(EventOut(self.type, ts, t.id, t.cls, t.conf, self.name, {"dwell_s": round(ts - start, 1)}))
        for tid in list(self.entered):
            if tid not in live:
                self.entered.pop(tid)
        return out


class Occupancy(Rule):
    type = "occupancy"

    def __init__(self, cfg):
        super().__init__({"min_track_age": 1, **cfg})
        self.max = int(cfg.get("max_occupancy", 10))
        self.over = False
        self.current = 0

    def process(self, tracks, ts):
        self.current = sum(1 for t in tracks if self.eligible(t) and point_in_polygon(t.foot, self.polygon))
        if self.current > self.max and not self.over:
            self.over = True
            return [EventOut(self.type, ts, None, ",".join(sorted(self.classes)), 1.0, self.name,
                             {"count": self.current, "max": self.max})]
        if self.current <= self.max:
            self.over = False
        return []


class CrowdDensity(Occupancy):
    """Density = objects / polygon area (normalised units). Threshold in
    'max_density'; calibrate per camera (perspective matters)."""
    type = "crowd_density"

    def __init__(self, cfg):
        super().__init__(cfg)
        self.max_density = float(cfg.get("max_density", 20))

    def process(self, tracks, ts):
        n = sum(1 for t in tracks if self.eligible(t) and point_in_polygon(t.foot, self.polygon))
        area = polygon_area(self.polygon) or 1.0
        density = n / area
        if density > self.max_density and not self.over:
            self.over = True
            return [EventOut(self.type, ts, None, "person", 1.0, self.name, {"count": n, "density": round(density, 1)})]
        if density <= self.max_density:
            self.over = False
        return []


class ObjectLeft(Rule):
    type = "object_left"

    def __init__(self, cfg):
        cfg = {"classes": ["backpack", "suitcase", "handbag"], **cfg}
        super().__init__(cfg)
        self.seconds = float(cfg.get("seconds", 120))
        self.max_move = float(cfg.get("max_movement", 0.01))
        self.anchor: dict[int, tuple[Point, float]] = {}
        self.fired: set[int] = set()

    def process(self, tracks, ts):
        out = []
        for t in tracks:
            if not self.eligible(t) or not point_in_polygon(t.foot, self.polygon):
                continue
            anchor = self.anchor.get(t.id)
            if anchor is None or abs(anchor[0][0] - t.foot[0]) + abs(anchor[0][1] - t.foot[1]) > self.max_move:
                self.anchor[t.id] = (t.foot, ts)
                continue
            if ts - anchor[1] >= self.seconds and t.id not in self.fired:
                self.fired.add(t.id)
                out.append(EventOut(self.type, ts, t.id, t.cls, t.conf, self.name, {"stationary_s": round(ts - anchor[1], 1)}))
        return out


class Proximity(Rule):
    """Two kinds of object closer than `max_distance` (normalised, foot to foot),
    e.g. forklift near a person, person near an aircraft engine. Calibrate per camera."""
    type = "proximity"

    def __init__(self, cfg):
        super().__init__({"min_track_age": 2, **cfg})
        self.classes_b = set(cfg.get("classes_b", ["person"]))
        self.max_distance = float(cfg.get("max_distance", 0.08))
        self.fired: set[tuple[int, int]] = set()

    def process(self, tracks, ts):
        a_tracks = [t for t in tracks if self.eligible(t) and point_in_polygon(t.foot, self.polygon)]
        b_tracks = [t for t in tracks if t.cls in self.classes_b and t.conf >= self.min_conf and t.age >= self.min_age
                    and point_in_polygon(t.foot, self.polygon)]
        out = []
        for a in a_tracks:
            for b in b_tracks:
                if a.id == b.id:
                    continue
                d = ((a.foot[0] - b.foot[0]) ** 2 + (a.foot[1] - b.foot[1]) ** 2) ** 0.5
                key = (a.id, b.id)
                if d <= self.max_distance and key not in self.fired:
                    self.fired.add(key)
                    out.append(EventOut(self.type, ts, a.id, a.cls, min(a.conf, b.conf), self.name,
                                        {"other_class": b.cls, "other_track": b.id, "distance": round(d, 3)}))
        return out


class Dwell(Rule):
    """Time each object spends in a zone. Reports the duration when it leaves
    (truck turnaround, dock occupancy, aisle dwell, theatre usage) and raises
    an alert once if it stays longer than `max_seconds` (0 = never alert)."""
    type = "dwell"

    def __init__(self, cfg):
        super().__init__({"min_track_age": 1, **cfg})
        self.max_seconds = float(cfg.get("max_seconds", 0))
        self.min_report = float(cfg.get("min_report_seconds", 5))
        self.inside: dict[int, tuple[float, str, float]] = {}
        self.alerted: set[int] = set()

    def process(self, tracks, ts):
        out = []
        present = set()
        for t in tracks:
            if not self.eligible(t) or not point_in_polygon(t.foot, self.polygon):
                continue
            present.add(t.id)
            start, _, _ = self.inside.setdefault(t.id, (ts, t.cls, t.conf))
            self.inside[t.id] = (start, t.cls, t.conf)
            if self.max_seconds and ts - start >= self.max_seconds and t.id not in self.alerted:
                self.alerted.add(t.id)
                out.append(EventOut("dwell_exceeded", ts, t.id, t.cls, t.conf, self.name,
                                    {"dwell_s": round(ts - start, 1), "max_s": self.max_seconds}))
        for tid in [k for k in self.inside if k not in present]:
            start, cls, conf = self.inside.pop(tid)
            self.alerted.discard(tid)
            if ts - start >= self.min_report:
                out.append(EventOut("dwell_complete", ts, tid, cls, conf, self.name, {"dwell_s": round(ts - start, 1)}))
        return out


class PresenceRequired(Rule):
    """Fewer than `min_count` objects in the zone for `seconds`: unattended
    counter, guard post empty, vault opened without two custodians."""
    type = "presence_required"

    def __init__(self, cfg):
        super().__init__({"min_track_age": 1, **cfg})
        self.min_count = int(cfg.get("min_count", 1))
        self.seconds = float(cfg.get("seconds", 60))
        self.short_since: float | None = None
        self.alerted = False

    def process(self, tracks, ts):
        n = sum(1 for t in tracks if self.eligible(t) and point_in_polygon(t.foot, self.polygon))
        if n >= self.min_count:
            self.short_since, self.alerted = None, False
            return []
        if self.short_since is None:
            self.short_since = ts
        if not self.alerted and ts - self.short_since >= self.seconds:
            self.alerted = True
            return [EventOut(self.type, ts, None, ",".join(sorted(self.classes)), 1.0, self.name,
                             {"count": n, "required": self.min_count, "for_s": round(ts - self.short_since, 1)})]
        return []


class Tailgating(LineCrossing):
    """More than one person crosses an entry line within `window_s` seconds
    (one badge, several people). Pair with access-control events to confirm."""
    type = "tailgating"

    def __init__(self, cfg):
        super().__init__({"min_track_age": 2, **cfg})
        self.window = float(cfg.get("window_s", 3))
        self.max_per_entry = int(cfg.get("max_per_entry", 1))
        self.recent: list[tuple[float, int]] = []

    def process(self, tracks, ts):
        out = []
        for t in tracks:
            if not self.eligible(t):
                continue
            d = self.crossing(t)
            if d and (self.direction in ("any", d)) and (t.id, d) not in self.fired:
                self.fired.add((t.id, d))
                self.recent = [(x, i) for x, i in self.recent if ts - x <= self.window]
                self.recent.append((ts, t.id))
                if len(self.recent) == self.max_per_entry + 1:
                    out.append(EventOut(self.type, ts, t.id, t.cls, t.conf, self.name,
                                        {"people": len(self.recent), "window_s": self.window, "direction": d}))
        return out


class FallHeuristic(Rule):
    """Person box turns from upright to lying and stays down for `seconds`.
    A shape heuristic: a pose model is more reliable (see the 'pose' capability)."""
    type = "fall"

    def __init__(self, cfg):
        super().__init__({"min_track_age": 3, **cfg})
        self.seconds = float(cfg.get("seconds", 5))
        self.was_upright: set[int] = set()
        self.down_since: dict[int, float] = {}
        self.fired: set[int] = set()

    def process(self, tracks, ts):
        out = []
        for t in tracks:
            if t.cls not in self.classes or t.conf < self.min_conf or not point_in_polygon(t.foot, self.polygon):
                continue
            w, h = t.box[2] - t.box[0], t.box[3] - t.box[1]
            ratio = h / w if w > 0 else 0
            if ratio >= 1.3:
                self.was_upright.add(t.id)
                self.down_since.pop(t.id, None)
            elif ratio <= 0.8 and t.id in self.was_upright:
                start = self.down_since.setdefault(t.id, ts)
                if ts - start >= self.seconds and t.id not in self.fired:
                    self.fired.add(t.id)
                    out.append(EventOut(self.type, ts, t.id, t.cls, t.conf, self.name, {"down_s": round(ts - start, 1)}))
        return out


class Speed(Rule):
    """Object moving faster than `max_speed` (normalised frame widths per second,
    averaged over `window` positions). Convert to km/h with a per-camera calibration."""
    type = "speed"

    def __init__(self, cfg):
        super().__init__({"classes": ["car", "truck", "bus", "motorcycle"], **cfg})
        self.max_speed = float(cfg.get("max_speed", 0.25))
        self.window = int(cfg.get("window", 5))
        self.hist: dict[int, list[tuple[float, Point]]] = {}
        self.fired: set[int] = set()

    def process(self, tracks, ts):
        out = []
        for t in tracks:
            if not self.eligible(t) or not point_in_polygon(t.foot, self.polygon):
                continue
            h = self.hist.setdefault(t.id, [])
            h.append((ts, t.foot))
            del h[:-self.window]
            if len(h) >= 2 and h[-1][0] > h[0][0]:
                dist = sum(((h[i][1][0] - h[i - 1][1][0]) ** 2 + (h[i][1][1] - h[i - 1][1][1]) ** 2) ** 0.5
                           for i in range(1, len(h)))
                v = dist / (h[-1][0] - h[0][0])
                if v > self.max_speed and t.id not in self.fired:
                    self.fired.add(t.id)
                    out.append(EventOut(self.type, ts, t.id, t.cls, t.conf, self.name, {"speed": round(v, 3)}))
        return out


RULES = {r.type: r for r in (ZoneIntrusion, LineCrossing, PeopleCount, Loitering, Occupancy, CrowdDensity, ObjectLeft,
                             Proximity, Dwell, PresenceRequired, Tailgating, FallHeuristic, Speed)}
LINE_RULES = {"line_crossing", "people_count", "tailgating"}



def validate_rule_config(cfg: dict) -> list[str]:
    errs = []
    t = cfg.get("type")
    if t not in RULES:
        return [f"unknown analytic type {t!r}; choose from {sorted(RULES)}"]
    if t in LINE_RULES:
        line = cfg.get("line")
        if not (isinstance(line, list) and len(line) == 2):
            errs.append("line must be [[x1,y1],[x2,y2]]")
    poly = cfg.get("polygon")
    if poly is not None and not (isinstance(poly, list) and len(poly) >= 3):
        errs.append("polygon needs at least 3 points (or leave it out for the whole picture)")
    pts = (cfg.get("line") or []) + (cfg.get("polygon") or [])
    for p in pts:
        if not (isinstance(p, (list, tuple)) and len(p) == 2 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in p)):
            errs.append(f"point {p!r} must be [x,y] with values 0..1")
            break
    for k in ("seconds", "max_seconds", "min_count", "max_occupancy", "max_distance", "window_s", "max_speed"):
        if k in cfg and not (isinstance(cfg[k], (int, float)) and cfg[k] >= 0):
            errs.append(f"{k} must be a number ≥ 0")
    return errs


class CameraPipeline:
    """Tracker + rules for one camera."""

    def __init__(self, rule_cfgs: list[dict]) -> None:
        self.tracker = IouTracker()
        self.rules = [RULES[c["type"]](c) for c in rule_cfgs if c.get("enabled", True)]

    def step(self, dets: list[Detection], ts: float) -> list[EventOut]:
        tracks = self.tracker.update(dets, ts)
        events: list[EventOut] = []
        for r in self.rules:
            for ev in r.process(tracks, ts):
                # A use case can give its events its own name (e.g. "bank_vault_dual_custody").
                if r.cfg.get("event_type") and ev.type not in ("dwell_complete",):
                    ev.details = {**ev.details, "rule": ev.type}
                    ev.type = r.cfg["event_type"]
                if r.cfg.get("use_case"):
                    ev.details = {**ev.details, "use_case": r.cfg["use_case"]}
                events.append(ev)
        return events
