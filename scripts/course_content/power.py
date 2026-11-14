"""Power solutions: UPS, power quality and earthing; sizing UPS, batteries and DG sets; resilient power design."""
from . import q, TF

COURSES = {}

BIS = ("Bureau of Indian Standards: IS 3043 code of practice for earthing and other electrical standards", "https://www.bis.gov.in/")
IEC = ("IEC: IEC 62040-3 UPS performance classification and IEC 61643 surge protective devices", "https://webstore.iec.ch/")
CPCB = ("Central Pollution Control Board: emission norms for diesel generator sets (CPCB IV+)", "https://cpcb.nic.in/")
CEA = ("Central Electricity Authority: safety and electricity supply regulations", "https://cea.nic.in/")
IEEE = ("IEEE Standards Association: IEEE 1188 (VRLA battery maintenance) and IEEE 519 (harmonics)", "https://standards.ieee.org/")
UPTIME = ("Uptime Institute: Tier Classification System", "https://uptimeinstitute.com/tiers")

COURSES["Power Solutions Basic: UPS, Power Quality and Earthing"] = {
    "lessons": [
        """
IT equipment needs clean, stable power. In India, mains supply is nominally 230 V single-phase or about 400–415 V three-phase, at 50 Hz, but the real supply often varies. Power problems are a leading cause of equipment failure, data corruption and downtime.

## Common power problems

- **Outage (blackout):** complete loss of power.
- **Sag (dip):** a short drop in voltage, often caused by large motors starting nearby.
- **Swell:** a short rise in voltage.
- **Transient (spike or surge):** a very short, high-voltage event, from lightning or switching of heavy loads.
- **Under-voltage and over-voltage:** voltage that stays too low or too high for long periods.
- **Frequency variation:** common when running on generators.
- **Harmonics:** distortion of the voltage waveform, caused by non-linear loads such as computers and drives.
- **Electrical noise:** interference from other equipment.

## Effects on IT equipment

- Sudden shutdowns that corrupt data and damage file systems.
- Stress on power supplies that shortens equipment life.
- Damage from surges, sometimes immediate and sometimes cumulative.
- Unexplained reboots and errors that are hard to diagnose.

## Key terms

- **Power quality:** how close the supply is to an ideal, stable sine wave at the correct voltage and frequency.
- **Sag / swell:** short-term voltage decrease / increase.
- **Transient:** a very short, high-energy disturbance.
- **Harmonics:** waveform distortion at multiples of the base frequency.

## Real-world example

A textile company's office near its factory reports frequent PC reboots every morning. A power quality analyser shows voltage sags each time large looms start. The SI installs line-interactive UPS units for the PCs and recommends separating the office supply from the factory loads. The reboots stop.

## Common mistakes

- Assuming outages are the only power problem.
- Diagnosing reboots as software issues without checking power.
- Ignoring harmonics from IT loads themselves.

## Key takeaways

- Power problems include outages, sags, swells, transients, harmonics and noise.
- They cause data corruption, equipment damage and hard-to-diagnose faults.
- Measure power quality before choosing a solution.
""",
        """
A UPS (uninterruptible power supply) protects equipment from power problems and keeps it running for a time during outages, using batteries. The international standard IEC 62040-3 describes three main UPS topologies.

## The three UPS types

- **Passive standby (offline):** the load runs directly on mains; when mains fails, the UPS switches to its inverter. Simple and low cost, with a short transfer time. Suitable for individual PCs.
- **Line-interactive:** like standby, but with an automatic voltage regulator that corrects sags and swells without using the battery. Good for small servers, network equipment and offices with fluctuating voltage.
- **Double-conversion (online):** the incoming AC is converted to DC and back to clean AC continuously, so the load is always isolated from the mains. There is no transfer time. The standard choice for servers, data centres and critical loads.

## UPS ratings

- **kVA and kW:** kVA is apparent power; kW is real power. kW = kVA × power factor. Modern UPS units often have an output power factor of 0.9 or 1.0. Size by the load's kW and check both ratings.
- **Backup time (runtime):** how long the UPS can support the load on battery; depends on battery capacity and load.
- **Single-phase or three-phase:** larger UPS systems are usually three-phase.

## Key terms

- **Inverter:** converts DC from the battery to AC.
- **Rectifier:** converts incoming AC to DC.
- **Transfer time:** the time a standby or line-interactive UPS takes to switch to battery.
- **Bypass:** a path that feeds the load from mains if the UPS faults or for maintenance.

## Real-world example

A customer buys line-interactive UPS units for its server room to save cost. The site is fed by a diesel generator during frequent outages, and the generator's frequency varies. The line-interactive UPS units keep switching to battery and drain them. The SI replaces them with an online double-conversion UPS that tolerates the generator supply and delivers stable output.

## Common mistakes

- Using standby UPS units for servers.
- Sizing by kVA alone without checking kW.
- Ignoring how the UPS behaves on generator power.

## Key takeaways

- Standby for PCs, line-interactive for small loads, online double-conversion for critical loads.
- Check both kW and kVA ratings; kW = kVA × power factor.
- Consider generator compatibility and backup time.
""",
        """
Earthing (grounding) connects electrical systems and equipment to the earth. It protects people from electric shock, provides a safe path for fault currents and surges, and gives IT equipment a stable reference. Poor earthing is a common hidden cause of IT problems in Indian sites.

## Why earthing matters

- **Safety:** if a fault occurs, current flows to earth and protective devices trip, instead of passing through a person.
- **Equipment protection:** surge protection devices need a good earth to divert surges.
- **Stable operation:** a poor earth can cause a high voltage between neutral and earth, leading to errors, reboots and damaged equipment.

## Key points for IT sites

- Earthing design and installation should follow IS 3043, the Indian code of practice for earthing, and be done by qualified electrical contractors.
- **Neutral-to-earth voltage** should be low; many IT equipment manufacturers ask for it to be below about 2 V at the equipment.
- **Earth resistance** should be measured and kept low; data-centre specifications commonly target 1 ohm or less, as set by the design engineer.
- Earth pits need maintenance, especially in dry seasons when resistance rises.
- All IT equipment, racks and cable trays should be bonded to the same earth system.

## Key terms

- **Earthing:** connecting electrical systems to the ground for safety and stability.
- **Neutral-to-earth voltage:** the voltage difference between neutral and earth; should be low.
- **Earth pit:** the electrode installation in the ground.
- **Bonding:** connecting metal parts together so they are at the same potential.

## Real-world example

At a branch office, network switches fail repeatedly after storms. A site check finds a neutral-to-earth voltage of 9 V and an earth pit that has dried out. After a qualified electrician rebuilds the earth pit and bonds the racks properly, and surge protection is added, failures stop.

## Common mistakes

- Installing UPS and IT equipment without checking earthing.
- Never testing earth resistance after installation.
- Letting non-qualified people modify earthing.

## Key takeaways

- Earthing protects people and equipment and stabilises IT operation.
- Follow IS 3043 and use qualified electricians.
- Measure neutral-to-earth voltage and earth resistance, and maintain earth pits.
""",
        """
A load survey identifies all the equipment that needs power protection and how much power it uses. It is the starting point for sizing any UPS or power solution.

## Steps in a load survey

1. **List all equipment** to be protected: servers, storage, switches, firewalls, PCs, phones and cooling if needed.
2. **Record power ratings:** from nameplates, datasheets or manufacturer power calculators. Nameplate ratings are usually maximums; real use is often lower.
3. **Measure actual load:** with a clamp meter or power analyser, where equipment is already running.
4. **Note critical loads:** which equipment must run during an outage and for how long.
5. **Check the electrical supply:** single- or three-phase, voltage, earthing, existing distribution and breaker sizes.
6. **Check the environment:** space for the UPS and batteries, floor loading, ventilation and temperature.
7. **Ask about the future:** expected growth in equipment over the next three to five years.

## Recording the survey

A simple table lists each device, quantity, power per unit, total power and whether it is critical. Add photos of the electrical panel and the proposed UPS location.

## Key terms

- **Load survey:** a record of equipment and its power needs.
- **Nameplate rating:** the maximum power shown on the equipment label.
- **Clamp meter:** a tool that measures current without disconnecting wires.
- **Critical load:** equipment that must stay powered during outages.

## Real-world example

A customer requests a 20 kVA UPS for its server room. The load survey with a power analyser shows an actual load of about 6 kW, with expected growth to 9 kW over three years. The SI proposes a 10 kVA/10 kW online UPS with expandable batteries. The customer saves money, and the UPS runs at an efficient load level.

## Common mistakes

- Adding up nameplate ratings and oversizing the UPS.
- Forgetting future growth.
- Not checking the UPS location, ventilation and floor loading.

## Key takeaways

- List and measure loads, identify critical equipment and check the supply.
- Use measured load where possible, not just nameplate ratings.
- Include growth, location and environment in the survey.
""",
    ],
    "questions": [
        q("SINGLE", "Which UPS type continuously converts AC to DC and back, with no transfer time?", ["Passive standby", "Line-interactive", "Double-conversion online", "Generator"], ["Double-conversion online"],
          explanation="Online double-conversion UPS isolates the load from the mains all the time."),
        q("SINGLE", "A UPS is rated 10 kVA with a power factor of 0.9. What is its kW rating?", ["10 kW", "9 kW", "11 kW", "0.9 kW"], ["9 kW"],
          explanation="kW = kVA × power factor = 10 × 0.9 = 9 kW."),
        q("TRUE_FALSE", "A sag is a short drop in voltage, often caused by large motors starting.", TF, ["True"],
          explanation="Starting motors draw large currents, causing voltage dips."),
        q("SINGLE", "Which Indian standard is the code of practice for earthing?", ["IS 3043", "IS 456", "IS 1200", "ISO 9001"], ["IS 3043"],
          explanation="IS 3043 is the BIS code of practice for earthing."),
        q("MULTIPLE", "What should a load survey record?", ["Equipment and quantities", "Power ratings and measured load", "Critical loads and backup time", "Employees' home addresses"], ["Equipment and quantities", "Power ratings and measured load", "Critical loads and backup time"],
          explanation="The survey captures what needs power, how much and for how long."),
        q("TRUE_FALSE", "Adding up nameplate ratings always gives the most accurate UPS size.", TF, ["False"],
          explanation="Nameplate ratings are maximums; measured load is usually lower."),
        q("MATCHING", "Match each power problem to its description.", ["Outage=Complete loss of power", "Transient=Very short high-voltage spike", "Swell=Short rise in voltage", "Harmonics=Waveform distortion from non-linear loads"],
          explanation="Each problem needs a different kind of protection."),
    ],
    "sources": [IEC, BIS, CEA],
}

