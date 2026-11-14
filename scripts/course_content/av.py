"""Audio-visual: displays, audio and conferencing; integrated rooms; large venues and AV over IP."""
from . import q, TF, MS_LEARN

COURSES = {}

AVIXA = ("AVIXA: audiovisual industry standards (DISCAS display sizing, ANSI/AVIXA 10:2013 performance verification)", "https://www.avixa.org/")
TEAMS_ROOMS = ("Microsoft Learn: Microsoft Teams Rooms planning and certified devices", "https://learn.microsoft.com/en-us/microsoftteams/rooms/")
ZOOM_ROOMS = ("Zoom: Zoom Rooms hardware and setup", "https://www.zoom.com/")
HDBASET = ("HDBaseT Alliance: HDBaseT technology", "https://hdbaset.org/")
AIMS = ("AIMS: Alliance for IP Media Solutions (SMPTE ST 2110 and IPMX)", "https://www.aimsalliance.org/")
AUDINATE = ("Audinate: Dante audio networking", "https://www.getdante.com/")

COURSES["AV Solutions Basic: Displays, Audio and Conferencing"] = {
    "lessons": [
        """
Displays are the most visible part of any AV solution. Choosing the right type and size makes content easy to read; choosing wrongly frustrates every meeting.

## Display types

- **Flat-panel displays (LCD/LED-backlit):** the most common choice for meeting rooms; bright, sharp and simple. Commercial models are designed for long daily use.
- **Interactive flat panels:** touch-enabled displays for classrooms and collaboration, often with built-in whiteboard software.
- **Projectors:** produce very large images at lower cost; brightness is measured in lumens. Laser projectors last longer than lamp models.
- **Direct-view LED walls:** built from LED tiles, seamless and very bright, used in lobbies, auditoriums and control rooms.

## Choosing the right size

The farthest viewer must be able to read the content. AVIXA's DISCAS standard (Display Image Size for 2D Content in Audiovisual Systems) gives a method based on viewing distance and the type of content. A long-used rule of thumb is that for detailed content, such as spreadsheets, the farthest viewer should sit no more than about **six times the image height** away, and for basic presentations about **eight times**.

## Brightness and environment

- Flat panels are rated in nits (candelas per square metre); projectors in lumens.
- Rooms with windows or bright lights need brighter displays or light control, such as blinds.
- Commercial displays rated for many hours per day are better suited to business use than consumer TVs.

## Key terms

- **Nits:** a unit of display brightness.
- **Lumens:** a unit of projector light output.
- **DISCAS:** the AVIXA standard for calculating display size.
- **Commercial display:** a display designed for extended business use, with suitable warranty.

## Real-world example

A company installs a 55-inch TV in a 14-seat boardroom. Directors at the far end cannot read the financial spreadsheets. An SI measures the room and calculates, using the viewing distance to the farthest seat, that the content needs a much larger image. It proposes an 86-inch commercial display, and later a second display for the far end. Meetings become far more productive.

## Common mistakes

- Choosing displays by price rather than viewing distance.
- Using consumer TVs for all-day business use.
- Ignoring windows and lighting.

## Key takeaways

- Choose display type based on room size, use and environment.
- Size displays from the farthest viewer's distance, using DISCAS or the six-to-eight-times rule of thumb.
- Use commercial displays and plan for ambient light.
""",
        """
In meetings, poor audio is worse than poor video. If people cannot hear clearly, the meeting fails. Good audio depends on the right microphones, speakers, processing and room acoustics.

## Microphones

- **Table microphones:** placed on the table near participants; good pickup but can clutter the table.
- **Ceiling microphones:** discreet, often using beamforming to focus on talkers.
- **Wireless handheld and lapel microphones:** for presenters and town halls.
- **Built-in microphones** in video bars: suitable for small rooms.

## Speakers and processing

- **Speakers** must cover the room evenly so everyone hears remote participants clearly.
- **Digital signal processors (DSPs)** mix microphones, control levels and remove problems.
- **Acoustic echo cancellation (AEC)** stops remote participants from hearing their own voices echo back.
- **Noise reduction** reduces background sounds such as air conditioning.

## Room acoustics

Hard surfaces such as glass, concrete and bare walls reflect sound, causing echo and reverberation that make speech unclear. **Reverberation time (RT60)** is how long sound takes to decay by 60 decibels. Meeting rooms work best with short reverberation times. Acoustic panels, carpets and curtains help.

## Key terms

- **Beamforming:** using an array of microphones to focus on a talker's direction.
- **DSP:** digital signal processor.
- **AEC:** acoustic echo cancellation.
- **RT60:** reverberation time, the time for sound to decay by 60 dB.

## Real-world example

A new glass-walled meeting room has an expensive camera and display, but remote participants complain of echo and muffled voices. An SI measures a long reverberation time, adds acoustic panels and a ceiling microphone array with AEC, and tunes the DSP. Remote participants now hear everyone clearly.

## Common mistakes

- Spending on cameras and displays but not on audio.
- Ignoring room acoustics.
- Poorly placed microphones far from talkers.

## Key takeaways

- Audio quality decides whether a meeting works.
- Use suitable microphones, speakers, DSP and echo cancellation.
- Treat room acoustics, especially in rooms with hard surfaces.
""",
        """
Video conferencing connects people across offices and cities. A good conferencing room starts a meeting with one touch, shows everyone clearly and sounds natural.

## Types of rooms

- **Huddle rooms:** two to six people, often with an all-in-one video bar.
- **Medium meeting rooms:** six to twelve people, with a camera, microphones, speakers and one or two displays.
- **Boardrooms:** large tables, multiple cameras, ceiling microphones and premium audio.
- **Training rooms and town halls:** presenter-focused, with audience microphones and large displays.

## Platform choices

Most organisations standardise on a platform such as Microsoft Teams, Zoom, Google Meet or Webex.

- **Dedicated room systems,** such as Microsoft Teams Rooms or Zoom Rooms, provide one-touch join from a touch panel. Manufacturers certify devices for these platforms.
- **BYOD / BYOM (bring your own device or meeting):** users connect their laptop to the room's camera, microphones and display, often via USB. Flexible for organisations using several platforms.

## Design basics

- **Camera placement:** at or near eye level, usually below or above the display, covering all seats.
- **Display placement:** comfortable viewing height and distance.
- **Network:** wired connections and sufficient bandwidth, with quality of service where possible.
- **Content sharing:** wireless or wired sharing from laptops.

## Key terms

- **Video bar:** an all-in-one device with camera, microphones and speakers.
- **Certified device:** hardware tested and approved for a conferencing platform.
- **BYOD / BYOM:** using the user's own laptop or meeting platform in the room.
- **Touch panel:** the room controller used to start and manage meetings.

## Real-world example

A company standardised on Microsoft Teams but has meeting rooms with mixed, uncertified equipment. Meetings start late while staff struggle with cables and settings. An SI installs certified Teams Rooms systems with touch panels. Meetings now start with one tap, and support calls drop sharply.

## Common mistakes

- Mixing uncertified devices that do not work well together.
- Placing cameras too high or off to one side.
- Relying on Wi-Fi for room systems.

## Key takeaways

- Match the room design to room size and use.
- Choose dedicated certified systems or BYOD based on the platforms used.
- Place cameras and displays correctly and use a wired network.
""",
        """
A site survey is the foundation of every AV project. It reveals the room's real conditions and prevents surprises during installation.

## What to check

- **Room dimensions:** length, width and ceiling height; seating layout and the farthest viewing distance.
- **Walls and ceilings:** construction type, ability to support displays, and ceiling space for microphones and speakers.
- **Acoustics:** hard surfaces, windows, background noise from air conditioning or traffic.
- **Lighting:** windows, blinds and light levels on the display wall.
- **Power:** socket locations and capacity.
- **Network:** data points, switch ports, bandwidth and Wi-Fi coverage.
- **Cable paths:** routes between table, wall and equipment location.
- **Furniture:** table size and where table boxes or cable cut-outs are possible.
- **Usage:** how the room is used, by whom, and which platforms.

## Recording the survey

- Take photos of every wall, the ceiling and the floor boxes.
- Draw a simple room sketch with dimensions.
- Note any civil, electrical or furniture work needed and who will do it.
- Confirm findings with the customer before finalising the design.

## Key terms

- **Site survey:** an on-site inspection before design and installation.
- **Floor box / table box:** connection points in the floor or table for power and signals.
- **Civil work:** construction work such as chasing walls or false ceiling changes.

## Real-world example

An AV design specifies a large display on a wall that the survey shows is a thin partition. Without the survey, the installation team would have arrived with a standard wall mount. Instead, the design includes a floor-supported stand, and the project proceeds without delay or damage.

## Common mistakes

- Designing from floor plans alone.
- Not checking power and network points.
- Forgetting to note civil or furniture work and who is responsible.

## Key takeaways

- Survey every room before design.
- Check dimensions, structure, acoustics, lighting, power, network and cable paths.
- Record photos and sketches, and confirm responsibilities in writing.
""",
    ],
    "questions": [
        q("SINGLE", "Which AVIXA standard helps calculate display size?", ["RT60", "DISCAS", "HDCP", "PoE"], ["DISCAS"],
          explanation="DISCAS is AVIXA's Display Image Size for 2D Content in Audiovisual Systems standard."),
        q("SINGLE", "Projector brightness is measured in:", ["Nits", "Lumens", "Decibels", "Watts"], ["Lumens"],
          explanation="Projectors are rated in lumens; flat panels in nits."),
        q("TRUE_FALSE", "Acoustic echo cancellation stops remote participants hearing their own voices echo back.", TF, ["True"],
          explanation="AEC removes the remote audio picked up by the room microphones."),
        q("SINGLE", "A glass-walled room has echo. What helps most?", ["A brighter display", "Acoustic treatment and proper microphones with AEC", "A bigger table", "More chairs"], ["Acoustic treatment and proper microphones with AEC"],
          explanation="Hard surfaces cause reverberation; treatment and good audio processing fix it."),
        q("MULTIPLE", "What should a site survey check?", ["Wall structure", "Power and network points", "Lighting and windows", "The customer's share price"], ["Wall structure", "Power and network points", "Lighting and windows"],
          explanation="Physical conditions decide the design."),
        q("TRUE_FALSE", "Room conferencing systems should rely on Wi-Fi rather than wired network connections.", TF, ["False"],
          explanation="Wired connections are more reliable for room systems."),
        q("MATCHING", "Match each term to its meaning.", ["Video bar=All-in-one camera, microphones and speakers", "DSP=Processes and mixes audio", "Beamforming=Microphone array focusing on talkers", "BYOD=Using the user's own laptop in the room"],
          explanation="These are basic AV terms."),
    ],
    "sources": [AVIXA, TEAMS_ROOMS, ZOOM_ROOMS],
}

