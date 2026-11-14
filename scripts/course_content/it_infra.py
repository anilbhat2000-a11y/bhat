"""IT Infrastructure: building blocks, data centre and facilities, infrastructure architecture."""
from . import q, TF, MS_LEARN, CISCO_NETACAD, AWS_SKILL_BUILDER

COURSES = {}

UPTIME = ("Uptime Institute: Tier Classification System for data centres", "https://uptimeinstitute.com/tiers")
ASHRAE = ("ASHRAE TC 9.9: thermal guidelines for data processing environments", "https://www.ashrae.org/")
GREEN_GRID = ("The Green Grid: PUE and data centre efficiency metrics", "https://www.thegreengrid.org/")
TIA = ("TIA: ANSI/TIA-942 data centre infrastructure standard", "https://tiaonline.org/")
REDFISH = ("DMTF Redfish: standard API for server and infrastructure management", "https://www.dmtf.org/standards/redfish")

COURSES["IT Infrastructure Basic: Building Blocks"] = {
    "lessons": [
        """
IT infrastructure is everything an organisation needs to run its applications and serve its users: devices, networks, servers, storage, power and the software that manages them. It is easiest to understand in layers, starting with what users touch every day: end-user computing.

## End-user computing (EUC)

- **Desktops and laptops:** the main work devices. Business models offer longer support, manageability features and better build quality than consumer models.
- **Thin clients:** simple devices that connect to applications or desktops running on central servers.
- **Mobile devices:** smartphones and tablets used for email, approvals and field work.
- **Peripherals:** monitors, docking stations, headsets, keyboards and webcams.
- **Printers and scanners:** often shared on the network.

## Managing end-user devices

Organisations with hundreds of devices need tools and processes to keep them secure and working:

- **Operating system and software updates** pushed centrally.
- **Endpoint security** to protect against malware.
- **Device management** (often called unified endpoint management, UEM) to enforce policies, deploy software and wipe lost devices.
- **Asset management** to track who has which device and when its warranty ends.

## Key terms

- **Endpoint:** any device that connects to the network, such as a laptop or phone.
- **Thin client:** a lightweight device that runs applications from a central server.
- **UEM:** unified endpoint management, a tool to manage many device types from one console.
- **Asset register:** a record of devices, users, locations and warranty dates.

## Real-world example

An insurance company with 800 employees buys laptops in small batches from different suppliers over several years. It ends up with eight models, no central updates and no record of warranty dates. An SI proposes standardising on two models, enrolling all devices in a UEM tool and building an asset register. Support calls fall, and the company can now plan refreshes by warranty date.

## Common mistakes

- Buying consumer devices for business use.
- No central management of updates and security.
- No asset register, so warranty and refresh dates are unknown.

## Key takeaways

- End-user computing includes devices, peripherals and printers.
- Central management keeps devices secure and up to date.
- Standardise models and keep an asset register.
""",
        """
Behind every application is a data centre or server room: a protected space with servers, storage, network equipment, power and cooling. Even when organisations use the cloud, many still run some systems on their own premises.

## The main data-centre components

- **Servers:** computers that run applications and services. They come as rack, tower or blade servers.
- **Storage:** systems that store data, such as disk arrays, NAS and SAN.
- **Network equipment:** switches, routers and firewalls that connect servers to each other, to users and to the internet.
- **Racks:** standard 19-inch frames that hold equipment. Height is measured in rack units (U); 1U is 1.75 inches (44.45 mm). A common rack is 42U.
- **Power:** UPS systems, batteries, power distribution units (PDUs) and often a diesel generator.
- **Cooling:** air conditioning designed for IT equipment, such as precision air conditioning.
- **Physical security and monitoring:** access control, CCTV, fire detection and suppression, and environmental sensors.

## Virtualisation

Most organisations no longer run one application per physical server. Virtualisation lets one physical server host many virtual machines, using resources more efficiently and making recovery easier.

## Key terms

- **Rack unit (U):** a standard height of 1.75 inches (44.45 mm) for rack equipment.
- **PDU:** power distribution unit, which distributes power to equipment in a rack.
- **Virtual machine (VM):** a software-based computer running on a physical host.
- **Server room:** a smaller version of a data centre, common in branch offices and smaller companies.

## Real-world example

A manufacturing company keeps its servers in an office storeroom with a household air conditioner. During a summer power cut, the UPS keeps the servers running, but the air conditioner stops and the room overheats. Two servers shut down to protect themselves, and production planning stops for a day. The SI's proposal includes a proper rack, precision cooling on UPS-backed power, and temperature monitoring with alerts.

## Common mistakes

- Treating the server room as a storeroom.
- Protecting servers with a UPS but not the cooling.
- No environmental monitoring.

## Key takeaways

- A data centre combines servers, storage, network, racks, power, cooling and security.
- Rack space is measured in units of 1.75 inches; a common rack is 42U.
- Power and cooling are as important as the IT equipment itself.
""",
        """
Infrastructure components only deliver value when they work together. Understanding how users reach applications helps you design solutions, troubleshoot problems and explain them to customers.

## The path from user to application

1. A user's laptop connects to the **access network**, by cable to a switch or by Wi-Fi to an access point.
2. Access switches connect to **distribution and core switches** that carry traffic across the building or campus.
3. Traffic to internal applications goes to the **data centre network**, through a firewall, to the servers.
4. Servers read and write data on **storage** over a storage network or the data-centre network.
5. Traffic to the internet or cloud leaves through a **firewall and internet link**.
6. Branch offices connect over the **WAN**, such as MPLS, internet VPN or SD-WAN.

## Supporting services

- **DNS:** turns names, such as erp.company.local, into IP addresses.
- **DHCP:** gives devices their IP address automatically.
- **Directory services:** such as Active Directory or Entra ID, which manage users, passwords and permissions.
- **Time synchronisation (NTP):** keeps clocks accurate, which matters for logs and security.

## Key terms

- **LAN:** local area network within a building or campus.
- **WAN:** wide area network connecting sites.
- **DNS:** domain name system.
- **DHCP:** dynamic host configuration protocol.

## Real-world example

Users at a branch complain that the ERP is "down". The server team sees the ERP running normally. Following the path from the user, the support engineer finds that the branch's internet VPN link is up but DNS requests are failing because a firewall rule was changed. Fixing the rule restores access. Understanding the full path turned a vague complaint into a quick fix.

## Common mistakes

- Assuming a problem lies in the application without checking the path.
- Forgetting supporting services such as DNS and time synchronisation.
- Designing one layer without considering how it connects to the others.

## Key takeaways

- Users reach applications through access, core, data-centre and WAN networks.
- DNS, DHCP, directory and time services are essential supporting services.
- Follow the path end to end when designing or troubleshooting.
""",
        """
Good discovery questions help you understand a customer's infrastructure, its problems and its plans. They also show the customer that you understand their world.

## Questions about the current environment

- How many users, sites and devices do you support?
- Where do your main applications run: on-premises, in the cloud or both?
- How old are your servers, storage and network equipment, and when does support end?
- How are your devices managed and secured today?
- What does your server room or data centre look like: power, cooling and space?

## Questions about problems and risks

- What are the most common complaints from users?
- When did you last have a major outage, and what did it cost?
- How do you back up data, and when did you last test a restore?
- Which systems would hurt the business most if they stopped?

## Questions about plans

- What business changes are coming: new offices, growth, acquisitions or new applications?
- Are there compliance or audit requirements you must meet?
- What is your budget cycle, and who approves infrastructure spending?

## Key terms

- **Discovery:** structured questioning to understand needs and context.
- **Critical system:** an application whose failure seriously affects the business.
- **Restore test:** a check that backed-up data can actually be recovered.

## Real-world example

During discovery, an SI asks a school group when it last tested a backup restore. The IT head admits it has never been tested. A trial restore fails because the backup job had been silently excluding the student database for months. The customer immediately asks for a backup assessment, which leads to a new backup and storage solution.

## Common mistakes

- Asking only about products the customer wants to buy.
- Not asking about outages, backups and critical systems.
- Forgetting to ask about budget cycles and approvers.

## Key takeaways

- Ask about the current environment, problems and plans.
- Questions about outages, backups and critical systems uncover real needs.
- Understand the budget cycle and decision makers.
""",
    ],
    "questions": [
        q("SINGLE", "What is the height of one rack unit (1U)?", ["1 inch", "1.75 inches (44.45 mm)", "2 inches", "19 inches"], ["1.75 inches (44.45 mm)"],
          explanation="1U is 1.75 inches. 19 inches is the standard rack width."),
        q("SINGLE", "Which service turns names into IP addresses?", ["DHCP", "DNS", "NTP", "UPS"], ["DNS"],
          explanation="DNS resolves names to IP addresses."),
        q("TRUE_FALSE", "Protecting servers with a UPS is enough; cooling does not need backup power.", TF, ["False"],
          explanation="Without cooling, servers overheat even if they have power."),
        q("MULTIPLE", "Which are part of end-user computing?", ["Laptops", "Thin clients", "Docking stations", "Core switches"], ["Laptops", "Thin clients", "Docking stations"],
          explanation="Core switches are network infrastructure, not end-user computing."),
        q("SINGLE", "What does UEM help an organisation do?", ["Cool the data centre", "Manage and secure many device types from one console", "Design cabling", "Issue invoices"], ["Manage and secure many device types from one console"],
          explanation="Unified endpoint management enforces policies, deploys software and protects lost devices."),
        q("SINGLE", "Which question best uncovers backup risk?", ["What colour are your racks?", "When did you last test a restore?", "How many monitors do you have?", "Who is your favourite vendor?"], ["When did you last test a restore?"],
          explanation="Untested backups often fail when needed."),
        q("MATCHING", "Match each term to its meaning.", ["LAN=Network within a building or campus", "WAN=Network connecting sites", "DHCP=Gives devices IP addresses automatically", "VM=Software-based computer on a physical host"],
          explanation="These are basic infrastructure terms."),
    ],
    "sources": [MS_LEARN, CISCO_NETACAD, TIA],
}