COURSES["Power Solutions Intermediate: Sizing UPS, Batteries and DG Sets"] = {
    "lessons": [
        """
Sizing a UPS correctly ensures it can carry the load safely, run efficiently and allow for growth. Undersizing causes overloads and shutdowns; oversizing wastes money and can reduce efficiency.

## Step-by-step UPS sizing

1. **Total the load in kW** from the load survey, using measured values where available.
2. **Add growth,** typically 20 to 30% for expected expansion.
3. **Allow headroom,** so the UPS normally runs at no more than about 80% of its rating.
4. **Check kVA as well as kW,** using the UPS's output power factor.
5. **Choose phase:** single-phase for small loads; three-phase for larger systems.
6. **Consider redundancy:** an N+1 modular UPS allows one module to fail without losing the load.

## Example

Measured load: 12 kW. Growth of 25%: 15 kW. For an 80% loading limit: 15 ÷ 0.8 = 18.75 kW. A 20 kVA UPS with a 1.0 output power factor (20 kW) is suitable. With a 0.9 power factor, a 20 kVA UPS gives 18 kW, which is just short, so the next size up would be chosen.

## Other considerations

- **Inrush current:** some loads draw high current at start-up.
- **Efficiency:** check efficiency at the expected load level; it affects running costs and heat.
- **Input requirements:** cable and breaker sizes for the UPS input.
- **Physical size and weight:** space and floor loading, especially for batteries.

## Key terms

- **Headroom:** spare capacity above the expected load.
- **Modular UPS:** a UPS built from power modules that can be added or replaced.
- **Efficiency:** output power divided by input power.
- **Inrush current:** a brief high current when equipment starts.

## Real-world example

A company buys a UPS sized exactly to its current 8 kW load. A year later, new servers push the load to 9.5 kW and the UPS goes into overload during a test, transferring to bypass. A proper sizing with growth and headroom would have chosen a larger or modular UPS that could be expanded.

## Common mistakes

- Sizing without growth or headroom.
- Checking kVA but not kW.
- Ignoring input electrical requirements.

## Key takeaways

- Size from measured kW, add growth and keep loading near 80% or less.
- Check both kW and kVA, and consider modular N+1 designs.
- Check efficiency, inrush and electrical input requirements.
""",
        """
Batteries provide the backup time in a UPS system. Choosing and sizing batteries correctly, and keeping them in the right conditions, decides whether the UPS actually works during an outage.

## Battery types

- **VRLA (valve-regulated lead-acid):** the most common UPS battery; sealed and maintenance-free in the sense that no water is added, but still needing checks. Available in different design lives, such as 5-year and 10-year types.
- **Lithium-ion:** smaller and lighter, longer life and more tolerant of higher temperatures, with a higher upfront cost. Uses a battery management system (BMS) for safety.

## Sizing for backup time

Backup time depends on the load, the battery capacity and the UPS's DC voltage. A simplified calculation is:

- Battery energy needed (Wh) ≈ load (W) × backup time (hours) ÷ inverter efficiency.
- Add allowances for battery ageing and temperature, commonly around 25%.
- Manufacturers publish discharge tables showing how long each battery model supports a given load; use them, or the manufacturer's sizing tool, for the final choice.

## Temperature and life

Battery life drops sharply at high temperatures. For VRLA batteries, a widely used rule of thumb is that life roughly halves for every 8 to 10 °C above 25 °C. Batteries should be kept in a cool, ventilated space, not in a hot electrical room.

## Key terms

- **VRLA:** valve-regulated lead-acid battery.
- **Ah (ampere-hour):** a measure of battery capacity.
- **Design life:** the manufacturer's expected life under ideal conditions.
- **BMS:** battery management system, which monitors and protects lithium-ion cells.

## Real-world example

A branch office's UPS batteries are installed in a room that reaches 40 °C in summer. Rated as 5-year batteries, they fail after about 18 months and the UPS shuts down during the next outage. The SI moves the batteries to an air-conditioned space and adds battery monitoring. The replacement batteries last as expected.

## Common mistakes

- Placing batteries in hot rooms.
- Sizing without ageing and temperature allowances.
- Never testing battery backup time.

## Key takeaways

- VRLA is common; lithium-ion offers longer life and smaller size at higher cost.
- Size from load, backup time and efficiency, with allowances, using manufacturer tables.
- Keep batteries near 25 °C to protect their life.
""",
        """
For long outages, a UPS alone is not enough; a diesel generator (DG set) provides power for hours or days. The UPS bridges the gap until the generator starts and stabilises, typically within a minute or less.

## How DG and UPS work together

1. Mains fails; the UPS supports the load from its batteries.
2. The automatic mains failure (AMF) panel starts the generator.
3. After the generator stabilises, the automatic transfer switch (ATS) connects it to the load panel.
4. The UPS runs from generator power and recharges its batteries.
5. When mains returns, the ATS switches back and the generator shuts down after cooling.

## Sizing a DG set for UPS loads

- A UPS presents a non-linear load and may draw extra power to recharge batteries, so generators are usually sized larger than the UPS rating. A common rule of thumb is **1.5 to 2 times** the UPS kVA rating, depending on UPS input technology; follow the UPS and generator manufacturers' guidance.
- Include other loads on the generator, such as cooling and lighting.
- Check the generator's ability to handle step loads.

## Regulations and environment

In India, DG sets must meet emission and noise norms set by the Central Pollution Control Board; the **CPCB IV+** norms apply to new gensets up to 800 kW from July 2023. Installation needs proper ventilation, exhaust, fuel storage and acoustic enclosures, and may need local approvals.

## Key terms

- **AMF panel:** automatic mains failure panel that starts the generator.
- **ATS:** automatic transfer switch between mains and generator.
- **Step load:** a sudden increase in load on the generator.
- **CPCB IV+:** current emission norms for diesel gensets in India.

## Real-world example

A hospital's 100 kVA UPS is supported by a 100 kVA generator. During a long outage, the generator struggles when the UPS starts recharging its batteries at the same time as the cooling compressors start, and the supply becomes unstable. The redesign adds a larger generator and staggers load transfer, giving a stable supply.

## Common mistakes

- Sizing the generator equal to the UPS rating.
- Forgetting other loads such as cooling.
- Not testing the full UPS–generator sequence.

## Key takeaways

- The UPS bridges the gap; the generator supports long outages.
- Size generators larger than the UPS, often 1.5 to 2 times, following manufacturer guidance.
- Meet CPCB norms and test the complete changeover sequence.
""",
        """
Power conditioning improves the quality of power reaching equipment. It works alongside UPS systems, and in some cases is used for loads that do not need battery backup.

## Power conditioning devices

- **Servo voltage stabilisers:** correct long-term under- and over-voltage using a motor-driven transformer; common in India where supply voltage varies widely.
- **Isolation transformers:** separate the load from the supply, reduce electrical noise and can create a clean neutral-to-earth reference near the equipment. K-rated transformers handle harmonic loads.
- **Surge protection devices (SPDs):** divert surges to earth; installed in stages at the main panel, sub-distribution and equipment. IEC 61643 covers SPDs.
- **Harmonic filters:** reduce harmonic distortion caused by non-linear loads; IEEE 519 gives recommended harmonic limits.
- **Automatic voltage regulators (AVR):** built into line-interactive UPS units for small loads.

## Choosing the right solution

- Measure power quality first with an analyser to identify the actual problems.
- Use stabilisers for long-term voltage variation, SPDs for surges, isolation transformers for noise and neutral-earth issues, and filters for harmonics.
- Coordinate with the UPS design so that devices do not conflict.

## Key terms

- **Servo stabiliser:** corrects voltage using a motor-driven variable transformer.
- **Isolation transformer:** separates load and supply electrically.
- **SPD:** surge protection device.
- **THD:** total harmonic distortion, a measure of waveform distortion.

## Real-world example

A factory's control room PCs suffer frequent damage after lightning storms. The site has a UPS but no surge protection at the main panel. The SI installs coordinated SPDs at the main panel and distribution boards, checks the earthing and adds an isolation transformer for the control room. Storm-related failures stop.

## Common mistakes

- Relying on a UPS alone to handle all power problems.
- Installing SPDs without a good earth.
- Choosing solutions without measuring the problem.

## Key takeaways

- Power conditioning includes stabilisers, isolation transformers, SPDs and harmonic filters.
- Match each device to the measured problem.
- Coordinate conditioning devices with the UPS and earthing design.
""",
    ],
    "questions": [
        q("SINGLE", "Measured load is 12 kW, growth is 25% and the UPS should run at no more than 80%. What capacity is needed?", ["12 kW", "15 kW", "18.75 kW", "24 kW"], ["18.75 kW"],
          explanation="12 × 1.25 = 15 kW; 15 ÷ 0.8 = 18.75 kW."),
        q("TRUE_FALSE", "For VRLA batteries, life roughly halves for every 8 to 10 °C above 25 °C.", TF, ["True"],
          explanation="High temperatures sharply reduce battery life."),
        q("SINGLE", "What does an ATS do?", ["Starts the UPS", "Switches the load between mains and generator", "Measures harmonics", "Charges batteries"], ["Switches the load between mains and generator"],
          explanation="The automatic transfer switch moves the load to generator power and back."),
        q("SINGLE", "A common rule of thumb for sizing a generator supporting a UPS is:", ["Equal to the UPS rating", "Half the UPS rating", "About 1.5 to 2 times the UPS rating", "Ten times the UPS rating"], ["About 1.5 to 2 times the UPS rating"],
          explanation="UPS input characteristics and battery recharge need extra generator capacity."),
        q("SINGLE", "Which device is used mainly to divert lightning and switching surges?", ["Servo stabiliser", "Surge protection device", "Harmonic filter", "ATS"], ["Surge protection device"],
          explanation="SPDs divert surges to earth and need good earthing."),
        q("MULTIPLE", "Which are advantages of lithium-ion UPS batteries over VRLA?", ["Longer life", "Smaller and lighter", "Better tolerance of higher temperatures", "Always lower upfront cost"], ["Longer life", "Smaller and lighter", "Better tolerance of higher temperatures"],
          explanation="Lithium-ion usually costs more upfront but lasts longer."),
        q("FILL_BLANK", "The current emission norms for new diesel gensets up to 800 kW in India are called CPCB ______.", ["IV+", "IV plus", "4+"],
          explanation="CPCB IV+ norms apply from July 2023."),
    ],
    "sources": [CPCB, IEC, IEEE, BIS],
}

