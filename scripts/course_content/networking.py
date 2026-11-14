"""Networking: LAN, WAN and structured cabling; switching, routing and Wi-Fi; SD-WAN and architecture."""
from . import q, TF, CISCO_NETACAD

COURSES = {}

IEEE802 = ("IEEE 802 LAN/MAN Standards Committee: Ethernet (802.3), VLANs (802.1Q) and Wi-Fi (802.11)", "https://www.ieee802.org/")
RFC1918 = ("IETF RFC 1918: Address Allocation for Private Internets", "https://www.rfc-editor.org/rfc/rfc1918")
TIA = ("TIA: ANSI/TIA-568 structured cabling standards", "https://tiaonline.org/")
WIFI_ALLIANCE = ("Wi-Fi Alliance: Wi-Fi 6, 6E and 7 certification", "https://www.wi-fi.org/")
MEF = ("MEF: SD-WAN service standard (MEF 70) and definitions", "https://www.mef.net/")
NIST_ZT = ("NIST SP 800-207: Zero Trust Architecture", "https://csrc.nist.gov/pubs/sp/800/207/final")
DOT = ("Department of Telecommunications: licensing and spectrum rules in India", "https://dot.gov.in/")

COURSES["Networking Basic: LAN, WAN and Structured Cabling"] = {
    "lessons": [
        """
A network connects devices so they can share information and services. Every business, from a small office to a large campus, depends on its network. Understanding the main building blocks helps you design, sell and support network solutions.

## Main network devices

- **Switch:** connects devices within a local network (LAN), sending traffic only to the port where the destination device is.
- **Router:** connects different networks together, such as the office LAN and the internet, and decides the best path for traffic.
- **Firewall:** controls traffic between networks based on security rules.
- **Wireless access point (AP):** connects Wi-Fi devices to the wired network.
- **Wireless controller or cloud management:** manages many access points centrally.

## LAN and WAN

- **LAN (local area network):** a network within a building or campus, usually owned by the organisation.
- **WAN (wide area network):** connects networks across cities or countries, usually using links from telecom providers.
- **Internet:** the global network of networks, reached through an internet service provider (ISP).

## The layered model

Networking is often explained using the **OSI model**, with seven layers: physical, data link, network, transport, session, presentation and application. In practice, the simpler **TCP/IP model** is widely used. Knowing layers helps in troubleshooting: is the problem a cable (physical), an address (network) or an application?

## Key terms

- **Switch:** forwards traffic within a LAN using MAC addresses.
- **Router:** forwards traffic between networks using IP addresses.
- **MAC address:** a hardware address for a network interface.
- **ISP:** internet service provider.

## Real-world example

A small office connects all its PCs to a cheap unmanaged switch and a consumer router. As it grows to 60 staff, the network becomes slow and unreliable, with no way to separate guest and staff traffic. An SI installs managed switches, a business firewall and centrally managed access points, with separate networks for staff, guests and printers. Problems drop and the office can grow safely.

## Common mistakes

- Using consumer equipment in growing businesses.
- Confusing switches and routers.
- Troubleshooting applications before checking basic connectivity.

## Key takeaways

- Switches connect devices in a LAN; routers connect networks; firewalls enforce security.
- LANs are local; WANs connect sites; the internet is reached through ISPs.
- Layered models help in design and troubleshooting.
""",
        """
Every device on an IP network needs an address. IP addressing is how devices find each other, and a good addressing plan makes networks easier to manage and grow.

## IPv4 basics

- An **IPv4 address** is 32 bits, written as four numbers from 0 to 255, such as 192.168.10.25.
- A **subnet mask** or **prefix length** shows which part is the network and which part is the host. For example, /24 (255.255.255.0) gives 256 addresses, of which 254 can be used by devices.
- The **default gateway** is the router address that devices use to reach other networks.

## Private and public addresses

RFC 1918 reserves three ranges for private networks, which are not routed on the internet:

- 10.0.0.0/8
- 172.16.0.0/12
- 192.168.0.0/16

Organisations use private addresses internally and **NAT (network address translation)** on the firewall or router to reach the internet with public addresses.

## IPv6

**IPv6** addresses are 128 bits, written in hexadecimal, such as 2001:db8::1. IPv6 provides a vast number of addresses and is increasingly used by ISPs and mobile networks.

## Address planning

- Use separate subnets for different groups: staff, servers, printers, voice, guests and management.
- Leave room for growth in each subnet.
- Document the plan in an IP address management (IPAM) tool or spreadsheet.
- Use DHCP for user devices and fixed addresses for servers and network devices.

## Key terms

- **Subnet:** a logical division of an IP network.
- **Prefix length:** the number of network bits, such as /24.
- **NAT:** translation between private and public addresses.
- **IPAM:** IP address management.

## Real-world example

Two companies merge and both use 192.168.1.0/24 at their head offices. When they connect the networks, devices with the same addresses conflict. The SI renumbers one company into a 10.x.x.x plan with separate subnets per site and function, documented in an IPAM tool. Future sites slot neatly into the plan.

## Common mistakes

- Using one flat subnet for everything.
- No documentation of addresses.
- Choosing overlapping private ranges across sites.

## Key takeaways

- IPv4 uses 32-bit addresses; a /24 subnet has 254 usable host addresses.
- Use RFC 1918 private ranges internally with NAT to the internet.
- Plan, segment and document addresses for growth.
""",
        """
Structured cabling is the organised system of cables, connectors and patch panels that carries network traffic in a building. It is the foundation of the network and often lasts longer than any active equipment.

## Components

- **Horizontal cabling:** from the network rack to each work area outlet, usually copper twisted-pair cable.
- **Backbone cabling:** between racks and floors, often fibre.
- **Patch panels:** terminate cables in the rack.
- **Patch cords:** short cables from patch panels to switches and from outlets to devices.
- **Information outlets:** wall or floor sockets at desks.

## Standards and distances

Cabling standards such as ANSI/TIA-568 and ISO/IEC 11801 define performance and installation rules. For twisted-pair copper:

- The **permanent link** (fixed cable) should be no longer than **90 metres**, and the full **channel**, including patch cords, no longer than **100 metres**.
- **Cat 6** supports 1 Gbps everywhere and 10 Gbps over shorter distances (about 55 metres); **Cat 6A** supports 10 Gbps up to 100 metres.

For fibre:

- **Multimode fibre** (such as OM3 or OM4) is used for shorter distances within buildings.
- **Single-mode fibre** (such as OS2) is used for long distances and campus or city links.

## Power over Ethernet

PoE delivers power over the network cable to access points, IP phones and cameras. IEEE standards include 802.3af (up to 15.4 W at the switch port), 802.3at (up to 30 W) and 802.3bt (up to 60 W or 90 W).

## Key terms

- **Permanent link / channel:** the fixed cable / the full path including patch cords.
- **Patch panel:** a panel where cables terminate in the rack.
- **Multimode / single-mode fibre:** short-distance / long-distance fibre types.
- **PoE:** power delivered over Ethernet cable.

## Real-world example

A company installs cheap, unbranded cable without testing. Some desks get only 100 Mbps and Wi-Fi access points keep rebooting because of poor PoE delivery. Testing with a certification tester shows many failed links. The SI re-cables with certified Cat 6A, tests every link and provides test reports. Speeds and reliability improve, and the cabling will support future upgrades.

## Common mistakes

- Exceeding the 90 m / 100 m copper limits.
- Not testing and certifying installed cabling.
- Mixing cable categories and poor labelling.

## Key takeaways

- Structured cabling is a long-term foundation; follow TIA-568 or ISO/IEC 11801.
- Copper: 90 m permanent link, 100 m channel; Cat 6A for 10 Gbps at 100 m.
- Use fibre for backbones and long distances, and certify all links.
""",
        """
Branch offices, such as bank branches, retail stores and regional offices, need reliable connectivity to the head office, data centre and cloud. Branch networks must be simple, secure, centrally managed and affordable across many sites.

## Typical branch requirements

- **Number of users and devices:** PCs, printers, phones, cameras and IoT devices.
- **Applications:** core business systems, cloud applications, voice and video.
- **Connectivity:** primary and backup links, such as broadband, internet leased line, MPLS or 4G/5G.
- **Availability:** what happens if the link fails, and how quickly service must be restored.
- **Security:** firewall, secure Wi-Fi, separate guest access and protection of payment systems where relevant.
- **Management:** remote management, as branches rarely have IT staff.
- **Power:** UPS for network equipment, so the branch stays connected during short outages.

## A typical branch design

- A branch firewall or SD-WAN device with two internet or WAN links.
- A managed PoE switch for devices, phones and access points.
- One or more centrally managed access points.
- A small UPS for the network equipment.
- Central monitoring and configuration from the head office or a cloud dashboard.

## Key terms

- **Internet leased line (ILL):** a dedicated internet connection with symmetric speed and service levels.
- **MPLS:** a private WAN service from a telecom provider.
- **Zero-touch provisioning:** devices configure themselves automatically when connected.
- **Dual WAN:** two links for resilience.

## Real-world example

A pharmacy chain with 200 stores loses billing when its single broadband link fails. The SI designs a standard store kit: an SD-WAN firewall with broadband plus 4G backup, a PoE switch, one access point and a small UPS. Devices are pre-configured to install themselves at each store. Billing continues during link failures, and IT manages all stores from one dashboard.

## Common mistakes

- A single link for business-critical branches.
- Different equipment and configurations at every branch.
- No UPS for network equipment.

## Key takeaways

- Gather branch requirements: users, applications, links, availability, security and management.
- Use a standard, centrally managed branch design.
- Provide backup connectivity and UPS power for critical branches.
""",
    ],
    "questions": [
        q("SINGLE", "Which device connects different networks and chooses paths using IP addresses?", ["Switch", "Router", "Patch panel", "Access point"], ["Router"],
          explanation="Routers forward traffic between networks."),
        q("SINGLE", "How many usable host addresses are in a /24 IPv4 subnet?", ["24", "254", "256", "1024"], ["254"],
          explanation="A /24 has 256 addresses; the network and broadcast addresses are not used by hosts."),
        q("MULTIPLE", "Which ranges are private under RFC 1918?", ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "8.8.8.0/24"], ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
          explanation="These three ranges are reserved for private networks."),
        q("SINGLE", "What is the maximum length of a twisted-pair copper channel, including patch cords?", ["50 m", "90 m", "100 m", "500 m"], ["100 m"],
          explanation="The permanent link is up to 90 m; the full channel up to 100 m."),
        q("SINGLE", "Which cable category supports 10 Gbps up to 100 metres?", ["Cat 5e", "Cat 6", "Cat 6A", "Telephone cable"], ["Cat 6A"],
          explanation="Cat 6 supports 10 Gbps only over shorter distances."),
        q("TRUE_FALSE", "IEEE 802.3bt PoE can deliver up to 90 W at the switch port.", TF, ["True"],
          explanation="802.3bt supports up to 60 W or 90 W, depending on type."),
        q("MATCHING", "Match each term to its meaning.", ["NAT=Translates private and public addresses", "ILL=Dedicated internet link with symmetric speed", "Single-mode fibre=Long-distance fibre", "Default gateway=Router used to reach other networks"],
          explanation="These terms come up in every network design."),
    ],
    "sources": [IEEE802, RFC1918, TIA, CISCO_NETACAD],
}

