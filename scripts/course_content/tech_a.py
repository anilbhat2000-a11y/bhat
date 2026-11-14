"""System Integration Sales, IT Infrastructure, Audio-Visual and Power Solutions."""
from . import q, TF

COURSES = {}

# ---------------------------------------------------------------- System Integration Sales

COURSES["SI Sales Basic: The System Integration Business Model"] = {
    "lessons": [
        """
A system integrator (SI) brings products from many manufacturers together with its own skills to deliver a working solution. Customers buy the outcome, such as a secure network or a working meeting room, not just boxes.

## How an SI earns revenue

- **Product resale:** margin on hardware and software from OEMs. Often competitive and thin.
- **Professional services:** design, installation, configuration, migration, training. Higher margin; depends on skilled people.
- **Support and AMC:** annual maintenance contracts and support renewals. Recurring revenue.
- **Managed services:** running part of the customer's IT for a monthly fee. Long-term, recurring revenue.

> A deal that is only product resale is easy to lose on price. A deal that includes services and support builds a long relationship.
""",
        """
Every solution goes through a lifecycle. An SI can add value, and earn revenue, at each stage.

1. **Assess and plan:** understand the current state and the business goal.
2. **Design:** architecture, bill of materials, implementation plan.
3. **Build:** supply, install, configure, test, migrate.
4. **Operate:** support, monitoring, managed services.
5. **Optimise and refresh:** improvements, upgrades, and replacement at end of life.

## Why it matters to sales

- Customers in different stages need different conversations.
- The operate stage creates the relationship that wins the next refresh.
- Tracking install dates and end-of-support dates shows when to start the next conversation.
""",
        """
Services turn a product sale into a solution, and differentiate us from box sellers.

## Services that add value

- **Site survey and design:** prevents surprises later.
- **Installation and configuration:** to best practice, documented.
- **Migration:** moving data, users and services with minimal disruption.
- **Training:** so the customer's team can run the solution.
- **Support:** a single point of contact across several OEMs.

## Selling services

- Explain the risk the service removes: downtime, failed projects, unhappy users.
- Price services clearly, with a defined scope and deliverables.
- Include services in the first proposal; they are hard to add later.
""",
        """
[PLACEHOLDER: The company will supply a description of its practice areas.]

This lesson will introduce the company's practices (for example networking, security, data centre, collaboration, power) and who leads each. Until then, list the areas you hear about in your first weeks and the subject matter experts for each, so you know whom to bring into a customer conversation.
""",
    ],
    "questions": [
        q("SINGLE", "What does a system integrator sell?", ["A working outcome built from several products and its own skills", "Only boxes at the lowest price", "Only software licences", "Office furniture"], ["A working outcome built from several products and its own skills"]),
        q("MATCHING", "Match each revenue stream to its description.", ["Product resale=Margin on OEM hardware and software", "Professional services=Design, installation and configuration", "Managed services=Running part of the customer's IT for a monthly fee"], points=3),
        q("TRUE_FALSE", "Support and managed services provide recurring revenue.", TF, ["True"]),
        q("SINGLE", "Which lifecycle stage builds the relationship that often wins the next refresh?", ["Operate", "Design", "Assess", "Build"], ["Operate"]),
        q("SINGLE", "When should services be included in a proposal?", ["In the first proposal", "Only after the customer complains", "Never", "After delivery"], ["In the first proposal"]),
        q("FILL_BLANK", "A yearly contract to maintain and support installed equipment is often called an ____.", ["AMC", "annual maintenance contract"]),
    ],
}