COURSES["AV Solutions Intermediate: Integrated Rooms"] = {
    "lessons": [
        """
An integrated room brings displays, cameras, audio, control and conferencing together into one system that is simple to use. Good room design starts with how people will use the room.

## Start with use cases

- Who uses the room and for what: board meetings, training, client presentations or hybrid collaboration?
- How many people in the room and remotely?
- What content is shared: slides, spreadsheets, video or whiteboards?
- Which conferencing platforms are used?

## Design elements

- **Sightlines:** every participant should see the display and be seen by the camera.
- **Display size and position:** based on the farthest viewer and content type.
- **Camera coverage:** a field of view that covers all seats, with framing that follows talkers where useful.
- **Microphone coverage:** every seat within effective pickup range.
- **Speaker coverage:** even sound across the room.
- **Lighting:** faces evenly lit for the camera, without glare on displays.
- **Equipment location:** a rack or cabinet with ventilation and access for service.

## Equity in hybrid meetings

Modern design aims for "meeting equity": remote participants should see and hear as well as those in the room. Front-of-room cameras at eye level, multiple displays and good audio all help.

## Key terms

- **Sightline:** the line of view between a participant and the display or camera.
- **Field of view:** the area a camera can capture.
- **Meeting equity:** equal experience for remote and in-room participants.
- **Speaker tracking:** camera framing that follows the person speaking.

## Real-world example

A training room designed only for in-room sessions is now used for hybrid classes. Remote learners cannot see the whiteboard or hear questions from the audience. The SI adds a second camera for the whiteboard, ceiling microphones covering the audience and a confidence display for the trainer showing remote participants. Feedback from remote learners improves sharply.

## Common mistakes

- Designing equipment lists before understanding use cases.
- Ignoring lighting for the camera.
- Forgetting remote participants in hybrid rooms.

## Key takeaways

- Start with use cases and users.
- Design sightlines, displays, cameras, audio, lighting and equipment locations together.
- Aim for meeting equity in hybrid rooms.
""",
        """
Signal distribution moves video, audio and control signals between sources, such as laptops and room PCs, and destinations, such as displays and speakers. Reliable distribution is what makes the room "just work".

## Common technologies

- **HDMI:** the standard connection for video and audio over short distances. Long passive HDMI cables are unreliable.
- **USB:** connects cameras and microphones to laptops or room PCs, important for BYOD rooms; USB has distance limits without extenders.
- **HDBaseT:** sends uncompressed video, audio, control, Ethernet and power over a single category cable, up to 100 metres.
- **Matrix switchers:** route any input to any output in larger rooms.
- **Presentation switchers and scalers:** select sources and adjust resolution to suit the display.
- **Wireless presentation:** share content from laptops without cables.

## Important concepts

- **HDCP:** high-bandwidth digital content protection; protected content will not display if any device in the chain does not support it.
- **EDID:** information a display sends to a source about the resolutions it supports. EDID management prevents blank screens and wrong resolutions.
- **Resolution and bandwidth:** higher resolutions such as 4K need more bandwidth; every device in the chain must support it.

## Key terms

- **Source / destination:** where a signal comes from and where it goes.
- **Extender:** a transmitter and receiver pair that carries signals over longer distances.
- **HDCP:** content protection on digital video links.
- **EDID:** display capability information shared with sources.

## Real-world example

In a boardroom, laptops connected at the table sometimes show nothing on the display. Investigation finds that the extender does not handle EDID correctly with certain laptops. The SI adds EDID management on the switcher and replaces the extenders with HDBaseT models certified for the required resolution. The problem disappears.

## Common mistakes

- Long passive HDMI cables.
- Ignoring EDID and HDCP compatibility.
- Mixing devices that do not support the same resolution.

## Key takeaways

- Use HDMI for short runs, HDBaseT or AV over IP for longer runs.
- Manage EDID and check HDCP compatibility.
- Every device in the chain must support the required resolution.
""",
        """
A control system lets users operate the whole room from one simple interface. Without it, users face multiple remote controls and settings, and meetings start late.

## What control systems do

- Power displays and projectors on and off.
- Select sources, such as a laptop or the room PC.
- Adjust volume and mute microphones.
- Start and join video calls.
- Control lights, blinds and screens.
- Turn the room off at the end of the day.

## Components

- **Touch panel:** the user interface on the table or wall.
- **Control processor:** the "brain" that sends commands to devices.
- **Control methods:** IP (network), RS-232 (serial), IR (infrared) and relays, depending on the device.
- **Programming:** software that defines what each button does.

## Designing the user interface

- Keep it simple: the most common tasks on the first screen.
- Use clear words and icons, such as "Share laptop" and "Start meeting".
- Provide automatic actions, such as switching on when a laptop is connected.
- Standardise the interface across all rooms, so users know what to expect.

## Key terms

- **Control processor:** a device that runs the room's control program.
- **RS-232:** a serial control method used by many AV devices.
- **IR:** infrared control, like a TV remote.
- **Scheduling panel:** a display outside the room showing bookings.

## Real-world example

A company has 30 meeting rooms with different equipment and remote controls. Users regularly call the IT helpdesk to switch on displays. The SI installs touch panels with a standard interface in every room, programmed so that rooms switch on when someone enters and off after meetings. Helpdesk calls about meeting rooms fall dramatically.

## Common mistakes

- Overcomplicated interfaces with too many options.
- Different interfaces in every room.
- No automatic power-off, wasting energy.

## Key takeaways

- Control systems make rooms simple and reliable to use.
- Use IP, RS-232, IR or relays depending on devices.
- Keep the interface simple and standard across rooms.
""",
        """
Commissioning is the process of testing and verifying that an AV system works as designed before it is handed over. It catches problems before users find them.

## Commissioning steps

1. **Check the installation:** equipment mounted securely, cables labelled and managed, ventilation adequate.
2. **Test every signal path:** each source to each display, at the right resolution.
3. **Test audio:** microphone coverage, speaker coverage, levels, echo cancellation and noise.
4. **Test conferencing:** calls on each supported platform, including content sharing.
5. **Test control:** every button and automation on the touch panel.
6. **Verify performance:** against the design and agreed requirements.
7. **Document:** as-built drawings, settings, passwords and test results.
8. **Train users and hand over.**

## Standards

ANSI/AVIXA 10:2013, Audiovisual Systems Performance Verification, provides a framework of tests for verifying AV systems against their requirements. Using a standard checklist makes commissioning consistent and defensible.

## Key terms

- **Commissioning:** testing and verifying a system before handover.
- **As-built documentation:** records of the system as actually installed.
- **Acceptance:** the customer's formal confirmation that the system meets requirements.
- **Punch list:** a list of small issues to fix before final acceptance.

## Real-world example

During commissioning of a boardroom, the team tests a call from every seat. Two seats at the end of the table are not picked up clearly by the microphones. The team adjusts the microphone array coverage and DSP settings before handover. Without the test, the chairperson would have discovered the problem in the first board meeting.

## Common mistakes

- Handing over without testing every signal path and seat.
- No documentation of settings and passwords.
- Skipping user training.

## Key takeaways

- Commission systematically: installation, signals, audio, conferencing and control.
- Use a standard checklist, such as one based on ANSI/AVIXA 10:2013.
- Document, train and obtain formal acceptance.
""",
    ],
    "questions": [
        q("SINGLE", "What is HDBaseT used for?", ["Wireless audio", "Sending video, audio, control, Ethernet and power over one category cable up to 100 m", "Cooling displays", "Booking rooms"], ["Sending video, audio, control, Ethernet and power over one category cable up to 100 m"],
          explanation="HDBaseT extends signals over category cable up to 100 metres."),
        q("SINGLE", "A laptop shows no image because the display and source disagree on resolution. Which concept is most likely involved?", ["RT60", "EDID", "PUE", "DSO"], ["EDID"],
          explanation="EDID tells the source what the display supports; poor EDID handling causes blank screens."),
        q("TRUE_FALSE", "Protected content may not display if any device in the chain does not support HDCP.", TF, ["True"],
          explanation="HDCP must be supported end to end."),
        q("MULTIPLE", "What can a room control system do?", ["Select sources", "Adjust volume and mute microphones", "Start calls", "Write proposals"], ["Select sources", "Adjust volume and mute microphones", "Start calls"],
          explanation="Control systems operate the room's devices from one interface."),
        q("SINGLE", "Which standard provides a framework for verifying AV system performance?", ["ANSI/AVIXA 10:2013", "ISO 9001", "IEEE 802.11", "TIA-942"], ["ANSI/AVIXA 10:2013"],
          explanation="ANSI/AVIXA 10:2013 covers audiovisual systems performance verification."),
        q("TRUE_FALSE", "Meeting equity means remote participants should see and hear as well as people in the room.", TF, ["True"],
          explanation="Hybrid room design aims for equal experience."),
        q("MATCHING", "Match each control method to its description.", ["IP=Commands over the network", "RS-232=Serial cable control", "IR=Infrared like a TV remote", "Relay=Simple contact closure for screens or blinds"],
          explanation="Different devices accept different control methods."),
    ],
    "sources": [AVIXA, HDBASET, TEAMS_ROOMS],
}

