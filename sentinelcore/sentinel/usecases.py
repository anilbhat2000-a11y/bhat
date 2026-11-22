"""Built-in use-case catalog.

Each use case says what it needs, and the portal shows it as Available only when
all of that is installed on this platform (Models & integrations page):
  * capabilities - AI models (person/vehicle detector, face, ANPR, pose, ...).
  * integrations - data from other systems (POS, token queue, access control, ...).
A use case with a `rule` can be switched on for any camera from the portal; the
rule runs in the analytics engine on the detector's output. A use case without a
rule produces its events directly from its specialised model or integration.

Organizations can import their own full list (CSV) on top of this catalog.
"""
from __future__ import annotations

CATEGORIES = ["People Identification", "Object Detection", "Vehicle Analytics", "Geofencing & Intrusion",
              "People Counting & Crowd", "Driver Behaviour", "Safety & PPE", "Security & Threat",
              "Operations & Productivity", "Customer Experience", "Compliance & Audit", "Fraud & Loss Prevention"]

SECTORS = {
    "general": "Cross-industry", "logistics": "Logistics & warehousing", "it_ites": "IT / ITES", "bpo": "BPO & KPO",
    "banking": "Banking, ATMs & vaults", "branch_ops": "Branch operations", "retail": "Retail",
    "pharma": "Healthcare & pharma", "hospital": "Hospitals", "mall": "Shopping malls", "railway": "Railway stations",
    "bus": "Bus stations & fleet", "airport": "Airports",
}
# Target counts from the owner's requirement list, shown as coverage on the Use cases page.
SECTOR_TARGETS = {"general": 45, "logistics": 45, "it_ites": 35, "bpo": 30, "banking": 40, "branch_ops": 30,
                  "retail": 45, "pharma": 30, "hospital": 40, "mall": 40, "railway": 40, "bus": 30, "airport": 50}

CAPABILITIES = {
    "person_vehicle": "Person & vehicle detector (YOLO-class, COCO objects: person, car, truck, bus, bag, phone, laptop…)",
    "face": "Face recognition (enrolment, 1:N matching, liveness)",
    "anpr": "Number plate recognition (ANPR / LPR)",
    "ocr": "Text recognition (container, wagon, seal and tail numbers)",
    "pose": "Pose estimation (falls, posture, hands, bed exit)",
    "fire_smoke": "Fire and smoke detection",
    "weapon": "Weapon detection (gun, knife)",
    "ppe": "PPE detection (helmet, vest, gloves, mask, gown)",
    "attributes": "Person attributes & re-identification (clothing colour, bag, cross-camera search)",
    "industrial": "Industrial objects (forklift, pallet, trolley, parcel, seal)",
    "drowsiness": "Driver monitoring (eyes, yawning, phone use)",
    "shelf": "Retail shelf analysis (gaps, planogram, price tags)",
    "atm_tamper": "ATM tamper detection (skimmer, overlay, pinhole camera, cash trap)",
    "defect": "Visual inspection (tablets, vials, labels, pantograph, overhead wire)",
    "aviation": "Aviation objects (aircraft, ground vehicles, FOD, drones)",
    "density": "Dense crowd counting (density maps for very large crowds)",
    "under_vehicle": "Under-vehicle scanning camera (UVSS hardware)",
}
INTEGRATIONS = {
    "access_control": "Access control (badge / door events)",
    "pos": "POS / billing (transactions, scans, voids)",
    "token_queue": "Token / queue management system",
    "roster": "HRMS / staff roster and attendance",
    "gate_pass": "Gate pass / asset movement register",
    "parking": "Parking management and payment",
    "fare": "Ticketing / fare collection (AFC, ticket gates)",
    "atm_switch": "ATM switch / electronic journal (EJ)",
    "vault_alarm": "Vault and intrusion alarm panel",
    "cab": "Transport / cab management",
    "fleet": "Fleet GPS and schedules",
    "flight_ops": "Airport operations database (AODB, flight schedules)",
    "lease": "Mall lease and revenue-share billing",
    "hms": "Hospital systems (HMS, infant RFID tags, nurse call)",
    "mes": "Manufacturing / LIMS batch records (GMP)",
    "wms": "Warehouse management system (WMS / TMS)",
    "evidence": "Evidence export / case management",
}