COURSES["SI Sales Intermediate: Customer Discovery"] = {
    "lessons": [
        """
In an SI deal, several people influence the decision. Talking only to one of them is risky.

## Who to meet

- **Business leaders:** care about outcomes, cost and risk.
- **IT head or CIO:** care about architecture, support and fit with existing systems.
- **IT operations team:** care about how easy it is to run.
- **Finance:** care about budget, payment terms and total cost.
- **Procurement:** care about process, compliance and fair comparison.
- **Users:** care about whether it makes their work easier.

## Questions for discovery

- What business problem are you solving, and what happens if you do nothing?
- How do you measure success?
- Who else is involved in the decision, and how will it be made?
- What is the budget and timeline?
- What have you tried before?

Record answers and confirm a summary by email.
""",
        """
Customers describe problems, not products. Your job is to map each problem to the right practice areas.

## Examples

- "Our branches lose connectivity often": networking (SD-WAN, link redundancy), possibly power (UPS at branches).
- "We were hit by ransomware last year": security (endpoint, email security, backup), server and storage (immutable backups).
- "Meetings with remote staff are painful": audio-visual and collaboration.
- "Our server room overheats": IT infrastructure (cooling, racks), power.

## Use specialists

Once you see which areas are involved, bring in the presales specialist for each. A joint discovery session with the customer's IT team often uncovers more needs than separate meetings.
""",
        """
Cross-selling means offering related solutions that genuinely help the customer.

## Spot opportunities

- New network: security, Wi-Fi, power protection for network racks.
- New servers: storage, backup, virtualisation, UPS.
- New office: structured cabling, Wi-Fi, AV, access control.
- Any installation: support contract and managed services.

## Do it well

- Link every suggestion to a problem the customer mentioned.
- Keep the main deal moving; do not overload it.
- Propose phases if budget is tight.

> Customers trust advisers who recommend what they need, and remember salespeople who pushed what they did not.
""",
        """
A clean handover to presales saves time and impresses the customer.

## What to hand over

- Customer background and the business problem in their words.
- Stakeholders met, their roles and priorities.
- Known requirements, constraints, budget and timeline.
- Existing environment notes: brands, versions, sites.
- Competition and the decision process.
- Agreed next steps and dates.

## Format

Use the CRM opportunity record plus a short written summary. Introduce the presales engineer to the customer by email, with context, so they do not repeat questions already answered.
""",
    ],
    "questions": [
        q("MULTIPLE", "Who typically influences an SI purchase? Select all that apply.", ["The IT head", "Finance", "Users", "The delivery driver"], ["The IT head", "Finance", "Users"], points=2),
        q("MATCHING", "Match each customer problem to a likely practice area.", ["Branches lose connectivity=Networking", "Ransomware attack last year=Security and backup", "Remote meetings are painful=Audio-visual and collaboration"], points=3),
        q("SINGLE", "What makes a cross-sell suggestion credible?", ["It is linked to a problem the customer mentioned", "It has the highest margin", "It is the newest product", "It is added without explanation"], ["It is linked to a problem the customer mentioned"]),
        q("TRUE_FALSE", "The presales engineer should be introduced to the customer with context, so questions are not repeated.", TF, ["True"]),
        q("SINGLE", "Which discovery question best reveals urgency?", ["What happens if you do nothing?", "What colour is your logo?", "Do you like our brand?", "How many floors does your building have?"], ["What happens if you do nothing?"]),
        q("SHORT_ANSWER", "A customer says 'our server room keeps overheating'. List the practice areas you would involve and the first questions you would ask.", points=4, explanation="Model answer: IT infrastructure (cooling, racks, airflow) and power (UPS, load); ask about room size, number of racks and kW load, current cooling, temperatures, growth plans and outages."),
    ],
}

