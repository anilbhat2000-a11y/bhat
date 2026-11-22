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


# ---------------------------------------------------------------- new rules
def test_proximity_forklift_near_person():
    pipe = CameraPipeline([{"type": "proximity", "classes": ["forklift"], "classes_b": ["person"], "max_distance": 0.1}])
    far = [(t, [Detection("forklift", 0.9, box_at(0.2, 0.6, 0.1, 0.1)), Detection("person", 0.9, box_at(0.6, 0.6))]) for t in range(3)]
    assert run(pipe, far) == []
    near = [(3 + t, [Detection("forklift", 0.9, box_at(0.24 + 0.05 * t, 0.6, 0.1, 0.1)), Detection("person", 0.9, box_at(0.6, 0.6))]) for t in range(7)]
    ev = run(pipe, near)
    assert len(ev) == 1 and ev[0].details["other_class"] == "person" and ev[0].details["distance"] <= 0.1


def test_dwell_reports_duration_and_alerts_once():
    pipe = CameraPipeline([{"type": "dwell", "classes": ["truck"], "polygon": SQUARE, "max_seconds": 60}])
    frames = [(t, [Detection("truck", 0.9, box_at(0.5, 0.5, 0.2, 0.2))]) for t in range(0, 100, 10)]
    frames.append((100, []))
    ev = run(pipe, frames)
    assert [e.type for e in ev] == ["dwell_exceeded", "dwell_complete"]
    assert ev[1].details["dwell_s"] == 100


def test_presence_required_two_person_rule():
    pipe = CameraPipeline([{"type": "presence_required", "min_count": 2, "seconds": 10, "polygon": SQUARE}])
    two = [Detection("person", 0.9, box_at(0.35, 0.5)), Detection("person", 0.9, box_at(0.65, 0.5))]
    assert run(pipe, [(t, two) for t in range(0, 20, 5)]) == []
    one = [two[0]]
    ev = run(pipe, [(20 + t, one) for t in range(0, 20, 5)])
    assert len(ev) == 1 and ev[0].details["count"] == 1 and ev[0].details["required"] == 2


def test_tailgating_two_people_within_window():
    line = [[0.5, 0.0], [0.5, 1.0]]
    pipe = CameraPipeline([{"type": "tailgating", "line": line, "window_s": 3}])
    a = [0.40, 0.43, 0.46, 0.49, 0.52, 0.55, 0.58, 0.61]
    frames = []
    for i in range(len(a)):
        dets = [Detection("person", 0.9, box_at(a[i], 0.3))]
        if i >= 1:
            dets.append(Detection("person", 0.9, box_at(a[i - 1], 0.8)))
        frames.append((i * 0.5, dets))
    ev = run(pipe, frames)
    assert len(ev) == 1 and ev[0].details["people"] == 2
    single = CameraPipeline([{"type": "tailgating", "line": line, "window_s": 3}])
    assert run(single, [(i, [Detection("person", 0.9, box_at(x, 0.3))]) for i, x in enumerate(a)]) == []


def test_fall_heuristic():
    pipe = CameraPipeline([{"type": "fall", "seconds": 3}])
    upright = [(t, [Detection("person", 0.9, (0.45, 0.3, 0.55, 0.6))]) for t in range(4)]
    lying = [(4 + t, [Detection("person", 0.9, (0.40, 0.52, 0.62, 0.62))]) for t in range(5)]
    ev = run(pipe, upright + lying)
    assert len(ev) == 1 and ev[0].type == "fall"


def test_speed_and_event_type_override():
    pipe = CameraPipeline([{"type": "speed", "max_speed": 0.2, "event_type": "bus_overspeed", "use_case": "bus_overspeed"}])
    slow = [(t, [Detection("bus", 0.9, box_at(0.1 + 0.05 * t, 0.7, 0.1, 0.1))]) for t in range(5)]
    assert run(pipe, slow) == []
    fast = CameraPipeline([{"type": "speed", "max_speed": 0.2, "event_type": "bus_overspeed", "use_case": "bus_overspeed"}])
    ev = run(fast, [(t * 0.25, [Detection("bus", 0.9, box_at(0.1 + 0.06 * t, 0.7, 0.1, 0.1))]) for t in range(8)])
    assert len(ev) == 1 and ev[0].type == "bus_overspeed" and ev[0].details["rule"] == "speed"
    assert ev[0].details["use_case"] == "bus_overspeed"


def test_whole_frame_default_and_validation_of_new_rules():
    assert validate_rule_config({"type": "presence_required", "min_count": 2}) == []
    assert validate_rule_config({"type": "tailgating"})  # needs a line
    assert validate_rule_config({"type": "dwell", "max_seconds": -5})
    pipe = CameraPipeline([{"type": "zone_intrusion", "classes": ["cell phone"], "min_track_age": 1}])
    assert len(run(pipe, [(0, [Detection("cell phone", 0.8, box_at(0.9, 0.95, 0.02, 0.03))])])) == 1