COURSES["Networking Intermediate: Switching, Routing and Wi-Fi Design"] = {
    "lessons": [
        """
Modern LANs use managed switches and VLANs to separate traffic, improve security and control performance. Good switching design keeps networks fast, stable and easy to manage.

## VLANs

A **VLAN (virtual LAN)** splits one physical switch network into separate logical networks. IEEE 802.1Q defines how VLAN tags are added to Ethernet frames.

- **Access ports** carry one VLAN to a device, such as a PC.
- **Trunk ports** carry multiple VLANs between switches, or to access points and servers.
- Traffic between VLANs must pass through a router or Layer 3 switch, where it can be controlled.

Typical VLANs include staff, servers, voice, printers, CCTV, guests and network management.

## Resilience in switching

- **Spanning Tree Protocol (STP / RSTP):** prevents loops when switches are connected with redundant links.
- **Link aggregation (LACP, IEEE 802.1AX):** combines several links into one logical link for more bandwidth and resilience.
- **Stacking or multi-chassis link aggregation:** lets two switches act as one for redundancy.

## Other switching features

- **Quality of Service (QoS):** prioritises voice and video traffic.
- **Port security and 802.1X:** control which devices can connect.
- **PoE budget:** total power the switch can supply to PoE devices.

## Key terms

- **VLAN:** a logical network on shared switches.
- **Trunk:** a link carrying multiple VLANs.
- **STP:** a protocol that prevents switching loops.
- **Layer 3 switch:** a switch that can also route between VLANs.

## Real-world example

An office has one flat network for 300 devices, including CCTV cameras that send continuous video. Broadcast traffic and camera streams slow down PCs, and anyone can reach the camera recorder. The SI creates separate VLANs for staff, CCTV, voice and guests, routes between them on a Layer 3 core switch with access rules, and applies QoS for voice. Performance and security both improve.

## Common mistakes

- One flat network for all devices.
- Redundant links without spanning tree or link aggregation, causing loops.
- Exceeding the switch's PoE budget.

## Key takeaways

- Use VLANs to separate traffic, with routing and rules between them.
- Use STP, link aggregation and stacking for resilience.
- Apply QoS and check the PoE budget.
""",
        """
Routing moves traffic between networks: between VLANs, between sites and to the internet. Routers and Layer 3 switches use routing tables to decide where to send each packet.

## Types of routing

- **Static routing:** routes configured manually. Simple and predictable for small networks, but does not adapt to failures automatically.
- **Dynamic routing:** routers exchange information and adapt to changes.
  - **OSPF (Open Shortest Path First):** a common interior routing protocol for enterprise networks.
  - **BGP (Border Gateway Protocol):** the routing protocol of the internet, also used by enterprises with multiple ISPs or in large WANs.

## Key routing concepts

- **Default route:** where traffic goes when there is no more specific route, usually towards the internet.
- **Route preference:** when several routes exist, the router picks the most specific match first, then the most preferred source.
- **First-hop redundancy:** protocols such as VRRP give devices a virtual default gateway that survives a router failure.
- **Route summarisation:** advertising one larger route instead of many small ones, making networks simpler and more stable.

## Key terms

- **Routing table:** the router's list of known networks and paths.
- **OSPF:** an interior dynamic routing protocol.
- **BGP:** the internet's routing protocol.
- **VRRP:** Virtual Router Redundancy Protocol.

## Real-world example

A company with 30 sites uses static routes. When a link fails, engineers must change routes manually at several sites, causing hours of outage. The SI introduces OSPF across the WAN and VRRP at the head office core, so traffic reroutes automatically within seconds when a link or router fails.

## Common mistakes

- Static routes in large networks that need to adapt.
- A single default gateway with no redundancy.
- Poor address planning that prevents summarisation.

## Key takeaways

- Static routing suits small networks; OSPF and BGP suit larger ones.
- Use first-hop redundancy to protect the default gateway.
- Good address planning enables route summarisation and stability.
""",
        """
Users expect Wi-Fi to work everywhere, for laptops, phones, voice calls and video. Good Wi-Fi depends on careful design, not just on buying more access points.

## Wi-Fi standards

The Wi-Fi Alliance uses generation names for IEEE 802.11 standards:

- **Wi-Fi 5:** 802.11ac, 5 GHz.
- **Wi-Fi 6:** 802.11ax, 2.4 and 5 GHz, with better efficiency in busy environments.
- **Wi-Fi 6E:** Wi-Fi 6 extended into the 6 GHz band, where national rules permit.
- **Wi-Fi 7:** 802.11be, with wider channels and multi-link operation.

## Design principles

- **Design for capacity, not just coverage:** count users and devices per area and their applications.
- **Signal strength:** voice and video often need a signal of about -67 dBm or better in all areas.
- **Channel planning:** in 2.4 GHz, use only non-overlapping channels 1, 6 and 11; use 5 GHz (and 6 GHz where available) for most clients.
- **Access point placement:** ceilings, away from metal obstructions; consider wall materials such as concrete and glass.
- **Site survey:** predictive surveys using floor plans and software, plus on-site validation surveys.
- **Security:** WPA3 where supported, 802.1X for staff, and a separate, isolated guest network.

## Key terms

- **dBm:** a unit of signal strength; values closer to zero are stronger.
- **Channel:** a frequency range used by an access point.
- **Co-channel interference:** access points on the same channel interfering with each other.
- **WPA3:** the current Wi-Fi security standard.

## Real-world example

A college installs many access points at maximum power, all on default channels. Students complain of slow Wi-Fi despite strong signal bars. A survey finds heavy co-channel interference. The SI reduces power, assigns channels properly, disables unnecessary 2.4 GHz radios and adds access points in lecture halls based on student numbers. Speeds improve without much new hardware.

## Common mistakes

- Designing only for coverage.
- All access points at maximum power on the same channels.
- No validation survey after installation.

## Key takeaways

- Know Wi-Fi 6, 6E and 7, and design for capacity as well as coverage.
- Aim for about -67 dBm for voice and video, and plan channels carefully.
- Survey before and after installation and secure staff and guest access.
""",
        """
WAN connectivity links branches, data centres and cloud services. The right mix of links balances cost, performance and reliability.

## Common WAN and internet options in India

- **Broadband (fibre to the premises):** affordable and fast, usually best-effort with shared capacity.
- **Internet leased line (ILL):** dedicated, symmetric bandwidth with service level agreements.
- **MPLS:** private WAN from a telecom provider, with predictable performance and SLAs; higher cost.
- **4G/5G:** wireless links, useful as backup or for temporary sites.
- **Point-to-point links:** dedicated links between two sites, by fibre or radio.

Telecom and internet services in India are provided by operators licensed by the Department of Telecommunications.

## Choosing links

- Critical sites: two diverse links from different providers, using different physical paths where possible.
- Cloud-heavy organisations: direct internet access at branches rather than routing all traffic through head office.
- Voice and video: links with low latency, jitter and packet loss.
- Cost: balance premium links with affordable broadband using SD-WAN.

## Measuring link quality

- **Bandwidth:** capacity of the link.
- **Latency:** delay, measured in milliseconds.
- **Jitter:** variation in delay; important for voice and video.
- **Packet loss:** percentage of packets lost.

## Key terms

- **Diverse links:** links that use different providers or physical paths.
- **SLA:** service level agreement on availability and repair time.
- **Latency / jitter / packet loss:** measures of link quality.
- **Last mile:** the final connection from the provider to the customer site.

## Real-world example

A logistics company buys two links for each warehouse from the same provider, assuming they are redundant. A single fibre cut on the road outside takes both down, because they share the same last-mile cable. For the redesign, the SI chooses a second provider using a different path, and adds 4G as a third backup.

## Common mistakes

- Two links from the same provider on the same path.
- Ignoring latency and jitter for voice and video.
- Backhauling all cloud traffic through head office.

## Key takeaways

- Choose from broadband, ILL, MPLS, 4G/5G and point-to-point links.
- Use diverse providers and paths for critical sites.
- Measure bandwidth, latency, jitter and packet loss.
""",
    ],
    "questions": [
        q("SINGLE", "Which standard defines VLAN tagging?", ["IEEE 802.11", "IEEE 802.1Q", "IEEE 802.3af", "RFC 1918"], ["IEEE 802.1Q"],
          explanation="802.1Q adds VLAN tags to Ethernet frames."),
        q("SINGLE", "Which protocol prevents loops in a switched network with redundant links?", ["OSPF", "STP/RSTP", "BGP", "DHCP"], ["STP/RSTP"],
          explanation="Spanning tree blocks redundant paths to prevent loops."),
        q("SINGLE", "Which is the routing protocol of the internet?", ["OSPF", "RIP", "BGP", "VRRP"], ["BGP"],
          explanation="BGP exchanges routes between networks on the internet."),
        q("MULTIPLE", "Which 2.4 GHz channels do not overlap?", ["1", "6", "11", "3"], ["1", "6", "11"],
          explanation="Channels 1, 6 and 11 are the non-overlapping set."),
        q("SINGLE", "What signal strength is commonly targeted for voice and video over Wi-Fi?", ["-90 dBm", "-80 dBm", "-67 dBm or better", "0 dBm"], ["-67 dBm or better"],
          explanation="-67 dBm is a widely used design target for voice-grade Wi-Fi."),
        q("TRUE_FALSE", "Two links from the same provider on the same physical path give full redundancy.", TF, ["False"],
          explanation="A single cable cut or provider fault can take both down."),
        q("MATCHING", "Match each Wi-Fi generation to its standard.", ["Wi-Fi 5=802.11ac", "Wi-Fi 6=802.11ax", "Wi-Fi 7=802.11be", "Wi-Fi 6E=802.11ax in 6 GHz"],
          explanation="The Wi-Fi Alliance uses generation names for IEEE 802.11 standards."),
    ],
    "sources": [IEEE802, WIFI_ALLIANCE, CISCO_NETACAD, DOT],
}