COURSES["SI Sales Advanced: Solution-based Selling"] = {
    "lessons": [
        """
Senior buyers approve investments that make business sense. A business case shows that in numbers.

## Key measures

- **Total cost of ownership (TCO):** all costs over the solution's life: purchase, installation, licences, support, power, staff time, and the cost of downtime.
- **Return on investment (ROI):** (benefit − cost) ÷ cost, as a percentage over a period.
- **Payback period:** how long until the benefits repay the cost.

## Example

A ₹20 lakh monitoring and redundancy solution prevents downtime that has been costing ₹12 lakh a year. Over three years the benefit is ₹36 lakh; ROI = (36 − 20) ÷ 20 = 80%; payback is under two years.

## Build it with the customer

Use the customer's own figures for downtime cost, staff time and growth. Numbers they supplied are numbers they believe.

> This module includes a lab: build a TCO and ROI comparison for a sample deal.
""",
        """
Managed services mean we operate part of the customer's IT for a regular fee, under agreed service levels.

## What customers gain

- Predictable monthly cost instead of large capital spends.
- Access to skills they cannot hire or keep.
- Round-the-clock monitoring and faster response.

## What we must define

- **Scope:** which devices, sites and services.
- **Service levels:** response and resolution times, uptime, reporting.
- **Responsibilities:** what the customer still does.
- **Pricing:** per device, per user or fixed, with rules for additions.
- **Term and exit:** contract length, renewal and handback.

Multi-year managed service contracts are valuable, but only if the scope and service levels are clear and deliverable.
""",
        """
Large solutions often need partners: OEMs, distributors, specialist subcontractors.

## Working with partners

- **OEMs:** register deals early; involve their specialists for complex designs; agree who presents what.
- **Distributors:** arrange credit, logistics and availability early.
- **Subcontractors:** for civil work, specialist installation or local presence; agree scope, standards and payment back-to-back with our contract.

## Stay in control

- We own the customer relationship and the overall solution.
- Every partner's commitments must support what we promised the customer.
- Hold regular joint reviews during delivery.
""",
        """
Executive committees decide quickly and expect clarity.

## Structure for a 15-minute presentation

1. **The problem and its cost** in business terms.
2. **The recommendation** in one sentence.
3. **The business case:** cost, benefits, payback, risks.
4. **The plan:** phases and milestones.
5. **The decision** you need today.

## Tips

- One slide per point; one chart instead of a table where possible.
- Anticipate objections: budget, risk, timing.
- Bring a technical colleague for detailed questions, but you lead.

> This module includes a live session: present a business case to a mock executive panel.
""",
    ],
    "questions": [
        q("SINGLE", "What does total cost of ownership include?", ["All costs over the solution's life, including support and downtime", "Only the purchase price", "Only installation", "Only licences"], ["All costs over the solution's life, including support and downtime"]),
        q("SINGLE", "A ₹20 lakh solution brings ₹36 lakh of benefit over three years. What is the ROI?", ["80%", "180%", "36%", "16%"], ["80%"], explanation="(36 − 20) ÷ 20 = 0.8, or 80%."),
        q("MULTIPLE", "What must a managed services contract define? Select all that apply.", ["Scope", "Service levels", "Pricing and rules for additions", "The customer's holiday calendar only"], ["Scope", "Service levels", "Pricing and rules for additions"], points=2),
        q("TRUE_FALSE", "When subcontractors are used, we still own the customer relationship and the overall solution.", TF, ["True"]),
        q("SINGLE", "What should an executive presentation end with?", ["The decision you need", "A list of part numbers", "The company history", "A long Q&A with no conclusion"], ["The decision you need"]),
        q("FILL_BLANK", "The time it takes for benefits to repay the cost is the ____ period.", ["payback"]),
    ],
}

# ---------------------------------------------------------------- IT Infrastructure

COURSES["IT Infrastructure Intermediate: Data Centre and Facilities"] = {
    "lessons": [
        """
Racks hold servers, storage and network equipment. Good rack planning makes equipment easy to install, cool and maintain.

## Rack basics

- Height is measured in **rack units (U)**; 1U is 44.45 mm. A common full-height rack is 42U.
- Common widths are 600 mm and 800 mm (wider racks give room for cabling); common depths are 1000 mm and 1200 mm (deep servers need deep racks).
- Check the rack's load rating against the weight of the equipment.

## Layout

- Heavy equipment (UPS, storage) at the bottom.
- Network switches often at the top, near cable entry.
- Leave space for growth, typically 20% or more.
- Plan cable management: vertical managers for power and data, kept separate.
- Fit blanking panels in empty spaces so hot air cannot recirculate to the front.
""",
        """
Every watt of power used by IT equipment becomes heat that must be removed.

## Hot aisle / cold aisle

Racks are placed in rows facing each other, so cold air enters the fronts from a **cold aisle** and hot air leaves the backs into a **hot aisle**. Mixing hot and cold air wastes cooling. Containment (doors or roofs over an aisle) improves this further.

## Power density

Power per rack is measured in kilowatts (kW). A rack of general servers may use a few kW; a rack of GPU servers can use many times more. Cooling must be designed for the real density, not an average.

## Efficiency

**PUE (power usage effectiveness)** = total facility power ÷ IT equipment power. A PUE of 2.0 means for every watt the IT uses, another watt goes on cooling, lighting and losses. Lower is better.
""",
        """
You cannot manage what you cannot see. Monitoring and remote management reduce downtime and site visits.

## What to monitor

- **Environment:** temperature and humidity at rack inlets, water leak sensors, door sensors.
- **Power:** UPS status, battery health, PDU load per circuit.
- **Equipment:** health and alerts from servers, storage and network devices.

## Remote management

- **Out-of-band management** controllers on servers (often called BMCs) allow power cycling, console access and firmware updates even when the operating system is down.
- **Remote console servers** give access to network device consoles.
- Keep management interfaces on a separate, secured network.

> This module includes a lab: configure alerts for temperature, UPS and server health on sample equipment.
""",
        """
Server rooms age: equipment goes out of support, cooling cannot keep up, power is maxed out. A refresh needs planning.

## Assess the current state

- Inventory: equipment, age, warranty and end-of-support dates.
- Power: current load versus UPS and circuit capacity.
- Cooling: current heat load versus capacity, hot spots.
- Space: free rack units and floor space.
- Risks: single points of failure, unsupported equipment.

## Plan the refresh

- Prioritise by risk: unsupported and failing items first.
- Consider consolidation, such as virtualisation, to reduce equipment.
- Plan migration windows to avoid business disruption.
- Size power, cooling and space for three to five years of growth.
""",
    ],
    "questions": [
        q("SINGLE", "What is the height of one rack unit (1U)?", ["44.45 mm", "100 mm", "1 inch", "10 cm"], ["44.45 mm"]),
        q("SINGLE", "Why fit blanking panels in empty rack spaces?", ["To stop hot air recirculating to the front", "To make the rack heavier", "To hide labels", "To reduce GST"], ["To stop hot air recirculating to the front"]),
        q("MATCHING", "Match each aisle to what flows through it.", ["Cold aisle=Cool air entering equipment fronts", "Hot aisle=Hot air leaving equipment backs"], points=2),
        q("SINGLE", "A facility uses 200 kW in total, and IT equipment uses 100 kW. What is the PUE?", ["2.0", "0.5", "1.0", "100"], ["2.0"], explanation="PUE = total facility power ÷ IT power = 200 ÷ 100."),
        q("TRUE_FALSE", "Out-of-band management lets you power-cycle a server even when its operating system is down.", TF, ["True"]),
        q("FILL_BLANK", "A common full-height rack has ____ U of space.", ["42"]),
    ],
}