COURSES["Power Solutions Advanced: Resilient Power Design"] = {
    "lessons": [
        """
Critical facilities such as data centres, hospitals and control rooms need power systems that keep running when components fail or are maintained. Redundant architectures remove single points of failure.

## Common architectures

- **N:** capacity equal to the load, with no redundancy. A single failure causes an outage.
- **N+1:** one extra UPS module or unit beyond what the load needs. One component can fail or be serviced without losing the load.
- **2N:** two completely independent power paths (A and B), each able to carry the full load. A whole path can fail.
- **2N+1 / distributed redundant:** further variations for very high availability.

## Making redundancy effective

- **Dual-corded equipment:** servers and switches with two power supplies, each connected to a different path.
- **Static transfer switches (STS):** for single-corded loads, switching quickly between two sources.
- **Separate distribution:** A and B paths with separate panels, breakers and cables.
- **Maintenance bypass:** allows UPS maintenance without shutting down the load.
- **Concurrent maintainability:** any component can be maintained without an outage, a key feature of the Uptime Institute's Tier III.

## Key terms

- **2N:** fully duplicated power paths.
- **Dual-corded:** equipment with two power inputs.
- **STS:** static transfer switch.
- **Concurrently maintainable:** maintainable without shutting down the load.

## Real-world example

A data centre installs two UPS systems in a "2N" design, but both feed a single distribution panel. When the panel's main breaker trips, both UPS systems are cut off from the load. The redesign gives each UPS its own distribution path down to separate rack PDUs, and dual-corded servers connect to both. The next panel fault affects only one path.

## Common mistakes

- Duplicating UPS units but sharing distribution.
- Connecting both power supplies of a server to the same PDU.
- No maintenance bypass.

## Key takeaways

- N+1 tolerates one component failure; 2N tolerates a whole path failure.
- Redundancy must extend from source to equipment.
- Use dual-corded equipment, STS for single-corded loads and maintenance bypasses.
""",
        """
Power distribution carries power from UPS systems to individual equipment. Good distribution design keeps power reliable, safe, measurable and easy to manage.

## Distribution layers

- **Main and sub-distribution panels:** breakers that feed UPS inputs and outputs.
- **Power distribution units (PDUs) in racks:** strips that deliver power to equipment.
- **Busway or overhead power track:** flexible distribution above racks in larger data centres.

## Types of rack PDUs

- **Basic:** distribute power only.
- **Metered:** show total current, helping prevent overloads.
- **Monitored:** report power usage remotely.
- **Switched:** allow remote power cycling of individual outlets.
- **Three-phase PDUs:** deliver more power for high-density racks.

## Design good practice

- **A and B feeds:** two PDUs per rack, fed from different paths.
- **Load balancing:** spread loads across phases and circuits.
- **2N loading rule:** in a 2N design, each feed should normally carry no more than 50% of its capacity, so that it can take the full load if the other fails.
- **Labelling:** label every PDU, circuit and outlet with its source.
- **Breaker coordination:** make sure a fault trips the nearest breaker, not the main one.

## Key terms

- **PDU:** power distribution unit.
- **Phase balancing:** spreading load evenly across three phases.
- **Busway:** an overhead power distribution system.
- **Selective coordination:** arranging breakers so that only the nearest one trips.

## Real-world example

Each of a company's racks has A and B PDUs, but both are loaded to 70%. When the A feed's UPS is taken down for maintenance, the B PDUs try to carry 140% of their capacity, and breakers trip. Monitoring would have shown that each feed must stay below 50% in a 2N design.

## Common mistakes

- Loading A and B feeds above 50% each.
- Unbalanced phases.
- Unlabelled circuits and PDUs.

## Key takeaways

- Choose PDUs with metering or monitoring for visibility.
- In 2N designs, keep each feed at or below 50% loading.
- Balance phases, label everything and coordinate breakers.
""",
        """
Power and cooling are closely linked. Every watt delivered to IT equipment becomes heat that the cooling system must remove. Designing them together prevents overheating and wasted energy.

## The link between power and cooling

- **Heat load:** almost all power used by IT equipment turns into heat. A rack drawing 10 kW produces about 10 kW of heat.
- **UPS and distribution losses:** also produce heat that must be cooled.
- **Cooling power:** cooling systems themselves need power, often a significant share of facility energy.
- **Cooling on UPS:** during an outage, if cooling stops while IT continues on UPS, temperatures rise quickly in high-density rooms. Critical cooling components, such as fans and controls, may need UPS support.

## Design considerations

- Match cooling capacity and redundancy to the power design; a 2N power system with N cooling is only as resilient as its cooling.
- Plan for power density increases, especially from GPU servers.
- Use containment and efficient cooling to reduce cooling energy.
- Track Power Usage Effectiveness (PUE) as a measure of overall efficiency.

## Key terms

- **Heat load:** the amount of heat the cooling system must remove.
- **Thermal ride-through:** how long a room stays within safe temperatures when cooling stops.
- **PUE:** total facility power ÷ IT power.

## Real-world example

A data centre's UPS keeps servers running during an outage, but the chillers stop until the generator starts. In two minutes, inlet temperatures rise sharply in the high-density rows. The design is updated to put chilled-water pumps and computer room air handler fans on UPS, and to add thermal storage so cooling continues while the generator starts.

## Common mistakes

- Designing power redundancy without matching cooling redundancy.
- Forgetting cooling during the outage-to-generator gap.
- Adding high-density racks without checking cooling capacity.

## Key takeaways

- IT power becomes heat; power and cooling must be designed together.
- Match cooling redundancy to power redundancy.
- Plan cooling support during outages for high-density rooms.
""",
        """
Even well-designed power systems fail if they are not maintained. A structured maintenance plan keeps UPS systems, batteries, generators and distribution reliable.

## What to maintain

- **UPS systems:** periodic inspection, cleaning, firmware updates, fan and capacitor replacement as recommended by the manufacturer.
- **Batteries:** regular checks of voltage, internal resistance or impedance, temperature and connections. Guidance such as IEEE 1188 describes maintenance and testing for VRLA batteries. Replace batteries before end of life.
- **Generators:** weekly or monthly test runs, load bank tests, fuel quality checks, filter changes and coolant checks.
- **ATS and switchgear:** functional testing and tightening of connections.
- **Distribution:** thermal imaging to find loose or overheating connections.

## Planning and records

- Create a maintenance calendar with the manufacturer's recommended intervals.
- Use annual maintenance contracts with qualified service providers.
- Record every test, measurement and repair.
- Schedule maintenance in low-risk windows and use maintenance bypass procedures.
- Test the full outage sequence: mains failure, UPS on battery, generator start, transfer and return.

## Key terms

- **Load bank test:** testing a generator with an artificial load.
- **Battery impedance test:** measuring internal resistance to identify weak batteries.
- **Thermal imaging:** using an infrared camera to find hot spots.
- **Preventive maintenance:** scheduled maintenance to prevent failures.

## Real-world example

During an annual thermal imaging survey, an engineer finds a breaker connection running far hotter than others. Tightening the connection prevents a likely fire or outage. A battery impedance test the same week identifies three weak batteries in a string, which are replaced before they cause a UPS failure during an outage.

## Common mistakes

- Running generators without load during tests.
- Ignoring battery replacement schedules.
- Keeping no records of maintenance results.

## Key takeaways

- Maintain UPS, batteries, generators, ATS and distribution on a planned schedule.
- Use tests such as battery impedance, load bank and thermal imaging.
- Record results and test the full outage sequence.
""",
    ],
    "questions": [
        q("SINGLE", "Which architecture provides two independent power paths, each able to carry the full load?", ["N", "N+1", "2N", "Single UPS"], ["2N"],
          explanation="2N duplicates the whole power path."),
        q("SINGLE", "In a 2N design, what is the maximum normal loading of each feed?", ["25%", "50%", "80%", "100%"], ["50%"],
          explanation="Each feed must be able to take the full load if the other fails."),
        q("TRUE_FALSE", "A dual-corded server should connect both power supplies to the same PDU.", TF, ["False"],
          explanation="Each supply should connect to a different power path."),
        q("SINGLE", "What device switches single-corded loads quickly between two sources?", ["Static transfer switch", "Servo stabiliser", "Load bank", "Clamp meter"], ["Static transfer switch"],
          explanation="An STS gives single-corded equipment access to two sources."),
        q("MULTIPLE", "Which maintenance activities help prevent power failures?", ["Battery impedance testing", "Generator load bank tests", "Thermal imaging of connections", "Removing earthing"], ["Battery impedance testing", "Generator load bank tests", "Thermal imaging of connections"],
          explanation="These tests find weaknesses before they cause outages."),
        q("TRUE_FALSE", "Almost all power used by IT equipment turns into heat that must be removed.", TF, ["True"],
          explanation="That is why power and cooling must be designed together."),
        q("SHORT_ANSWER", "In two or three sentences, explain why a 2N UPS design can still fail if distribution is shared.",
          explanation="If both UPS systems feed one panel or one PDU, a fault in that shared component cuts power from both paths. Redundancy must continue from the source to the equipment."),
    ],
    "sources": [UPTIME, IEEE, IEC, BIS],
}
