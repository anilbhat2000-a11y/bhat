from sentinel.analytics.engine import (CameraPipeline, Detection, IouTracker, point_in_polygon, polygon_area,
                                       segments_intersect, validate_rule_config)

SQUARE = [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8]]


def box_at(x, y, w=0.06, h=0.2):
    """Box whose foot (bottom-centre) is at (x, y)."""
    return (x - w / 2, y - h, x + w / 2, y)


def test_point_in_polygon():
    assert point_in_polygon((0.5, 0.5), SQUARE)
    assert not point_in_polygon((0.1, 0.5), SQUARE)
    assert not point_in_polygon((0.5, 0.95), SQUARE)
    assert abs(polygon_area(SQUARE) - 0.36) < 1e-9


def test_segments_intersect():
    assert segments_intersect((0.4, 0.5), (0.6, 0.5), (0.5, 0.0), (0.5, 1.0))
    assert not segments_intersect((0.1, 0.5), (0.3, 0.5), (0.5, 0.0), (0.5, 1.0))


def test_tracker_keeps_identity_and_drops_lost_tracks():
    t = IouTracker(max_missed=2)
    ids = set()
    for i in range(5):
        tracks = t.update([Detection("person", 0.9, box_at(0.3 + i * 0.005, 0.5))], ts=i)
        ids |= {tr.id for tr in tracks}
    assert ids == {1}
    for i in range(3):
        t.update([], ts=10 + i)
    assert t.tracks == {}


def run(pipe, frames):
    out = []
    for ts, dets in frames:
        out += pipe.step(dets, ts)
    return out


def test_zone_intrusion_needs_min_track_age_and_fires_once():
    pipe = CameraPipeline([{"type": "zone_intrusion", "name": "Yard", "polygon": SQUARE, "min_track_age": 3}])
    frames = [(i, [Detection("person", 0.9, box_at(0.5, 0.5))]) for i in range(6)]
    ev = run(pipe, frames)
    assert len(ev) == 1 and ev[0].type == "zone_intrusion" and ev[0].zone == "Yard"


def test_zone_intrusion_ignores_wrong_class_low_conf_and_single_frame_flicker():
    pipe = CameraPipeline([{"type": "zone_intrusion", "polygon": SQUARE, "classes": ["person"], "min_confidence": 0.5}])
    frames = [(0, [Detection("dog", 0.9, box_at(0.5, 0.5))]),
              (1, [Detection("dog", 0.9, box_at(0.5, 0.5))]),
              (2, [Detection("dog", 0.9, box_at(0.5, 0.5))]),
              (3, [Detection("person", 0.3, box_at(0.5, 0.5), )]),
              (4, [Detection("person", 0.3, box_at(0.5, 0.5))]),
              (5, [Detection("person", 0.3, box_at(0.5, 0.5))])]
    assert run(pipe, frames) == []
    pipe = CameraPipeline([{"type": "zone_intrusion", "polygon": SQUARE}])
    assert run(pipe, [(0, [Detection("person", 0.9, box_at(0.5, 0.5))])]) == []  # flicker


def walk(xs, y=0.5, cls="person"):
    return [(i, [Detection(cls, 0.9, box_at(x, y))]) for i, x in enumerate(xs)]


def test_line_crossing_direction():
    line = [[0.5, 0.0], [0.5, 1.0]]
    xs = [0.40, 0.42, 0.44, 0.46, 0.48, 0.50 + 0.01, 0.53, 0.55]
    ev_any = run(CameraPipeline([{"type": "line_crossing", "line": line}]), walk(xs))
    assert len(ev_any) == 1
    d = ev_any[0].details["direction"]
    same = run(CameraPipeline([{"type": "line_crossing", "line": line, "direction": d}]), walk(xs))
    other = "right_to_left" if d == "left_to_right" else "left_to_right"
    opp = run(CameraPipeline([{"type": "line_crossing", "line": line, "direction": other}]), walk(xs))
    assert len(same) == 1 and opp == []
    back = run(CameraPipeline([{"type": "line_crossing", "line": line, "direction": other}]), walk(list(reversed(xs))))
    assert len(back) == 1


def test_people_count_in_and_out():
    line = [[0.5, 0.0], [0.5, 1.0]]
    pipe = CameraPipeline([{"type": "people_count", "line": line}])
    xs = [0.40, 0.43, 0.46, 0.49, 0.52, 0.55]
    ev = run(pipe, walk(xs))
    assert ev[-1].details["in"] + ev[-1].details["out"] == 1


def test_loitering_after_seconds():
    pipe = CameraPipeline([{"type": "loitering", "polygon": SQUARE, "seconds": 30, "min_track_age": 1}])
    frames = [(t, [Detection("person", 0.9, box_at(0.5, 0.5))]) for t in range(0, 40, 5)]
    ev = run(pipe, frames)
    assert len(ev) == 1 and ev[0].ts == 30 and ev[0].details["dwell_s"] == 30


def test_occupancy_rising_edge_only():
    pipe = CameraPipeline([{"type": "occupancy", "polygon": SQUARE, "max_occupancy": 2}])
    people = [Detection("person", 0.9, box_at(0.3 + 0.12 * i, 0.5)) for i in range(4)]
    assert run(pipe, [(0, people[:2])]) == []
    assert len(run(pipe, [(1, people)])) == 1
    assert run(pipe, [(2, people)]) == []


def test_object_left_behind():
    pipe = CameraPipeline([{"type": "object_left", "polygon": SQUARE, "seconds": 60, "min_track_age": 1}])
    frames = [(t, [Detection("suitcase", 0.8, box_at(0.5, 0.6, 0.05, 0.05))]) for t in range(0, 80, 10)]
    ev = run(pipe, frames)
    assert len(ev) == 1 and ev[0].type == "object_left"


def test_validate_rule_config():
    assert validate_rule_config({"type": "zone_intrusion", "polygon": SQUARE}) == []
    assert validate_rule_config({"type": "nope"})
    assert validate_rule_config({"type": "zone_intrusion", "polygon": [[0, 0], [1, 1]]})
    assert validate_rule_config({"type": "line_crossing", "line": [[0, 0], [2, 1]]})