_LINE = [[0.1, 0.55], [0.9, 0.55]]


def Z(classes, **kw):  # noqa: N802 - short template builders
    return {"type": "zone_intrusion", "classes": classes, **kw}


def LX(classes, **kw):  # line crossing
    return {"type": "line_crossing", "classes": classes, "line": _LINE, **kw}


def CNT(classes=("person",), **kw):
    return {"type": "people_count", "classes": list(classes), "line": _LINE, **kw}


def LOI(classes=("person",), seconds=120, **kw):
    return {"type": "loitering", "classes": list(classes), "seconds": seconds, **kw}


def OCC(classes=("person",), max_occupancy=20, **kw):
    return {"type": "occupancy", "classes": list(classes), "max_occupancy": max_occupancy, **kw}


def DEN(max_density=40, **kw):
    return {"type": "crowd_density", "classes": ["person"], "max_density": max_density, **kw}


def LEFT(classes=("backpack", "suitcase", "handbag"), seconds=120, **kw):
    return {"type": "object_left", "classes": list(classes), "seconds": seconds, **kw}


def PROX(classes, classes_b=("person",), max_distance=0.08, **kw):
    return {"type": "proximity", "classes": list(classes), "classes_b": list(classes_b), "max_distance": max_distance, **kw}


def DW(classes, max_seconds=0, **kw):
    return {"type": "dwell", "classes": list(classes), "max_seconds": max_seconds, **kw}


def PRES(min_count=1, seconds=120, classes=("person",), **kw):
    return {"type": "presence_required", "classes": list(classes), "min_count": min_count, "seconds": seconds, **kw}


def TAIL(**kw):
    return {"type": "tailgating", "classes": ["person"], "line": _LINE, "window_s": 3, **kw}


def FALL(**kw):
    return {"type": "fall", "classes": ["person"], "seconds": 5, **kw}


def SPD(classes=("car", "truck", "bus", "motorcycle"), max_speed=0.25, **kw):
    return {"type": "speed", "classes": list(classes), "max_speed": max_speed, **kw}


PV, FACE, ANPR, OCR, POSE, FIRE, WPN, PPE, ATTR, IND = ("person_vehicle", "face", "anpr", "ocr", "pose", "fire_smoke",
                                                        "weapon", "ppe", "attributes", "industrial")
C = {i: c for i, c in enumerate(CATEGORIES)}
PID, OBJ, VEH, GEO, CROWD, DRV, SAFE, SEC, OPS, CX, COMP, FRAUD = CATEGORIES