COURSES["IT Infrastructure Advanced: Infrastructure Architecture"] = {
    "lessons": [
        """
High availability means critical services keep running when a component fails.

## Remove single points of failure

A single point of failure (SPOF) is any part whose failure stops the service. Look at every layer:

- **Power:** dual power supplies fed from separate PDUs and UPSs.
- **Network:** two core switches, two uplinks, two internet links from different providers.
- **Compute:** clusters so workloads move if a host fails.
- **Storage:** redundant controllers, RAID, replication.
- **Facilities:** cooling redundancy.

## Redundancy levels

- **N:** exactly enough capacity, no spare.
- **N+1:** one extra unit beyond what is needed.
- **2N:** a complete duplicate system.

Match the level to the business cost of downtime. Not every service needs 2N.
""",
        """
Capacity planning makes sure infrastructure keeps up with growth without large over-investment.

## Measure current use

- Compute: CPU and memory utilisation, at peak, not average.
- Storage: used capacity, growth per month, performance (IOPS, latency).
- Network: link utilisation at peak.
- Power and cooling: load versus capacity.

## Project forward

- Use the business plan: new staff, sites, applications.
- Apply growth rates from history.
- Keep headroom: a common target is to stay below about 70 to 80% of capacity at peak.

## Plan purchases

Buy in steps aligned to growth, and design so capacity can be added without redesign, for example spare slots, scalable storage and modular UPS.

> This module includes a lab: size compute and storage for a sample company's three-year plan.
""",
        """
Infrastructure must be run well for its whole life.

## Operations

- **Monitoring and alerting** with clear owners for each alert.
- **Change management:** plan, approve, test and record changes.
- **Patching and firmware:** a regular schedule, tested first.
- **Backups:** scheduled, monitored, and restore-tested.
- **Documentation:** kept current as changes are made.

## Lifecycle

- Track **end-of-sale** and **end-of-support** dates from OEMs for every product.
- Plan replacements before support ends; unsupported equipment gets no security fixes.
- Securely wipe or destroy storage before disposing of equipment.
""",
        """
Good documentation lets someone else run, fix and extend the infrastructure.

## A handover pack contains

- High-level architecture diagram and the design rationale.
- Network diagrams, IP address plan and VLANs.
- Rack layouts and cable schedules.
- Equipment inventory with serial numbers, warranty and support details.
- Configuration backups and standard settings.
- Credentials handed over securely, not in the document.
- Operating procedures: start-up, shutdown, backup, restore, escalation.
- Test results from commissioning.

## Keep it alive

Assign an owner to update documentation with every change. Outdated documents are worse than none, because people trust them.
""",
    ],
    "questions": [
        q("SINGLE", "What is a single point of failure?", ["A component whose failure stops the service", "A spare part", "A backup tape", "A redundant switch"], ["A component whose failure stops the service"]),
        q("MATCHING", "Match each redundancy level to its meaning.", ["N=Exactly enough capacity", "N+1=One extra unit beyond what is needed", "2N=A complete duplicate system"], points=3),
        q("TRUE_FALSE", "Capacity planning should be based on average utilisation, not peak.", TF, ["False"]),
        q("MULTIPLE", "Which belong in a handover pack? Select all that apply.", ["IP address plan and VLANs", "Rack layouts and cable schedules", "Equipment inventory with warranty details", "Passwords written in the document"], ["IP address plan and VLANs", "Rack layouts and cable schedules", "Equipment inventory with warranty details"], points=2),
        q("SINGLE", "Why replace equipment before its end-of-support date?", ["Unsupported equipment gets no security fixes or repairs", "It changes colour", "It becomes heavier", "It is required by GST"], ["Unsupported equipment gets no security fixes or repairs"]),
        q("SHORT_ANSWER", "A customer's file server, core switch and internet link each exist only once. Describe how you would remove the single points of failure.", points=4, explanation="Model answer: cluster or replicate the file server (or move to redundant storage), add a second core switch with redundant links, and add a second internet link from a different provider with failover; also check power redundancy."),
    ],
}