COURSES["Networking Advanced: SD-WAN and Network Architecture"] = {
    "lessons": [
        """
SD-WAN (software-defined WAN) uses software and central management to combine multiple WAN and internet links into one intelligent, secure network. It has become the standard approach for organisations with many branches.

## What SD-WAN does

- **Uses multiple links together:** broadband, ILL, MPLS and 4G/5G.
- **Application-aware routing:** sends each application over the best link based on real-time measurements of latency, jitter and loss.
- **Automatic failover:** moves traffic when a link degrades or fails, often without users noticing.
- **Central orchestration:** configure policies once and apply them to all sites.
- **Zero-touch provisioning:** new branch devices configure themselves when connected.
- **Built-in security:** encrypted overlay tunnels and often integrated firewall features.

MEF, an industry body, has published a standard for SD-WAN services (MEF 70) that defines common terms and service attributes.

## Designing SD-WAN

1. Identify sites, links and applications, and their priorities.
2. Define policies: which applications are critical, which can use cheaper links.
3. Plan the topology: hub-and-spoke through data centres, full mesh, or direct cloud access.
4. Integrate security: local internet breakout with firewall or cloud security services.
5. Plan migration from the current WAN in phases, starting with a pilot.

## Key terms

- **Overlay:** the virtual network of tunnels built over physical links.
- **Underlay:** the physical links and transport networks.
- **Orchestrator:** the central management system for SD-WAN.
- **Local breakout:** sending internet and cloud traffic directly from the branch.

## Real-world example

A retail chain uses MPLS for 150 stores and routes all internet traffic through head office. Cloud applications are slow and MPLS costs are high. The SI deploys SD-WAN with broadband and 4G at each store, local breakout to approved cloud applications and MPLS kept only at large stores. Application performance improves and WAN costs fall.

## Common mistakes

- Deploying SD-WAN without defining application policies.
- Local internet breakout without proper security.
- Migrating all sites at once without a pilot.

## Key takeaways

- SD-WAN combines links with application-aware routing and central management.
- Design policies, topology, security and migration carefully.
- Start with a pilot and migrate in phases.
""",
        """
A campus network connects users and devices across buildings, such as an office park, university or hospital. Its architecture decides how well it scales, how resilient it is and how easy it is to manage.

## Campus design models

- **Three-tier:** access layer (connects users), distribution layer (aggregates access switches and applies policy) and core layer (fast backbone between distribution blocks and the data centre). Suited to large campuses.
- **Collapsed core:** combines core and distribution in one layer. Suited to small and medium campuses.
- **Spine-leaf:** used mainly in data centres, where every leaf switch connects to every spine switch, giving predictable performance.

## Design principles

- **Modularity:** build repeatable blocks, such as one block per building.
- **Redundancy:** dual uplinks from access to distribution, redundant core switches and power supplies.
- **Segmentation:** VLANs and routing between them with access control.
- **Capacity:** uplinks sized for traffic growth, such as 10 Gbps or higher between layers.
- **Management:** central management, monitoring and configuration backups.
- **Wireless integration:** design Wi-Fi and wired networks together.

## Key terms

- **Access layer:** where users and devices connect.
- **Distribution layer:** aggregates access switches and enforces policy.
- **Core layer:** the high-speed backbone.
- **Spine-leaf:** a data-centre topology with predictable paths.

## Real-world example

A hospital grows from one building to four, each added with its own small network linked by single cables. A failure in one link isolates an entire building, including operating theatres. The SI redesigns the campus with a redundant core in two buildings, dual fibre links from each building's distribution switches, and standard building blocks. A later fibre cut causes no outage.

## Common mistakes

- Growing the network building by building without an overall architecture.
- Single uplinks between layers.
- Inconsistent configurations across buildings.

## Key takeaways

- Choose three-tier, collapsed core or spine-leaf based on scale and use.
- Build modular, redundant and segmented designs.
- Manage the campus centrally with consistent configurations.
""",
        """
Network and security are inseparable. The network can enforce security policies, contain threats and give visibility into what is happening.

## Security built into the network

- **Segmentation:** separate users, servers, IoT devices and guests into zones, with rules controlling traffic between them. If one device is compromised, the attacker cannot easily move to others.
- **Network access control (NAC) and 802.1X:** authenticate devices and users before they connect, and place them in the right segment.
- **Firewalls:** at the internet edge, between internal zones and in the data centre.
- **Secure remote access:** VPN or zero trust network access for remote users.
- **Secure management:** separate management network, strong authentication and logging of administrative changes.

## Zero trust

Zero trust is a security model that assumes no user or device is trusted by default, even inside the network. Every access request is verified based on identity, device health and context. NIST Special Publication 800-207 describes zero trust architecture. Network segmentation and strong identity are key building blocks.

## Key terms

- **Segmentation:** dividing the network into zones with controlled traffic between them.
- **802.1X:** a standard for port-based network access control.
- **Lateral movement:** an attacker moving from one compromised system to others.
- **Zero trust:** never trust by default; always verify.

## Real-world example

Ransomware enters a manufacturing company through a phishing email on an office PC. Because the office network, plant control systems and servers are in separate segments with strict firewall rules, the ransomware cannot reach the plant. Production continues while the office PCs are cleaned. A competitor with a flat network suffers a week-long shutdown.

## Common mistakes

- Flat networks where every device can reach every other.
- Shared administrator passwords on network devices.
- No logging of configuration changes.

## Key takeaways

- Segmentation limits the spread of attacks.
- Use NAC and 802.1X, firewalls between zones and secure management.
- Zero trust verifies every access request; NIST SP 800-207 describes the model.
""",
        """
Networks must be monitored and operated well to stay reliable. Good monitoring finds problems before users report them and gives evidence for capacity planning.

## What to monitor

- **Device health:** CPU, memory, temperature, power supplies and fans.
- **Interfaces:** utilisation, errors and drops.
- **Links:** latency, jitter, packet loss and availability.
- **Wi-Fi:** client numbers, signal quality and interference.
- **Traffic flows:** which applications and users consume bandwidth.

## Tools and protocols

- **SNMP:** collects device status and statistics.
- **Syslog:** collects device logs centrally.
- **Flow data (NetFlow, IPFIX, sFlow):** shows who is talking to whom and how much.
- **Streaming telemetry:** modern, high-frequency data from devices.
- **Configuration management:** automatic backups of device configurations and change tracking.

## Operations practices

- Define alert thresholds and escalation paths.
- Maintain an up-to-date inventory and network diagrams.
- Patch network operating systems regularly to fix security vulnerabilities.
- Use change management for configuration changes, with rollback plans.
- Review capacity reports monthly and plan upgrades early.

## Key terms

- **SNMP:** Simple Network Management Protocol.
- **Syslog:** a standard for sending log messages.
- **NetFlow / IPFIX:** flow-based traffic reporting.
- **Configuration backup:** a saved copy of a device's settings.

## Real-world example

Users at a regional office complain of slow applications every afternoon. Flow data shows that a backup job copying files to head office starts at 2 p.m. and fills the WAN link. The operations team reschedules the backup to night hours and applies QoS. The complaints stop, and the monitoring data supports a future link upgrade.

## Common mistakes

- Monitoring only whether devices are up.
- No configuration backups.
- Ignoring network operating system security updates.

## Key takeaways

- Monitor health, interfaces, links, Wi-Fi and traffic flows.
- Use SNMP, syslog, flow data and configuration backups.
- Patch, manage changes and plan capacity from monitoring data.
""",
    ],
    "questions": [
        q("SINGLE", "What does application-aware routing in SD-WAN do?", ["Sends all traffic over MPLS", "Sends each application over the best link based on real-time measurements", "Blocks all cloud traffic", "Replaces switches"], ["Sends each application over the best link based on real-time measurements"],
          explanation="SD-WAN measures links and steers applications accordingly."),
        q("SINGLE", "In SD-WAN, what is the 'underlay'?", ["The central orchestrator", "The physical links and transport networks", "The encrypted tunnels", "The user interface"], ["The physical links and transport networks"],
          explanation="The overlay of tunnels runs over the physical underlay."),
        q("SINGLE", "Which topology is used mainly in data centres, with every leaf connected to every spine?", ["Three-tier", "Collapsed core", "Spine-leaf", "Ring"], ["Spine-leaf"],
          explanation="Spine-leaf gives predictable paths in data centres."),
        q("TRUE_FALSE", "Network segmentation helps stop ransomware from spreading from office PCs to plant systems.", TF, ["True"],
          explanation="Segmentation limits lateral movement."),
        q("SINGLE", "Which NIST publication describes zero trust architecture?", ["SP 800-53", "SP 800-207", "SP 800-145", "CSF 2.0"], ["SP 800-207"],
          explanation="NIST SP 800-207 is the zero trust architecture publication."),
        q("MULTIPLE", "Which protocols or data sources help network monitoring?", ["SNMP", "Syslog", "NetFlow/IPFIX", "HDCP"], ["SNMP", "Syslog", "NetFlow/IPFIX"],
          explanation="HDCP is video content protection, not monitoring."),
        q("SHORT_ANSWER", "In two or three sentences, explain why an SD-WAN migration should start with a pilot.",
          explanation="A pilot tests policies, links, security and applications on a few sites before wider rollout. Problems can be fixed with little impact, and the design becomes a proven template for the remaining sites."),
    ],
    "sources": [MEF, NIST_ZT, IEEE802, CISCO_NETACAD],
}