COURSES["IT Infrastructure Intermediate: Data Centre and Facilities"] = {
    "lessons": [
        """
A well-organised data centre is easier to cool, safer to work in and quicker to troubleshoot. Rack layout and cable management are the foundation.

## Hot aisle and cold aisle

Most IT equipment takes in cool air at the front and blows hot air out of the back. Racks are therefore arranged in rows facing each other:

- **Cold aisle:** the fronts of two rows face each other, and cool air is supplied here.
- **Hot aisle:** the backs face each other, and hot air is collected here and returned to the cooling units.

**Containment,** such as doors and roofs on the aisles, stops hot and cold air from mixing, improving cooling efficiency.

## Rack layout good practice

- Place heavy equipment, such as UPS units and storage, at the bottom.
- Use **blanking panels** in empty rack spaces to stop hot air circulating back to the front.
- Leave space for growth, typically 20 to 30% of rack units.
- Label every device, cable and port.
- Keep power and data cables separated, and route them neatly.

## Space planning

Plan for clearances in front of and behind racks for service access and airflow; ANSI/TIA-942 and manufacturer guidance give recommended clearances. Also check floor loading, as a fully loaded rack can weigh several hundred kilograms or more.

## Key terms

- **Hot aisle / cold aisle:** a layout that separates hot exhaust air from cool intake air.
- **Containment:** physical barriers that keep hot and cold air apart.
- **Blanking panel:** a cover for unused rack space.
- **Floor loading:** the weight the floor can safely carry.

## Real-world example

A company's server room has racks facing the same direction, so hot air from one row blows into the front of the next. Despite powerful air conditioners, some servers run hot. An SI reorganises the racks into hot and cold aisles, adds blanking panels and partial containment. Temperatures at the server inlets drop, and the company can raise the air conditioner set point, saving energy.

## Common mistakes

- Racks facing the same direction.
- Missing blanking panels.
- Unlabelled cables and devices.

## Key takeaways

- Arrange racks in hot and cold aisles, ideally with containment.
- Use blanking panels, label everything and leave room for growth.
- Check clearances and floor loading.
""",
        """
Every watt of electricity used by IT equipment becomes heat that must be removed. As servers become more powerful, especially for AI, power and cooling design becomes critical.

## Power density

Power density is the power used per rack, measured in kilowatts (kW). Traditional enterprise racks often use a few kilowatts to around 10 kW. Racks with GPU servers for AI can need several tens of kilowatts or more. The cooling design must match the density.

## Cooling options

- **Room cooling:** precision air conditioning units around the room.
- **In-row cooling:** cooling units placed between racks, close to the heat.
- **Rear-door heat exchangers:** cooled doors on the back of racks.
- **Liquid cooling:** direct-to-chip cold plates or immersion, increasingly used for high-density AI systems.

## Temperature guidelines

ASHRAE's thermal guidelines recommend a server inlet air temperature range of 18 °C to 27 °C for most data-centre equipment. Measuring at the server inlet, not just the room thermostat, shows the real conditions.

## Measuring efficiency

**Power Usage Effectiveness (PUE),** defined by The Green Grid, is total facility power divided by IT equipment power. A PUE of 1.0 would mean every watt goes to IT equipment; real facilities are higher. Lower is better.

## Key terms

- **Power density:** kW per rack.
- **PUE:** total facility power ÷ IT equipment power.
- **Inlet temperature:** the temperature of air entering the equipment.
- **Liquid cooling:** using liquid to remove heat directly from components.

## Real-world example

A research institute plans to add four GPU servers, each drawing around 6 kW, into one rack. Its server room was designed for about 5 kW per rack. The SI explains that the existing cooling cannot handle 24 kW in one rack and proposes either spreading the servers across racks with in-row cooling or adding a rear-door heat exchanger. The customer avoids overheating and expensive emergency fixes.

## Common mistakes

- Adding high-power servers without checking power and cooling capacity.
- Measuring temperature only at the room thermostat.
- Overcooling the room, wasting energy.

## Key takeaways

- Match cooling design to power density; AI racks need special attention.
- ASHRAE recommends 18–27 °C at the server inlet.
- PUE measures facility efficiency; lower is better.
""",
        """
Data centres need constant attention, but engineers cannot be everywhere. Monitoring and remote management tools let teams see problems early and fix many of them without visiting the site.

## What to monitor

- **Environment:** temperature, humidity, water leaks and smoke.
- **Power:** UPS status, battery health, load and PDU usage per rack.
- **IT equipment:** server health, storage capacity, network links and performance.
- **Security:** door access, CCTV and alarms.

## Remote management tools

- **Out-of-band management:** controllers built into servers, such as those using IPMI or the DMTF Redfish standard, let administrators power on, reboot and troubleshoot servers even when the operating system is down.
- **Intelligent PDUs:** measure power per outlet and allow remote power cycling.
- **KVM over IP and console servers:** remote access to device consoles.
- **DCIM (data centre infrastructure management):** software that brings together power, cooling, space and asset data.
- **Network monitoring systems:** using protocols such as SNMP to collect device status and alerts.

## Alerts and response

Monitoring only helps if alerts reach the right people and someone acts. Define thresholds, escalation paths and response procedures, and test them.

## Key terms

- **Out-of-band management:** managing devices through a separate channel, independent of the main network or operating system.
- **DCIM:** data centre infrastructure management software.
- **SNMP:** a protocol used to monitor network devices.
- **Threshold:** the value that triggers an alert.

## Real-world example

At 2 a.m., a temperature sensor in a branch server room reports a rapid rise. The alert reaches the on-call engineer, who sees that one air conditioner has failed. He remotely shuts down non-critical test servers to reduce heat and calls the maintenance vendor. Critical systems stay up until the unit is repaired in the morning.

## Common mistakes

- Installing monitoring but not configuring alerts or escalation.
- Not enabling out-of-band management on servers.
- Too many alerts, causing important ones to be ignored.

## Key takeaways

- Monitor environment, power, IT equipment and security.
- Use out-of-band management, intelligent PDUs and DCIM for remote control.
- Configure sensible thresholds and tested escalation paths.
""",
        """
All infrastructure ages. Hardware wears out, software support ends and new requirements emerge. Refresh planning replaces equipment in a controlled way, before it becomes a risk.

## When to refresh

- **End of support:** once the manufacturer stops support and security updates.
- **Warranty expiry:** extending support on old equipment can cost more than replacing it.
- **Performance:** equipment can no longer meet business needs.
- **Efficiency:** newer equipment can use far less power and space for the same work.
- **Typical cycles:** many organisations refresh servers and storage every four to six years, and laptops every three to five years, but this varies.

## Building a refresh plan

1. **Inventory:** list all equipment with age, warranty and support dates.
2. **Assess:** identify what is at risk or no longer meets needs.
3. **Prioritise:** start with critical systems and unsupported equipment.
4. **Budget:** spread refreshes over years to avoid large one-time spending.
5. **Plan migrations:** schedule work to minimise disruption.
6. **Dispose securely:** wipe or destroy data on old equipment and use authorised e-waste recyclers.

## Key terms

- **Refresh cycle:** the planned interval between replacements.
- **Technical debt:** the growing cost and risk of keeping outdated systems.
- **E-waste:** discarded electronic equipment, which in India must be handled under the E-Waste (Management) Rules.
- **Data sanitisation:** securely erasing data before disposal.

## Real-world example

A hospital has storage systems that reach end of support next year and servers that are seven years old. The SI builds a three-year refresh plan: storage in year one, critical servers in year two and the remaining servers in year three. Each phase is budgeted in advance, migration windows are planned around hospital operations, and old disks are securely wiped and certified.

## Common mistakes

- Waiting for failures before replacing equipment.
- Refreshing everything at once without budget planning.
- Disposing of old equipment without wiping data.

## Key takeaways

- Refresh based on support dates, risk, performance and efficiency.
- Build a phased, budgeted plan starting with critical systems.
- Wipe data and use authorised e-waste recyclers.
""",
    ],
    "questions": [
        q("SINGLE", "In a hot aisle / cold aisle layout, where is cool air supplied?", ["To the hot aisle", "To the cold aisle, where rack fronts face each other", "To the ceiling only", "To the cable trays"], ["To the cold aisle, where rack fronts face each other"],
          explanation="Equipment takes cool air in at the front, so cool air goes to the cold aisle."),
        q("SINGLE", "What is the ASHRAE recommended inlet temperature range for most data-centre equipment?", ["10–15 °C", "18–27 °C", "28–35 °C", "0–10 °C"], ["18–27 °C"],
          explanation="ASHRAE TC 9.9 recommends 18 °C to 27 °C at the server inlet."),
        q("SINGLE", "How is PUE calculated?", ["IT power ÷ total facility power", "Total facility power ÷ IT equipment power", "Cooling power ÷ IT power", "Racks ÷ servers"], ["Total facility power ÷ IT equipment power"],
          explanation="PUE, defined by The Green Grid, is total facility power divided by IT power. Lower is better."),
        q("TRUE_FALSE", "Blanking panels help stop hot air from circulating back to the front of the rack.", TF, ["True"],
          explanation="Empty rack spaces let hot exhaust air recirculate to equipment inlets."),
        q("SINGLE", "Which tool lets administrators reboot a server when its operating system has crashed?", ["Word processor", "Out-of-band management controller", "Printer driver", "Spreadsheet"], ["Out-of-band management controller"],
          explanation="Out-of-band controllers, using IPMI or Redfish, work independently of the operating system."),
        q("MULTIPLE", "Which are good reasons to refresh equipment?", ["End of manufacturer support", "Poor performance for current needs", "Much better efficiency of new equipment", "The equipment colour is outdated"], ["End of manufacturer support", "Poor performance for current needs", "Much better efficiency of new equipment"],
          explanation="Support, performance and efficiency drive refresh decisions."),
        q("TRUE_FALSE", "Old storage disks can be sent for recycling without wiping data if the company is reputable.", TF, ["False"],
          explanation="Data must be securely erased or destroyed before disposal."),
    ],
    "sources": [ASHRAE, GREEN_GRID, TIA, REDFISH, ("Ministry of Environment, Forest and Climate Change: E-Waste (Management) Rules", "https://moef.gov.in/")],
}