# ---------------------------------------------------------------- Audio-Visual

COURSES["AV Solutions Basic: Displays, Audio and Conferencing"] = {
    "lessons": [
        """
Choosing the right display starts with the room and the content.

## Display types

- **Flat panels (LCD/LED TVs and professional displays):** bright, simple, for small and medium rooms. Professional displays are built for long daily use.
- **Interactive flat panels:** touch displays for training rooms and collaboration.
- **Projectors:** large images at lower cost; need light control. Brightness is measured in lumens; brighter rooms need more.
- **LED video walls:** very large, bright and seamless; for large venues and lobbies.

## Size

A common rule of thumb: the farthest viewer should be no more than about six times the image height away for general content, and closer for detailed content such as spreadsheets. Check text is readable from the back row.

## Other checks

- Ambient light and windows.
- Mounting: wall strength, height, viewing angles.
- Inputs: HDMI, USB-C, network.
""",
        """
In a meeting room, poor audio ruins a call faster than poor video.

## Microphones

- **Ceiling microphones and arrays:** clean tables, cover the whole room.
- **Table (boundary) microphones:** good pickup close to participants.
- **Gooseneck microphones:** for boardrooms and podiums.
- **Wireless handheld and lapel microphones:** for presenters and training.

## Speakers

Ceiling or wall speakers spread sound evenly; small rooms may use speakers in the video bar.

## Digital signal processors (DSP)

A DSP mixes and processes audio. Its most important job in conferencing is **acoustic echo cancellation (AEC)**: it stops remote participants hearing their own voices back. It also handles gain control and noise reduction.

## The room matters

Hard surfaces such as glass and bare walls cause echo. Soft furnishings and acoustic panels help more than expensive equipment.
""",
        """
Conferencing rooms come in a few common types.

- **Huddle rooms (2 to 6 people):** an all-in-one video bar with camera, microphones and speakers, plus one display.
- **Small and medium rooms (6 to 12):** video bar or separate camera, with extra microphones; one or two displays.
- **Boardrooms (12+):** multiple cameras or a tracking camera, ceiling or table microphones, DSP, and two displays.
- **Training rooms:** presenter microphones, cameras on the presenter and audience, and interactive displays.

## Platform choice

- **Native room systems** run a meeting platform directly (such as Microsoft Teams Rooms or Zoom Rooms): one-touch join, consistent experience.
- **Bring your own device (BYOD):** users connect their laptops to the room's camera and audio by USB; flexible across platforms.

Ask which platforms the customer uses before designing.
""",
        """
A site survey prevents surprises during installation.

## What to record

- Room dimensions, ceiling height and type, and photos of every wall.
- Windows, lighting and acoustics: hard surfaces, echo.
- Furniture layout and seating capacity.
- Power points and network points, and where new ones are needed.
- Wall construction for mounting displays.
- Cable routes and containment.
- How the room is used: meetings, training, presentations, recording.

## After the survey

Produce a short survey report with a sketch of the room and the proposed equipment positions. Confirm it with the customer before finalising the design.

> This module includes a lab: complete a survey of a sample room using the checklist.
""",
    ],
    "questions": [
        q("SINGLE", "Which display is best for a large lobby needing a very large, bright, seamless image?", ["LED video wall", "Small TV", "Interactive panel", "Laptop screen"], ["LED video wall"]),
        q("SINGLE", "What is the most important job of a DSP in a conferencing room?", ["Acoustic echo cancellation", "Making the display brighter", "Recording attendance", "Charging laptops"], ["Acoustic echo cancellation"]),
        q("MATCHING", "Match each room type to a typical setup.", ["Huddle room=All-in-one video bar and one display", "Boardroom=Multiple cameras, ceiling or table mics and a DSP", "Training room=Presenter mics, audience cameras and interactive displays"], points=3),
        q("TRUE_FALSE", "Hard surfaces such as glass walls can cause echo in a meeting room.", TF, ["True"]),
        q("FILL_BLANK", "Projector brightness is measured in ____.", ["lumens", "lumen"]),
        q("MULTIPLE", "What should a site survey record? Select all that apply.", ["Room dimensions and photos", "Power and network points", "Wall construction for mounting", "The CEO's favourite film"], ["Room dimensions and photos", "Power and network points", "Wall construction for mounting"], points=2),
    ],
}