# key, sector, category, name, capabilities, integrations, rule template (or None), severity
_RAW = [
    # ------------------------------------------------------------ cross-industry
    ("gen_face_access", "general", PID, "Face-based access at doors and turnstiles", [FACE], ["access_control"], None, "info"),
    ("gen_watchlist", "general", PID, "Watchlist alert when a listed face is seen", [FACE], [], None, "critical"),
    ("gen_vip_arrival", "general", PID, "VIP / known-visitor arrival notice", [FACE], [], None, "info"),
    ("gen_tailgating", "general", SEC, "Tailgating: more than one person per door entry", [PV], [], TAIL(), "warning"),
    ("gen_tailgating_badge", "general", SEC, "Tailgating confirmed against badge swipes", [PV], ["access_control"], TAIL(), "critical"),
    ("gen_person_search", "general", PID, "Find one person across all cameras", [ATTR], [], None, "info"),
    ("gen_attribute_search", "general", PID, "Search video by clothing colour or bag", [ATTR], [], None, "info"),
    ("gen_abandoned", "general", OBJ, "Abandoned bag or object", [PV], [], LEFT(), "critical"),
    ("gen_object_removed", "general", OBJ, "Object removed from a protected area", [PV], [], None, "warning"),
    ("gen_weapon", "general", SEC, "Weapon visible (gun, knife)", [WPN], [], Z(["gun", "knife"], min_track_age=1), "critical"),
    ("gen_fire_smoke", "general", SAFE, "Fire or smoke", [FIRE], [], Z(["fire", "smoke"], min_track_age=2), "critical"),
    ("gen_tamper", "general", SEC, "Camera tampering (covered, moved, defocused)", [], [], None, "critical"),
    ("gen_intrusion", "general", GEO, "Perimeter intrusion after hours", [PV], [], Z(["person"]), "critical"),
    ("gen_line_cross", "general", GEO, "Virtual fence / line crossing", [PV], [], LX(["person", "car"]), "warning"),
    ("gen_loitering", "general", GEO, "Loitering near entrances or restricted areas", [PV], [], LOI(seconds=180), "warning"),
    ("gen_wrong_way", "general", GEO, "Wrong-way movement through a one-way passage", [PV], [], LX(["person"], direction="right_to_left"), "warning"),
    ("gen_crowd", "general", CROWD, "Crowd forming in an area", [PV], [], DEN(), "warning"),
    ("gen_occupancy", "general", CROWD, "Occupancy above the safe limit", [PV], [], OCC(max_occupancy=50), "warning"),
    ("gen_people_count", "general", CROWD, "People in / out counting", [PV], [], CNT(), "info"),
    ("gen_fall", "general", SAFE, "Person fall", [PV], [], FALL(), "critical"),
    ("gen_fall_pose", "general", SAFE, "Person fall (pose model, higher accuracy)", [POSE], [], FALL(), "critical"),
    ("gen_fight", "general", SEC, "Fight or violent movement", [POSE], [], None, "critical"),
    ("gen_running", "general", SEC, "Person running in a walk-only area", [PV], [], SPD(["person"], max_speed=0.35), "info"),
    ("gen_ppe", "general", SAFE, "Helmet / vest missing in a PPE zone", [PPE], [], Z(["no_helmet", "no_vest"], min_track_age=2), "warning"),
    ("gen_vehicle_parked", "general", VEH, "Vehicle parked in a no-parking zone", [PV], [], LOI(["car", "truck", "motorcycle"], seconds=300), "warning"),
    ("gen_anpr_gate", "general", VEH, "Number plate log at entry and exit gates", [ANPR], [], None, "info"),
    ("gen_anpr_blacklist", "general", VEH, "Blacklisted vehicle at the gate", [ANPR], [], None, "critical"),
    ("gen_overspeed", "general", VEH, "Vehicle overspeeding on campus roads", [PV], [], SPD(), "warning"),
    ("gen_guard_absent", "general", OPS, "Guard post unattended", [PV], [], PRES(min_count=1, seconds=300), "warning"),
    ("gen_after_hours", "general", SEC, "Presence after hours in a closed area", [PV], [], Z(["person"]), "warning"),
    ("gen_evidence", "general", COMP, "Incident clip export with chain of custody", [], ["evidence"], None, "info"),

    # ------------------------------------------------------- logistics & warehousing
    ("log_truck_turnaround", "logistics", OPS, "Truck turnaround time (gate in to gate out)", [ANPR], ["wms"], None, "info"),
    ("log_dock_occupancy", "logistics", OPS, "Dock bay occupancy and idle time", [PV], [], DW(["truck"], max_seconds=3600), "info"),
    ("log_dock_overstay", "logistics", OPS, "Truck at dock longer than the slot", [PV], [], DW(["truck"], max_seconds=5400), "warning"),
    ("log_container_ocr", "logistics", VEH, "Read container numbers (ISO 6346)", [OCR], [], None, "info"),
    ("log_seal_check", "logistics", COMP, "Container seal present and number read", [OCR, IND], ["wms"], None, "warning"),
    ("log_parcel_mishandling", "logistics", FRAUD, "Parcels thrown or dropped", [POSE, IND], [], None, "warning"),
    ("log_forklift_person", "logistics", SAFE, "Forklift too close to a person", [IND], [], PROX(["forklift"], max_distance=0.07), "critical"),
    ("log_forklift_speed", "logistics", SAFE, "Forklift overspeeding in aisles", [IND], [], SPD(["forklift"], max_speed=0.2), "warning"),
    ("log_trailer_fill", "logistics", OPS, "How full each trailer is at loading", [IND], [], None, "info"),
    ("log_pedestrian_lane", "logistics", SAFE, "Person outside the pedestrian walkway", [PV], [], Z(["person"]), "warning"),
    ("log_ppe", "logistics", SAFE, "Helmet / vest at loading docks", [PPE], [], Z(["no_helmet", "no_vest"], min_track_age=2), "warning"),
    ("log_yard_queue", "logistics", OPS, "Trucks queuing at the gate", [PV], [], OCC(["truck"], max_occupancy=8), "info"),
    ("log_unauth_vehicle", "logistics", VEH, "Vehicle not on the expected list", [ANPR], ["wms"], None, "warning"),
    ("log_blocked_exit", "logistics", SAFE, "Pallets blocking a fire exit", [IND], [], LEFT(["pallet"], seconds=600), "critical"),
    ("log_dock_door_open", "logistics", SEC, "Dock door open with no truck", [IND], [], None, "warning"),
    ("log_pilferage", "logistics", FRAUD, "Goods moved to an unusual area", [PV, IND], [], Z(["person"]), "warning"),
    ("log_headcount_shift", "logistics", OPS, "Workers per shift vs plan", [PV], ["roster"], CNT(), "info"),
    ("log_driver_waiting", "logistics", OPS, "Drivers waiting in restricted areas", [PV], [], LOI(seconds=600), "info"),

    # --------------------------------------------------------------------- IT / ITES
    ("it_phone_secure_bay", "it_ites", COMP, "Phone in a no-device development bay", [PV], [], Z(["cell phone"], min_track_age=2), "warning"),
    ("it_screen_photo", "it_ites", FRAUD, "Someone photographing a screen", [PV, POSE], [], Z(["cell phone"], min_track_age=3), "critical"),
    ("it_laptop_exit", "it_ites", FRAUD, "Laptop leaving without a gate pass", [PV], ["gate_pass"], LX(["laptop"]), "critical"),
    ("it_desk_usage", "it_ites", OPS, "Desk usage by hour", [PV], [], DW(["person"]), "info"),
    ("it_meeting_room", "it_ites", OPS, "Meeting room booked but empty / in use", [PV], [], OCC(max_occupancy=12), "info"),
    ("it_cab_drop", "it_ites", COMP, "Night-shift cab drop logged (plate + time)", [ANPR], ["cab"], None, "info"),
    ("it_woman_escort", "it_ites", COMP, "Night cab leaving with a woman employee and no guard", [FACE], ["cab"], None, "critical"),
    ("it_server_room", "it_ites", SEC, "Server room entry outside approved list", [FACE], ["access_control"], None, "critical"),
    ("it_tailgating", "it_ites", SEC, "Tailgating into ODC / secure floors", [PV], [], TAIL(), "warning"),
    ("it_after_hours", "it_ites", SEC, "Presence on a floor after hours", [PV], [], Z(["person"]), "info"),
    ("it_cafeteria_queue", "it_ites", CX, "Cafeteria queue length", [PV], [], OCC(max_occupancy=25), "info"),
    ("it_occupancy_hvac", "it_ites", OPS, "Floor occupancy for HVAC and lighting", [PV], [], OCC(max_occupancy=200), "info"),
    ("it_visitor_unescorted", "it_ites", SEC, "Visitor unescorted in work areas", [FACE, ATTR], [], None, "warning"),

    # ---------------------------------------------------------------------- BPO & KPO
    ("bpo_agent_identity", "bpo", PID, "Agent at the desk is the one logged in", [FACE], ["roster"], None, "critical"),
    ("bpo_proxy_attendance", "bpo", FRAUD, "Proxy attendance (badge in, face absent)", [FACE], ["access_control", "roster"], None, "warning"),
    ("bpo_pci_phone", "bpo", COMP, "Phone or paper in a PCI clean room", [PV], [], Z(["cell phone", "book"], min_track_age=2), "critical"),
    ("bpo_headcount_roster", "bpo", OPS, "Headcount on floor vs roster", [PV], ["roster"], CNT(), "info"),
    ("bpo_seat_empty", "bpo", OPS, "Seat empty during a login session", [PV], ["roster"], PRES(min_count=1, seconds=600), "info"),
    ("bpo_break_overstay", "bpo", OPS, "Break area overstay", [PV], [], DW(["person"], max_seconds=1800), "info"),
    ("bpo_tailgating", "bpo", SEC, "Tailgating into the production floor", [PV], [], TAIL(), "warning"),
    ("bpo_screen_photo", "bpo", FRAUD, "Photographing a customer screen", [PV, POSE], [], Z(["cell phone"], min_track_age=3), "critical"),
    ("bpo_occupancy", "bpo", CROWD, "Floor occupancy vs fire limit", [PV], [], OCC(max_occupancy=150), "warning"),

    # --------------------------------------------------------- banking, ATMs & vaults
    ("bank_skimmer", "banking", FRAUD, "Card skimmer or overlay on the ATM", ["atm_tamper"], [], None, "critical"),
    ("bank_pinhole", "banking", FRAUD, "Hidden camera over the ATM keypad", ["atm_tamper"], [], None, "critical"),
    ("bank_cash_trap", "banking", FRAUD, "Cash trapping at the dispenser", ["atm_tamper"], ["atm_switch"], None, "critical"),
    ("bank_shoulder_surf", "banking", FRAUD, "Shoulder surfing at the ATM", [PV], [], OCC(max_occupancy=1), "warning"),
    ("bank_atm_multi", "banking", SEC, "More than one person in the ATM cabin", [PV], [], OCC(max_occupancy=1), "warning"),
    ("bank_helmet_atm", "banking", SEC, "Face covered / helmet inside the ATM", [PPE, FACE], [], None, "critical"),
    ("bank_atm_loiter", "banking", SEC, "Loitering at the ATM lobby", [PV], [], LOI(seconds=300), "warning"),
    ("bank_atm_attack", "banking", SEC, "Physical attack on the ATM", [POSE], ["vault_alarm"], None, "critical"),
    ("bank_vault_dual", "banking", COMP, "Two custodians present when the vault opens", [PV], ["vault_alarm"], PRES(min_count=2, seconds=10), "critical"),
    ("bank_vault_after_hours", "banking", SEC, "Vault area presence after hours", [PV], [], Z(["person"]), "critical"),
    ("bank_ej_clip", "banking", COMP, "Pull the ATM clip for a disputed transaction", [], ["atm_switch", "evidence"], None, "info"),
    ("bank_cash_van", "banking", SEC, "Cash van arrival logged by number plate", [ANPR], [], None, "info"),
    ("bank_guard_absent", "banking", OPS, "ATM / branch guard absent", [PV], [], PRES(min_count=1, seconds=600), "warning"),
    ("bank_weapon", "banking", SEC, "Weapon in the banking hall", [WPN], [], Z(["gun", "knife"], min_track_age=1), "critical"),

    # ----------------------------------------------------------------- branch ops
    ("br_queue_vs_token", "branch_ops", CX, "Queue wait compared with the token system", [PV], ["token_queue"], OCC(max_occupancy=15), "info"),
    ("br_walkout", "branch_ops", CX, "Customers leaving before being served", [PV], ["token_queue"], DW(["person"]), "info"),
    ("br_counter_empty", "branch_ops", OPS, "Counter unattended during business hours", [PV], [], PRES(min_count=1, seconds=300), "warning"),
    ("br_checklist", "branch_ops", COMP, "Daily opening checklist score for each branch", [], [], None, "info"),
    ("br_opening_time", "branch_ops", COMP, "Branch opened late / shutter status", [PV], [], None, "warning"),
    ("br_footfall", "branch_ops", CROWD, "Branch footfall by hour", [PV], [], CNT(), "info"),
    ("br_waiting_area", "branch_ops", CX, "Waiting area overcrowded", [PV], [], OCC(max_occupancy=25), "info"),
    ("br_staff_presence", "branch_ops", OPS, "Staff at desk vs roster", [FACE], ["roster"], None, "info"),
    ("br_housekeeping", "branch_ops", COMP, "Housekeeping done on schedule", [PV], [], None, "info"),

    # ---------------------------------------------------------------------- retail
    ("ret_oos", "retail", OPS, "Out-of-stock shelves", ["shelf"], [], None, "warning"),
    ("ret_planogram", "retail", COMP, "Shelf layout matches the planogram", ["shelf"], [], None, "info"),
    ("ret_sweethearting", "retail", FRAUD, "Cashier letting items through unscanned", [POSE], ["pos"], None, "critical"),
    ("ret_sco_missed", "retail", FRAUD, "Missed scans at self-checkout", [POSE], ["pos"], None, "warning"),
    ("ret_footfall_vs_bills", "retail", CX, "Footfall compared with bills (conversion)", [PV], ["pos"], CNT(), "info"),
    ("ret_aisle_dwell", "retail", CX, "Time spent in each aisle", [PV], [], DW(["person"]), "info"),
    ("ret_heatmap", "retail", CX, "Store heat map", [PV], [], None, "info"),
    ("ret_queue", "retail", CX, "Billing queue too long — open a counter", [PV], [], OCC(max_occupancy=6), "warning"),
    ("ret_counter_empty", "retail", OPS, "Billing counter unattended", [PV], [], PRES(min_count=1, seconds=180), "warning"),
    ("ret_shoplifting", "retail", FRAUD, "Concealment / shoplifting gesture", [POSE], [], None, "warning"),
    ("ret_exit_unpaid", "retail", FRAUD, "Exit with goods without a bill", [PV], ["pos"], LX(["person"]), "warning"),
    ("ret_backdoor", "retail", FRAUD, "Back door opened outside receiving hours", [PV], [], Z(["person"]), "warning"),
    ("ret_cash_drawer", "retail", FRAUD, "Cash drawer open with no sale", [POSE], ["pos"], None, "warning"),
    ("ret_repeat_offender", "retail", PID, "Known shoplifter enters", [FACE], [], None, "critical"),
    ("ret_trolley_exit", "retail", OPS, "Trolleys left in the parking area", [IND], [], LEFT(["trolley"], seconds=900), "info"),
    ("ret_spill", "retail", SAFE, "Spill or object on the floor", [PV], [], None, "warning"),

    # ------------------------------------------------------- healthcare & pharma
    ("ph_gowning", "pharma", COMP, "Gowning complete before cleanroom entry", [PPE], [], Z(["no_gown", "no_mask", "no_gloves"], min_track_age=2), "critical"),
    ("ph_mri_metal", "pharma", SAFE, "Metal object near the MRI", [PV], ["hms"], Z(["wheelchair", "scissors", "bottle"], min_track_age=1), "critical"),
    ("ph_tablet_defect", "pharma", COMP, "Tablet defects on the line", ["defect"], ["mes"], None, "warning"),
    ("ph_vial_defect", "pharma", COMP, "Vial cracks, fill level, cap", ["defect"], ["mes"], None, "warning"),
    ("ph_gmp_evidence", "pharma", COMP, "Video evidence for GMP audits", [], ["mes", "evidence"], None, "info"),
    ("ph_line_clearance", "pharma", COMP, "Line clearance between batches", [PV], ["mes"], PRES(min_count=0, seconds=60), "info"),
    ("ph_cleanroom_count", "pharma", COMP, "People in cleanroom above the limit", [PV], [], OCC(max_occupancy=4), "warning"),
    ("ph_label_check", "pharma", COMP, "Label text and batch number check", [OCR], ["mes"], None, "warning"),
    ("ph_cold_chain", "pharma", OPS, "Cold room door left open", [PV], [], None, "warning"),

    # --------------------------------------------------------------------- hospitals
    ("hos_infant", "hospital", SEC, "Infant abduction from the maternity ward", [PV], ["hms"], LX(["person"]), "critical"),
    ("hos_wander", "hospital", SAFE, "Patient wandering off the ward", [FACE, ATTR], ["hms"], None, "critical"),
    ("hos_bed_fall", "hospital", SAFE, "Fall from bed", [POSE], [], FALL(), "critical"),
    ("hos_bed_exit", "hospital", SAFE, "Patient starting to leave bed", [POSE], ["hms"], None, "warning"),
    ("hos_violence", "hospital", SEC, "Violence against doctors or staff", [POSE], [], None, "critical"),
    ("hos_ot_usage", "hospital", OPS, "Operating theatre usage time", [PV], [], DW(["person"]), "info"),
    ("hos_er_crowd", "hospital", CROWD, "Emergency department crowding", [PV], [], OCC(max_occupancy=30), "warning"),
    ("hos_icu_visitors", "hospital", COMP, "Too many visitors at an ICU bed", [PV], [], OCC(max_occupancy=2), "warning"),
    ("hos_hand_hygiene", "hospital", COMP, "Hand hygiene at ward entry", [POSE], [], None, "info"),
    ("hos_ppe_isolation", "hospital", SAFE, "PPE in isolation wards", [PPE], [], Z(["no_mask", "no_gown"], min_track_age=2), "warning"),
    ("hos_ambulance_bay", "hospital", VEH, "Ambulance bay blocked", [PV], [], LOI(["car", "truck"], seconds=180), "critical"),
    ("hos_pharmacy", "hospital", SEC, "Pharmacy store entry outside approved list", [FACE], ["access_control"], None, "warning"),
    ("hos_fall_corridor", "hospital", SAFE, "Fall in corridors", [PV], [], FALL(), "critical"),

    # --------------------------------------------------------------------- malls
    ("mall_ticketless", "mall", VEH, "Ticketless parking by number plate", [ANPR], ["parking"], None, "info"),
    ("mall_find_car", "mall", CX, "“Find my car” by number plate", [ANPR], ["parking"], None, "info"),
    ("mall_lost_child", "mall", PID, "Lost child search across cameras", [ATTR], [], None, "critical"),
    ("mall_uvss", "mall", SEC, "Under-vehicle scanning at entry", ["under_vehicle", ANPR], [], None, "warning"),
    ("mall_footfall_lease", "mall", CX, "Footfall per store for revenue-share leases", [PV], ["lease"], CNT(), "info"),
    ("mall_zone_heatmap", "mall", CX, "Zone heat maps and dwell", [PV], [], DW(["person"]), "info"),
    ("mall_crowd", "mall", CROWD, "Crowding at events and atriums", [PV], [], DEN(), "warning"),
    ("mall_escalator", "mall", SAFE, "Fall or crowding at escalators", [PV], [], FALL(), "critical"),
    ("mall_parking_occupancy", "mall", OPS, "Parking level occupancy", [PV], ["parking"], OCC(["car"], max_occupancy=200), "info"),
    ("mall_wrong_parking", "mall", VEH, "Car parked in fire lane / reserved bay", [PV], [], LOI(["car"], seconds=300), "warning"),
    ("mall_abandoned", "mall", SEC, "Unattended bag in common areas", [PV], [], LEFT(), "critical"),
    ("mall_after_hours", "mall", SEC, "Presence in closed areas after hours", [PV], [], Z(["person"]), "warning"),
    ("mall_washroom_queue", "mall", CX, "Washroom queue and cleaning trigger", [PV], [], CNT(), "info"),

    # ---------------------------------------------------------------- railway stations
    ("rail_track_person", "railway", SAFE, "Person on the tracks", [PV], [], Z(["person"], min_track_age=2), "critical"),
    ("rail_yellow_line", "railway", SAFE, "Crossing the platform yellow line", [PV], [], Z(["person"], min_track_age=3), "warning"),
    ("rail_stampede", "railway", CROWD, "Early stampede warning (crowd surge)", [PV], [], DEN(max_density=60), "critical"),
    ("rail_dense_crowd", "railway", CROWD, "Dense crowd counting on platforms", ["density"], [], None, "warning"),
    ("rail_footboard", "railway", SAFE, "Footboard travel on departing trains", [POSE], [], None, "warning"),
    ("rail_pantograph", "railway", COMP, "Pantograph and overhead wire inspection", ["defect"], [], None, "warning"),
    ("rail_wagon_ocr", "railway", VEH, "Wagon / coach number reading", [OCR], [], None, "info"),
    ("rail_abandoned", "railway", SEC, "Unattended baggage", [PV], [], LEFT(), "critical"),
    ("rail_fare_gate", "railway", FRAUD, "Fare gate jumping / tailgating", [PV], ["fare"], TAIL(), "warning"),
    ("rail_escalator", "railway", SAFE, "Fall at escalators and stairs", [PV], [], FALL(), "critical"),
    ("rail_footfall", "railway", CROWD, "Footfall per entrance", [PV], [], CNT(), "info"),
    ("rail_watchlist", "railway", PID, "Watchlist face at entrances", [FACE], [], None, "critical"),
    ("rail_trespass_yard", "railway", GEO, "Trespass in yards and depots", [PV], [], Z(["person"]), "critical"),

    # ------------------------------------------------------------ bus stations & fleet
    ("bus_arrival_anpr", "bus", VEH, "Bus arrivals logged by number plate", [ANPR], ["fleet"], None, "info"),
    ("bus_passenger_count", "bus", CROWD, "Passengers boarding and alighting", [PV], [], CNT(), "info"),
    ("bus_drowsy", "bus", DRV, "Driver drowsiness", ["drowsiness"], [], None, "critical"),
    ("bus_phone_driving", "bus", DRV, "Driver using a phone", ["drowsiness"], [], None, "critical"),
    ("bus_seatbelt", "bus", DRV, "Driver seatbelt", ["drowsiness"], [], None, "warning"),
    ("bus_skip_stop", "bus", OPS, "Skipped stops", [], ["fleet"], None, "warning"),
    ("bus_fare_evasion", "bus", FRAUD, "Fare evasion (boardings vs tickets)", [PV], ["fare"], CNT(), "warning"),
    ("bus_bay_overstay", "bus", OPS, "Bus overstaying at the bay", [PV], [], DW(["bus"], max_seconds=900), "info"),
    ("bus_platform_crowd", "bus", CROWD, "Platform crowding", [PV], [], OCC(max_occupancy=60), "warning"),
    ("bus_depot_entry", "bus", VEH, "Depot entry / exit log", [ANPR], ["fleet"], None, "info"),
    ("bus_overspeed_depot", "bus", VEH, "Overspeeding inside the depot", [PV], [], SPD(["bus"], max_speed=0.2), "warning"),

    # ----------------------------------------------------------------------- airports
    ("air_face_boarding", "airport", PID, "Face-based boarding (DigiYatra-style)", [FACE], ["flight_ops"], None, "info"),
    ("air_turnaround", "airport", OPS, "Aircraft turnaround milestones", ["aviation"], ["flight_ops"], None, "info"),
    ("air_fod", "airport", SAFE, "Debris (FOD) on runways and aprons", ["aviation"], [], None, "critical"),
    ("air_runway_incursion", "airport", GEO, "Runway incursion", ["aviation", PV], ["flight_ops"], Z(["person", "car", "truck"]), "critical"),
    ("air_engine_intake", "airport", SAFE, "Person near an engine intake", ["aviation"], [], PROX(["airplane"], max_distance=0.1), "critical"),
    ("air_drone", "airport", SEC, "Drone near the airfield", ["aviation"], [], Z(["drone"], min_track_age=2), "critical"),
    ("air_gse_speed", "airport", SAFE, "Ground vehicle overspeed on apron", ["aviation"], [], SPD(["truck", "car"], max_speed=0.2), "warning"),
    ("air_queue_security", "airport", CX, "Security check queue wait", [PV], [], OCC(max_occupancy=80), "warning"),
    ("air_checkin_queue", "airport", CX, "Check-in counter queue", [PV], [], OCC(max_occupancy=40), "info"),
    ("air_abandoned", "airport", SEC, "Unattended baggage in terminals", [PV], [], LEFT(seconds=90), "critical"),
    ("air_baggage_belt", "airport", OPS, "Baggage belt jams / mishandling", [IND], [], None, "warning"),
    ("air_perimeter", "airport", GEO, "Perimeter fence intrusion", [PV], [], Z(["person"]), "critical"),
    ("air_curbside", "airport", VEH, "Curbside vehicle overstay", [ANPR], [], LOI(["car"], seconds=180), "warning"),
    ("air_watchlist", "airport", PID, "Watchlist face in terminals", [FACE], [], None, "critical"),
    ("air_wrong_way", "airport", GEO, "Wrong way through arrivals exit", [PV], [], LX(["person"], direction="right_to_left"), "critical"),
]


def builtin_catalog() -> list[dict]:
    out = []
    for key, sector, category, name, caps, integ, rule, sev in _RAW:
        out.append({"key": key, "sector": sector, "category": category, "name": name, "capabilities": list(caps),
                    "integrations": list(integ), "rule": rule, "severity": sev})
    return out


def requirements_met(uc: dict, installed_caps: set[str], connected_integrations: set[str]) -> tuple[list, list]:
    """Return (missing capabilities, missing integrations)."""
    return ([c for c in uc["capabilities"] if c not in installed_caps],
            [i for i in uc["integrations"] if i not in connected_integrations])