COURSES["AV Solutions Advanced: Large Venues and AV over IP"] = {
    "lessons": [
        """
Auditoriums, convention halls and large training centres bring special AV challenges: long distances, large audiences and difficult acoustics. Speech must be intelligible to every seat.

## Acoustics in large spaces

- Large rooms often have long reverberation times, which blur speech.
- **Speech intelligibility** can be measured using the Speech Transmission Index (STI), defined in IEC 60268-16. Higher values mean clearer speech.
- Acoustic treatment, such as absorptive panels and diffusers, is often needed alongside the sound system.

## Sound system design

- **Line arrays and column speakers** project sound evenly over long distances while reducing reflections from walls and ceilings.
- **Delay speakers** cover rear seats, with signal delay so sound arrives in sync with the main speakers.
- **Zoning** lets different areas receive different audio levels or content.
- **Acoustic modelling software** predicts coverage and intelligibility before installation.

## Other large-venue needs

- Large projection or LED walls sized for the farthest seats.
- Multiple wireless microphones with careful frequency planning.
- Recording and streaming for remote audiences.
- Assistive listening systems for people with hearing impairments.

## Key terms

- **STI:** Speech Transmission Index, a measure of speech intelligibility.
- **Line array:** a speaker system that projects sound over long distances.
- **Delay speaker:** a speaker with timed delay to cover distant seats.
- **Assistive listening:** systems such as induction loops that help people with hearing aids.

## Real-world example

A university auditorium has powerful speakers, but students at the back cannot understand lectures. Acoustic measurements show long reverberation and poor coverage. The SI installs column speakers aimed at the audience, delay speakers for the rear rows and acoustic panels on the back wall. Measured intelligibility improves, and complaints stop.

## Common mistakes

- Adding louder speakers instead of fixing coverage and acoustics.
- Not modelling the room before design.
- Forgetting assistive listening.

## Key takeaways

- Large venues need both acoustic treatment and well-designed sound systems.
- Use line arrays, column and delay speakers to achieve even coverage.
- Measure and model intelligibility, for example with STI.
""",
        """
Video walls display large amounts of information to many viewers. Command and control centres, such as network operations centres, traffic control rooms and security monitoring rooms, rely on them around the clock.

## Video wall technologies

- **LCD video walls:** multiple narrow-bezel displays tiled together; cost-effective with high resolution, but with visible seams.
- **Direct-view LED:** seamless, bright and flexible in size. **Pixel pitch** (the distance between pixels, in millimetres) decides how close viewers can sit; smaller pitch gives a sharper image at short distances.
- **Rear-projection cubes:** used in some older control rooms; largely replaced by LCD and LED.

## Control room design

- **24x7 rated displays** designed for continuous operation.
- **Video wall processors** that show many sources in flexible layouts.
- **Operator consoles** with ergonomic layout, so operators can see both their screens and the wall.
- **Redundancy:** redundant power supplies, processors and signal paths for critical operations.
- **Ergonomics:** viewing angles, distances and lighting designed for long shifts.

## Key terms

- **Pixel pitch:** distance between LED pixel centres, in millimetres.
- **Bezel:** the frame around a display; narrow bezels reduce seams.
- **Video wall processor:** a device that arranges multiple sources on the wall.
- **NOC / SOC:** network or security operations centre.

## Real-world example

A city's traffic control centre needs to show 60 camera feeds, maps and alerts. The SI designs a direct-view LED wall with a fine pixel pitch suited to the operators' seating distance, a redundant video wall processor and 24x7 operator workstations. Operators can rearrange layouts during incidents, and the system stays up during component failures.

## Common mistakes

- Using standard displays for 24x7 use.
- Choosing pixel pitch without considering viewing distance.
- No redundancy in critical control rooms.

## Key takeaways

- Choose LCD or LED walls based on seams, brightness, budget and viewing distance.
- Use 24x7 displays, processors and redundancy for control rooms.
- Design consoles and ergonomics for long shifts.
""",
        """
AV over IP sends audio and video over standard Ethernet networks instead of dedicated AV cables and switchers. It scales easily, uses familiar network infrastructure and supports flexible routing.

## Why AV over IP

- **Scalability:** add endpoints by adding network ports.
- **Flexibility:** route any source to any destination across a building or campus.
- **Distance:** limited only by the network, not cable length.
- **Convergence:** AV and IT share infrastructure and management.

## Common technologies and standards

- **Dante:** widely used for networked audio, by Audinate.
- **SMPTE ST 2110:** standards for professional media over IP, common in broadcast.
- **IPMX:** an open set of standards, based on ST 2110 and promoted by AIMS, for professional AV over IP.
- **SDVoE and NDI:** other approaches for video over IP, with different bandwidth and latency trade-offs.

## Network requirements

- **Bandwidth:** uncompressed 4K video can need around 10 Gbps; compressed formats need far less.
- **Multicast:** one source sent to many receivers efficiently, managed with IGMP snooping on switches.
- **Quality of service (QoS):** prioritising time-sensitive traffic.
- **Latency and synchronisation:** Precision Time Protocol (PTP) keeps devices in time in some systems.
- **Separation:** dedicated VLANs or networks for AV traffic.

## Key terms

- **Multicast:** sending one stream to many receivers.
- **IGMP snooping:** a switch feature that sends multicast only where it is needed.
- **Latency:** delay between source and display.
- **PTP:** Precision Time Protocol, for clock synchronisation.

## Real-world example

A corporate campus wants to send presentations from any meeting room to any display, including the canteen and lobby. Instead of a large matrix switcher with long cable runs, the SI deploys AV over IP encoders and decoders on a dedicated network with multicast and IGMP snooping configured. New displays are added simply by connecting a decoder to a network port.

## Common mistakes

- Running AV over IP on a network not designed for multicast.
- Underestimating bandwidth for high-resolution video.
- Not involving the IT network team early.

## Key takeaways

- AV over IP brings scalability and flexibility using Ethernet networks.
- Know the main technologies: Dante, ST 2110, IPMX, SDVoE and NDI.
- Design the network for bandwidth, multicast, QoS and timing.
""",
        """
Managed AV services keep meeting rooms and AV systems working day after day. As organisations depend on video meetings, AV downtime directly affects business.

## What managed AV includes

- **Remote monitoring:** checking device health, room usage and call quality from a central platform.
- **Proactive maintenance:** firmware updates, health checks and fixing issues before users notice.
- **Helpdesk and remote support:** a single number for users with AV problems.
- **On-site support:** engineers for hardware faults, with defined response times.
- **Usage reporting:** which rooms are used, how often and for what, to guide future investment.
- **Lifecycle management:** tracking warranties and planning refreshes.

## Designing the service

- Define coverage: which rooms, devices and hours.
- Set SLAs: response and resolution times by priority, such as boardrooms first.
- Choose monitoring tools that support the installed devices.
- Agree reporting and review meetings.
- Price per room or per device, by service level.

## Key terms

- **Proactive support:** fixing issues before users report them.
- **Room utilisation:** how often rooms are used.
- **Priority level:** classification of incidents by business impact.

## Real-world example

A company's executive boardroom fails just before a quarterly results call because a firmware update on the conferencing system was applied automatically and reset settings. Under a new managed AV service, updates are tested and scheduled, rooms are monitored every morning and boardroom issues get a 30-minute response. Critical meetings run without disruption.

## Common mistakes

- Relying only on users to report problems.
- Uncontrolled firmware updates.
- No usage data to guide investment.

## Key takeaways

- Managed AV combines monitoring, maintenance, support and reporting.
- Define coverage, SLAs and priorities clearly.
- Use utilisation data to plan future rooms and refreshes.
""",
    ],
    "questions": [
        q("SINGLE", "Which measure is used for speech intelligibility, defined in IEC 60268-16?", ["PUE", "STI", "IOPS", "DSO"], ["STI"],
          explanation="The Speech Transmission Index measures how intelligible speech is."),
        q("SINGLE", "For a direct-view LED wall, what does a smaller pixel pitch allow?", ["Cheaper installation", "Sharper images at shorter viewing distances", "Lower brightness", "No need for power"], ["Sharper images at shorter viewing distances"],
          explanation="Pixel pitch decides the closest comfortable viewing distance."),
        q("TRUE_FALSE", "AV over IP networks should be designed for multicast, often using IGMP snooping.", TF, ["True"],
          explanation="Multicast sends one stream to many receivers efficiently."),
        q("MULTIPLE", "Which are AV-over-IP technologies or standards?", ["Dante", "SMPTE ST 2110", "IPMX", "RS-232"], ["Dante", "SMPTE ST 2110", "IPMX"],
          explanation="RS-232 is a serial control method, not AV over IP."),
        q("SINGLE", "What do delay speakers do in a large venue?", ["Make sound louder at the front", "Cover rear seats with sound timed to arrive with the main speakers", "Record lectures", "Cool the amplifiers"], ["Cover rear seats with sound timed to arrive with the main speakers"],
          explanation="The delay keeps sound in sync for listeners far from the main speakers."),
        q("TRUE_FALSE", "Standard consumer displays are suitable for 24x7 control rooms.", TF, ["False"],
          explanation="Control rooms need displays rated for continuous operation."),
        q("SHORT_ANSWER", "In two or three sentences, explain one benefit of managed AV services for a company.",
          explanation="Example: proactive monitoring and maintenance find and fix room problems before meetings, reducing disruption. Usage reports also show which rooms are used, guiding future investment."),
    ],
    "sources": [AVIXA, AIMS, AUDINATE, ("IEC: IEC 60268-16 speech transmission index", "https://webstore.iec.ch/")],
}