COURSES["AV Solutions Advanced: Large Venues and AV over IP"] = {
    "lessons": [
        """
Auditoriums, halls and large training spaces need careful audio design.

## Acoustics first

- **Reverberation:** sound reflecting around the room. Too much makes speech unclear.
- **Intelligibility:** whether speech can be understood, often measured with the speech transmission index (STI).
- Acoustic treatment (absorbers, diffusers) may be needed before choosing speakers.

## Sound reinforcement

- **Line array or column speakers** project sound evenly over long distances.
- **Delay speakers** cover rear seats, time-aligned so sound arrives together.
- Design for even coverage and enough level above background noise, without feedback.

## Design tools

Acoustic modelling software predicts coverage and intelligibility before installation. Validate with measurements during commissioning.
""",
        """
Video walls and command centres display large amounts of information, often around the clock.

## Video wall technologies

- **LCD video walls:** tiled displays with narrow bezels; cost-effective; small seams between panels.
- **Direct-view LED:** seamless and very bright. **Pixel pitch** (distance between pixels, in mm) sets the closest comfortable viewing distance: a smaller pitch suits closer viewing and costs more.

## Command and control centres

- **Video wall controllers** place many sources (cameras, dashboards, maps) in flexible layouts.
- Operators need ergonomic consoles and sightlines to the wall.
- Equipment must suit 24/7 use; plan redundancy for controllers and power.
- Consider heat, noise and maintenance access behind the wall.
""",
        """
AV over IP sends audio and video across a standard network instead of dedicated cables and matrix switchers.

## Common technologies

- **Audio:** Dante is widely used for networked audio.
- **Video:** several approaches exist, for example NDI, SDVoE and IPMX, with different trade-offs between bandwidth, latency and compression.

## Network requirements

- **Bandwidth:** uncompressed or lightly compressed video can need very high bandwidth; plan switch capacity accordingly.
- **Multicast:** one source to many displays; needs IGMP snooping and a querier configured on the switches.
- **Quality of service (QoS):** prioritise audio and clock traffic.
- **Clock synchronisation:** many systems use PTP; switches must support it properly.
- **Separation:** a dedicated AV network or VLAN, agreed with the customer's network team.

> Involve the network team from the start. Most AV-over-IP problems are network configuration problems.
""",
        """
Managed AV services keep rooms working and users confident.

## Typical services

- **Remote monitoring** of rooms and devices, with alerts before users report problems.
- **Preventive maintenance:** scheduled checks, firmware updates, cleaning.
- **Help desk and on-site support** with defined response times.
- **Usage reporting:** which rooms are used, and how much; helps plan future spaces.
- **User training and adoption** support.

## Defining the service

Agree the rooms and devices in scope, service hours, response and resolution times, reporting, and how new rooms are added. Price per room or per device, per month.
""",
    ],
    "questions": [
        q("SINGLE", "What does too much reverberation do in an auditorium?", ["Makes speech unclear", "Makes the room cooler", "Improves intelligibility", "Has no effect"], ["Makes speech unclear"]),
        q("SINGLE", "For a direct-view LED wall viewed from close up, which pixel pitch is better?", ["A smaller pixel pitch", "A larger pixel pitch", "Pixel pitch does not matter", "The largest available"], ["A smaller pixel pitch"]),
        q("MULTIPLE", "Which network features does AV over IP often need? Select all that apply.", ["Multicast with IGMP snooping", "Quality of service", "Clock synchronisation such as PTP", "Turning off all switches at night"], ["Multicast with IGMP snooping", "Quality of service", "Clock synchronisation such as PTP"], points=2),
        q("MATCHING", "Match each technology to its use.", ["Dante=Networked audio", "Video wall controller=Arranges many sources on a wall", "Delay speakers=Cover rear seats in a large hall"], points=3),
        q("TRUE_FALSE", "Most AV-over-IP problems turn out to be network configuration problems.", TF, ["True"]),
        q("FILL_BLANK", "The distance between pixels on an LED display, in millimetres, is called the pixel ____.", ["pitch"]),
    ],
}