COURSES["IT Infrastructure Advanced: Infrastructure Architecture"] = {
    "lessons": [
        """
High availability (HA) means designing infrastructure so that services keep running when components fail. Every component eventually fails; HA design accepts this and removes single points of failure where the business needs it.

## Understanding availability

Availability is usually expressed as a percentage of time a service is up. Each extra "nine" cuts allowed downtime sharply:

- **99.9%:** about 8.8 hours of downtime per year.
- **99.99%:** about 53 minutes per year.
- **99.999%:** about 5 minutes per year.

Higher availability costs more, so it should match the business impact of downtime.

## Redundancy patterns

- **N:** exactly the capacity needed, no spare.
- **N+1:** one extra component, so one failure can be tolerated.
- **2N:** a fully duplicated system, so an entire path can fail.
- **Clustering:** two or more servers running a service, with automatic failover.
- **Load balancing:** spreading traffic across several servers so that one failure does not stop the service.

## Designing for HA

- Identify critical services and their availability targets.
- Map every component in the path: power, network, servers, storage and applications.
- Remove single points of failure where the target requires it: dual power supplies, dual switches, redundant links and clustered servers.
- Test failover regularly; untested redundancy often fails when needed.

Data-centre facilities are often classified by the Uptime Institute's Tier system (Tier I to IV) or ANSI/TIA-942 ratings, which describe redundancy and maintainability of power and cooling.

## Key terms

- **Single point of failure (SPOF):** a component whose failure stops the service.
- **Failover:** automatic switch to a standby component.
- **N+1 / 2N:** redundancy levels.
- **Concurrently maintainable:** able to maintain any component without shutting down the service.

## Real-world example

A bank's core network has two firewalls, but both are connected to the same switch, and that switch has a single power supply. When the switch's power supply fails, the "redundant" firewalls are both unreachable. The SI's redesign adds a second switch, connects each firewall to both switches and uses dual-power-supply switches on separate PDUs.

## Common mistakes

- Duplicating one component while leaving a single point of failure elsewhere in the path.
- Designing for "five nines" when the business needs less.
- Never testing failover.

## Key takeaways

- Each extra nine of availability cuts downtime sharply and raises cost.
- Use N+1, 2N, clustering and load balancing to remove single points of failure.
- Check the whole path and test failover.
""",
        """
Capacity planning makes sure infrastructure can handle current and future demand without wasting money on unused resources.

## What to plan for

- **Compute:** CPU and memory for servers and virtual machines.
- **Storage:** capacity in terabytes and performance in input/output operations per second (IOPS) and latency.
- **Network:** bandwidth on links and switch ports.
- **Facilities:** rack space, power and cooling.
- **Licences:** software licensed by core, user or capacity.

## A practical process

1. **Measure current usage:** use monitoring data over weeks or months, including peaks.
2. **Understand growth:** ask the business about new users, sites, applications and data growth.
3. **Forecast:** project usage over the planning period, often three to five years.
4. **Set headroom:** plan to stay below thresholds, such as 70 to 80% utilisation, to allow for peaks and failures.
5. **Plan for failure:** in an N+1 cluster, the remaining hosts must carry the load when one fails.
6. **Review regularly:** compare forecasts with actual usage and adjust.

## Key terms

- **Utilisation:** the share of capacity in use.
- **Headroom:** spare capacity kept for peaks and growth.
- **IOPS:** input/output operations per second, a storage performance measure.
- **Latency:** the delay in responding to a request.

## Real-world example

A company sizes a three-host virtualisation cluster at 85% average CPU use. When one host fails, the remaining two cannot carry the load, and applications slow to a crawl. A proper plan would have sized the cluster so that two hosts could run all workloads, keeping each host near 60% in normal operation.

## Common mistakes

- Sizing for average use and ignoring peaks.
- Forgetting the load after a component failure.
- Not including data growth in storage plans.

## Key takeaways

- Plan compute, storage, network, facilities and licences together.
- Use real usage data, business growth and sensible headroom.
- Size for failure scenarios, not just normal operation.
""",
        """
Infrastructure must be operated well throughout its life. Strong operations processes keep services stable, secure and efficient, and make problems easier to solve.

## Core operations processes

Many organisations follow IT service management practices such as ITIL 4:

- **Incident management:** restoring service quickly when something breaks.
- **Problem management:** finding and removing the root cause of repeated incidents.
- **Change management:** assessing, approving and scheduling changes to reduce risk.
- **Configuration management:** keeping accurate records of systems and how they connect.
- **Capacity and availability management:** making sure services meet demand and targets.

## Lifecycle tasks

- **Patching:** applying security and bug fixes on a regular schedule.
- **Firmware updates:** keeping hardware firmware current and supported.
- **Backup and restore testing:** proving data can be recovered.
- **Health checks:** periodic reviews of logs, performance and capacity.
- **Documentation:** updating diagrams and records after every change.

## Key terms

- **Incident:** an unplanned interruption or reduction in service quality.
- **Problem:** the underlying cause of one or more incidents.
- **Change advisory board (CAB):** a group that reviews significant changes.
- **CMDB:** configuration management database.

## Real-world example

A customer suffers network outages every few weeks, each fixed by rebooting a switch. Incident management restores service each time, but nobody investigates. When the SI takes over managed services, problem management finds a firmware bug, and the vendor's fix is applied through a planned change. The outages stop.

## Common mistakes

- Fixing incidents without finding root causes.
- Making changes without approval, testing or rollback plans.
- Letting documentation fall out of date.

## Key takeaways

- Incident, problem, change and configuration management are core operations processes.
- Patch, update firmware, test restores and run health checks regularly.
- Keep documentation current after every change.
""",
        """
Architecture documentation records how infrastructure is designed and why. It allows teams to build, operate, troubleshoot and change systems safely, and it is essential when staff change or when auditors ask questions.

## Key documents

- **High-level design (HLD):** the overall architecture, major components, how they connect and the reasons for key decisions.
- **Low-level design (LLD):** detailed configurations, IP addresses, VLANs, port maps, firmware versions and settings.
- **Network and rack diagrams:** physical and logical views.
- **Inventory:** every device with model, serial number, location and support dates.
- **Runbooks:** step-by-step procedures for common tasks and incidents.
- **Disaster recovery plan:** how to recover services after a major failure.

## Good documentation practice

- Use consistent templates and naming.
- Record decisions and the reasons behind them, not just the result.
- Keep documents in a shared, version-controlled location.
- Update documents as part of every change.
- Review them at least yearly.

## Key terms

- **HLD / LLD:** high-level and low-level design.
- **Runbook:** a documented procedure for an operational task.
- **Architecture decision record:** a short note explaining a design choice and its reasons.

## Real-world example

A company's only network engineer leaves suddenly. There are no diagrams or configuration backups. When a core switch fails, it takes the replacement team two days to work out the VLANs and routing. After the recovery, the SI produces an HLD, LLD, diagrams and runbooks, and configures automatic configuration backups. The next failure is fixed in an hour.

## Common mistakes

- Relying on one person's memory.
- Creating documents at handover and never updating them.
- Recording what was built but not why.

## Key takeaways

- Maintain HLD, LLD, diagrams, inventory, runbooks and DR plans.
- Record decisions and reasons, and update documents with every change.
- Store documentation centrally with version control.
""",
    ],
    "questions": [
        q("SINGLE", "About how much downtime per year does 99.99% availability allow?", ["8.8 hours", "53 minutes", "5 minutes", "3.6 days"], ["53 minutes"],
          explanation="99.99% allows roughly 52.6 minutes of downtime per year."),
        q("SINGLE", "What does N+1 redundancy mean?", ["No spare capacity", "One extra component so one failure can be tolerated", "Two complete systems", "One fewer component"], ["One extra component so one failure can be tolerated"],
          explanation="N+1 adds one spare component beyond what is needed."),
        q("TRUE_FALSE", "In a three-host N+1 cluster, the remaining two hosts must be able to run all workloads if one fails.", TF, ["True"],
          explanation="Capacity planning must include failure scenarios."),
        q("SINGLE", "Which process finds and removes the root cause of repeated incidents?", ["Incident management", "Problem management", "Change management", "Procurement"], ["Problem management"],
          explanation="Incident management restores service; problem management removes causes."),
        q("MULTIPLE", "Which belong in a low-level design?", ["IP addresses and VLANs", "Port maps", "Firmware versions", "The company's sales targets"], ["IP addresses and VLANs", "Port maps", "Firmware versions"],
          explanation="The LLD holds detailed configuration information."),
        q("SINGLE", "What is a single point of failure?", ["A component whose failure stops the service", "A spare part", "A backup tape", "A monitoring alert"], ["A component whose failure stops the service"],
          explanation="HA design removes single points of failure where the business needs it."),
        q("SHORT_ANSWER", "In two or three sentences, explain why failover should be tested regularly.",
          explanation="Redundant components can be misconfigured or fail silently, so untested failover often does not work when needed. Regular tests prove that services actually switch over and reveal problems before a real outage."),
    ],
    "sources": [UPTIME, TIA, ("PeopleCert: ITIL 4 service management framework", "https://www.peoplecert.org/"), MS_LEARN, AWS_SKILL_BUILDER],
}