# ---------------------------------------------------------------- Power Solutions

COURSES["Power Solutions Intermediate: Sizing UPS, Batteries and DG Sets"] = {
    "lessons": [
        """
UPS sizing starts with an accurate list of the loads it must support.

## Steps

1. **List every load** with its power in watts (W). Use measured values or nameplate figures; nameplate figures are maximums and usually overstate real use.
2. **Add them up** to get the total load in watts.
3. **Allow for growth,** often 20 to 25% for future equipment.
4. **Avoid running near full load:** a common practice is to keep a UPS below about 80% of its rating in normal use.
5. **Convert to VA if needed:** UPS ratings are given in VA and watts. Watts = VA × power factor. Modern online UPSs often have an output power factor of 0.9 or 1.0; check the datasheet.

## Example

Loads total 4,000 W. With 25% growth: 5,000 W. Keeping below 80%: 5,000 ÷ 0.8 = 6,250 W. A UPS rated at least about 6.25 kW (for example a 10 kVA unit with 0.9 power factor gives 9 kW) is suitable.

> This module includes a lab: size a UPS for a sample server room load list.
""",
        """
Battery backup time depends on the load, the battery capacity, and the UPS efficiency.

## A first estimate

Backup time (hours) ≈ (battery bank voltage × ampere-hours × UPS efficiency) ÷ load in watts.

Example: a 192 V battery bank (16 batteries of 12 V) of 26 Ah, UPS efficiency 0.9, load 3,000 W:
(192 × 26 × 0.9) ÷ 3,000 ≈ 1.5 hours in theory.

## Why real sizing differs

- Batteries deliver less capacity at high discharge rates; manufacturers publish **discharge tables** that must be used for final sizing.
- Capacity falls with **age** and **temperature**; sizing usually adds a margin for end of life.
- Battery rooms should be kept near the recommended temperature (often around 25 °C) to protect life.

Always confirm the final battery configuration using the UPS and battery manufacturer's sizing tools.
""",
        """
A diesel generator (DG) set takes over during long power cuts, with the UPS bridging the gap until the generator starts.

## Sizing a DG to work with a UPS

- The DG must supply the UPS input, including **battery recharging**, plus any other loads on the generator (cooling, lighting).
- UPSs can draw current in ways that stress small generators. A common rule of thumb sizes the DG at around **1.5 to 2 times** the UPS rating; follow the UPS manufacturer's recommendation.
- Check generator compatibility with the UPS (frequency tolerance, synchronisation, harmonic handling).

## Change-over

An automatic transfer switch or AMF panel starts the generator and switches the load when mains fails, and switches back when it returns. Test this regularly under load.
""",
        """
Not every power problem is a full outage. Power conditioning protects sensitive equipment from poor-quality supply.

## Common problems and solutions

- **Voltage fluctuations:** servo-controlled voltage stabilisers keep voltage steady for loads without a UPS.
- **Surges and spikes:** surge protection devices at the distribution board and point of use.
- **Electrical noise and neutral-to-earth voltage:** isolation transformers.
- **Harmonics:** generated by many non-linear loads; can overheat neutral conductors; filters or correctly rated equipment may be needed.

## Earthing

A proper earthing system is essential for safety and equipment protection. Have the earth resistance measured and kept within the limits the electrical consultant specifies, and check it periodically.
""",
    ],
    "questions": [
        q("SINGLE", "UPS output is 10 kVA with a power factor of 0.9. What is the output in watts?", ["9,000 W", "10,000 W", "11,111 W", "900 W"], ["9,000 W"], explanation="Watts = VA × power factor = 10,000 × 0.9."),
        q("SINGLE", "Loads total 4,000 W. With 25% growth and an 80% loading limit, what minimum UPS capacity is needed?", ["6,250 W", "5,000 W", "4,000 W", "3,200 W"], ["6,250 W"], explanation="4,000 × 1.25 = 5,000; 5,000 ÷ 0.8 = 6,250 W."),
        q("TRUE_FALSE", "The simple battery backup formula is enough for final sizing; discharge tables are not needed.", TF, ["False"], explanation="Real capacity depends on discharge rate, age and temperature; use the manufacturer's tables."),
        q("SINGLE", "A common rule of thumb for sizing a DG set to support a UPS is:", ["About 1.5 to 2 times the UPS rating", "Exactly the UPS rating", "Half the UPS rating", "Ten times the UPS rating"], ["About 1.5 to 2 times the UPS rating"]),
        q("MATCHING", "Match each power problem to a solution.", ["Voltage fluctuations=Servo-controlled stabiliser", "Surges and spikes=Surge protection devices", "Electrical noise=Isolation transformer"], points=3),
        q("FILL_BLANK", "The switch that changes the load from mains to generator automatically is called an automatic ____ switch.", ["transfer"]),
    ],
}

COURSES["Power Solutions Advanced: Resilient Power Design"] = {
    "lessons": [
        """
Critical sites need power designs that survive component failures and allow maintenance without shutdown.

## Common architectures

- **N:** one UPS sized for the load. Any failure or maintenance affects the load (unless bypassed to raw mains).
- **N+1:** enough UPS modules for the load plus one spare, often in a parallel or modular system. One module can fail or be serviced.
- **2N:** two completely independent power paths (A and B), each able to carry the full load. Dual-corded equipment draws from both.

## Choosing

Match the architecture to the cost of downtime. A branch office may be fine with N; a primary data centre often needs 2N for critical loads. Remember that redundancy is only as good as its weakest shared part, such as a single distribution board.
""",
        """
Power must reach every device reliably, and be measured.

## Distribution

- Separate circuits for each rack or row, sized for the load with margin.
- **A and B feeds:** two PDUs per rack, each from a different UPS or path, so dual-power-supply equipment survives the loss of one.
- Balance load across phases in three-phase systems.

## Rack PDUs

- **Basic:** distribution only.
- **Metered:** show total current, so circuits are not overloaded.
- **Monitored / switched:** per-outlet measurement and remote on/off control.

## Monitoring

Monitor UPS, PDUs and circuits centrally. Watch that each feed of a 2N design stays below half its capacity; otherwise, losing one feed overloads the other.
""",
        """
Power and cooling must be designed together. Every kilowatt of IT load becomes heat that the cooling system must remove.

## Points to coordinate

- Cooling equipment needs power too, and often must be on generator, and for critical sites even on UPS, so cooling continues during an outage.
- Rising power density per rack needs matching cooling capacity at the rack, not just in the room.
- Redundancy levels should match: an N+1 cooling system behind a 2N power system leaves cooling as the weak point.

## Efficiency

- Higher UPS load and efficient modes reduce losses.
- Containment and correct temperature set points reduce cooling energy.
- Track **PUE** (total facility power ÷ IT power) to measure overall efficiency.
""",
        """
Power systems need maintenance; resilient designs allow it without shutting down the load.

## Maintenance practice

- Follow the manufacturer's schedule for UPS, batteries and generators.
- Test batteries regularly and replace them before end of life.
- Run generators on load periodically, not just idle.
- Use **maintenance bypass** switches so a UPS can be serviced while the load stays powered.

## Planning a maintenance window

1. Confirm the redundant path is healthy before starting.
2. Inform stakeholders and agree the window.
3. Follow a written procedure (method statement), step by step.
4. Have a rollback plan.
5. Record what was done and the readings taken.
""",
    ],
    "questions": [
        q("MATCHING", "Match each architecture to its description.", ["N=One UPS sized for the load", "N+1=Enough modules for the load plus one spare", "2N=Two independent power paths, each carrying the full load"], points=3),
        q("SINGLE", "In a 2N design, why must each feed stay below half its capacity?", ["So that losing one feed does not overload the other", "To save paper", "Because GST requires it", "It does not matter"], ["So that losing one feed does not overload the other"]),
        q("SINGLE", "Which rack PDU type allows remote on/off control of individual outlets?", ["Switched", "Basic", "Metered", "Passive"], ["Switched"]),
        q("TRUE_FALSE", "Cooling equipment may need to be on generator or UPS so cooling continues during an outage.", TF, ["True"]),
        q("MULTIPLE", "Which belong in planning a power maintenance window? Select all that apply.", ["Confirm the redundant path is healthy", "Follow a written method statement", "Have a rollback plan", "Skip informing stakeholders to save time"], ["Confirm the redundant path is healthy", "Follow a written method statement", "Have a rollback plan"], points=2),
        q("FILL_BLANK", "A switch that keeps the load powered while a UPS is serviced is a maintenance ____ switch.", ["bypass"]),
    ],
}
