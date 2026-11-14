"""Server and storage: servers, RAID and storage types; virtualisation and backup; architecture and DR."""
from . import q, TF, MS_LEARN

COURSES = {}

SNIA = ("SNIA (Storage Networking Industry Association): storage dictionary and education", "https://www.snia.org/")
NIST_CP = ("NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems", "https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final")
ISO22301 = ("ISO 22301: business continuity management systems", "https://www.iso.org/standard/75106.html")
REDFISH = ("DMTF Redfish: standard API for server management", "https://www.dmtf.org/standards/redfish")
CISA_RANSOM = ("CISA: StopRansomware guide (backup and recovery practices)", "https://www.cisa.gov/stopransomware")
CERT_IN = ("CERT-In: advisories and incident reporting", "https://www.cert-in.org.in/")

COURSES["Server and Storage Basic: Servers, RAID and Storage Types"] = {
    "lessons": [
        """
A server is a computer designed to provide services, such as applications, databases, files or email, to many users. Servers are built for reliability, manageability and continuous operation, unlike desktop PCs.

## Server form factors

- **Tower servers:** look like large desktop PCs. Suitable for small offices without racks.
- **Rack servers:** mounted in standard 19-inch racks, measured in rack units (1U = 1.75 inches). 1U and 2U servers are the most common in data centres.
- **Blade servers:** thin servers that slide into a shared chassis providing power, cooling and networking. Dense and easier to cable.
- **Multi-node and high-density servers:** several server nodes in one chassis, used for virtualisation, HPC and hyperconverged systems.

## Key server components

- **Processors (CPUs):** one or two sockets, each with many cores.
- **Memory (RAM):** server memory uses error-correcting code (ECC) to detect and fix memory errors.
- **Storage drives:** hard disk drives (HDDs) for capacity, solid-state drives (SSDs) for speed; NVMe SSDs are the fastest.
- **RAID controller:** protects data across multiple drives.
- **Network interfaces:** often multiple ports at 10, 25 Gbps or faster.
- **Redundant power supplies and fans:** keep the server running if one fails.
- **Out-of-band management:** a built-in management controller that allows remote power control, monitoring and console access, often supporting standards such as Redfish.

## Key terms

- **Form factor:** the physical shape and size of a server.
- **ECC memory:** memory that detects and corrects errors.
- **NVMe:** a fast interface for SSDs.
- **Hot-swap:** replacing a component, such as a drive or power supply, without shutting down.

## Real-world example

A growing accounting firm runs its file shares and accounting software on a desktop PC in a cupboard. When the PC's single drive fails, the firm loses two days of work. An SI replaces it with a small tower server with redundant power supplies, ECC memory, mirrored drives and remote management, plus a backup solution. Later failures of a drive or power supply cause no downtime.

## Common mistakes

- Using desktop PCs as servers.
- Single power supplies and drives for important systems.
- Not enabling remote management.

## Key takeaways

- Choose tower, rack, blade or multi-node servers based on space and scale.
- Servers use ECC memory, redundant components and remote management for reliability.
- Match drives to need: HDD for capacity, SSD and NVMe for speed.
""",
        """
RAID (redundant array of independent disks) combines several drives so that data survives a drive failure, improves performance, or both. It is a basic building block of server and storage reliability.

## Common RAID levels

- **RAID 0 (striping):** data spread across drives for speed. **No protection;** if one drive fails, all data is lost.
- **RAID 1 (mirroring):** data copied to two drives. Survives one drive failure; usable capacity is half.
- **RAID 5 (single parity):** data and parity spread across at least three drives. Survives one drive failure. Usable capacity is (number of drives − 1) × drive size.
- **RAID 6 (double parity):** at least four drives. Survives two drive failures. Usable capacity is (number of drives − 2) × drive size.
- **RAID 10 (mirror + stripe):** at least four drives. Fast and resilient; usable capacity is half.

## Choosing a RAID level

- **Large HDDs:** rebuilding a failed large drive can take many hours or days, during which another failure in RAID 5 would lose data. RAID 6 is often preferred for large HDD arrays.
- **Databases and write-heavy workloads:** RAID 10 offers good write performance.
- **Hot spares:** spare drives that automatically replace a failed drive and start the rebuild.

## RAID is not backup

RAID protects against drive failure. It does **not** protect against accidental deletion, ransomware, corruption or the loss of the whole server. Backups are still essential.

## Key terms

- **Striping:** spreading data across drives.
- **Mirroring:** keeping identical copies on two drives.
- **Parity:** calculated data used to rebuild lost information.
- **Rebuild:** recreating data on a replacement drive.

## Real-world example

A file server uses RAID 5 with six 12 TB hard drives. One drive fails, and during the long rebuild, a second drive fails. All data on the array is lost, and the last backup is a week old. The redesign uses RAID 6 with a hot spare and daily backups, so two drive failures can be tolerated and recovery points are recent.

## Common mistakes

- Using RAID 0 for important data.
- RAID 5 on large HDDs without considering rebuild risk.
- Treating RAID as a substitute for backup.

## Key takeaways

- RAID 1, 5, 6 and 10 protect against drive failures; RAID 0 does not.
- Consider rebuild times and choose RAID 6 or RAID 10 where appropriate.
- RAID is never a replacement for backup.
""",
        """
Storage can be attached to servers in different ways. Choosing between DAS, NAS, SAN and object storage depends on how data is shared, the performance needed and the scale.

## The main storage types

- **DAS (direct-attached storage):** drives inside the server or in an enclosure connected directly to it. Simple and fast, but not easily shared between servers.
- **NAS (network-attached storage):** a storage device that shares files over the network using file protocols such as **SMB** (common with Windows) and **NFS** (common with Linux). Good for file shares and home directories.
- **SAN (storage area network):** provides **block storage** to servers over a dedicated network, using **Fibre Channel**, **iSCSI** over Ethernet, or newer **NVMe over Fabrics**. The server sees the storage as its own disk. Used for databases and virtualisation clusters.
- **Object storage:** stores data as objects with metadata, accessed through APIs such as the S3-compatible API. Scales to very large capacities; used for backups, archives, media and data lakes.

## File, block and object

- **File storage:** organised in folders and files; shared through NAS.
- **Block storage:** raw volumes presented to servers; delivered through SAN or DAS.
- **Object storage:** flat namespace of objects with metadata; accessed through APIs.

## Key terms

- **SMB / NFS:** file-sharing protocols.
- **iSCSI:** block storage over IP networks.
- **Fibre Channel:** a dedicated high-speed storage network technology.
- **LUN:** a logical unit number, a block volume presented to a server.

## Real-world example

An architecture firm stores large drawing files on each designer's PC and emails them back and forth. Versions get lost. The SI installs a NAS with SMB shares, snapshots and backup. For the firm's virtualised servers, it later adds iSCSI block storage. Each type of data now sits on the right kind of storage.

## Common mistakes

- Using DAS when several servers need shared storage.
- Running databases on slow file shares.
- Ignoring object storage for large backup and archive needs.

## Key takeaways

- DAS is direct, NAS shares files, SAN provides block storage, object storage scales with APIs.
- Match storage type to how data is used and shared.
- Know the protocols: SMB, NFS, iSCSI, Fibre Channel, NVMe-oF and S3.
""",
        """
Server and storage refresh projects are common opportunities. Gathering the right requirements ensures the new system fits current needs and future growth.

## Requirements to gather

- **Workloads:** which applications and databases will run, and how critical they are.
- **Performance:** CPU, memory and storage performance, measured from current systems where possible: IOPS, throughput and latency.
- **Capacity:** current data size, growth rate and retention needs.
- **Availability:** acceptable downtime and the need for clustering or redundancy.
- **Backup and recovery:** RPO and RTO targets.
- **Virtualisation:** current platform, licensing and plans.
- **Facilities:** rack space, power, cooling and network ports.
- **Support:** warranty length, response times and on-site support.
- **Licensing:** operating system, database and virtualisation licences, which may be per core.
- **Budget and timeline.**

## Measuring current systems

Use monitoring tools or assessment software to collect performance data over at least a few weeks, including month-end or peak periods. Real data prevents both under- and over-sizing.

## Key terms

- **IOPS:** input/output operations per second.
- **Throughput:** data transferred per second, such as MB/s.
- **Latency:** time to complete an input/output operation, usually in milliseconds.
- **Per-core licensing:** software priced by the number of processor cores.

## Real-world example

A customer asks for new servers with "the most cores available". Assessment data shows modest CPU use, but the database licence is priced per core. A server with fewer, faster cores meets the performance need and saves a large amount in licence costs. The SI's recommendation saves more on software than the cost of the hardware.

## Common mistakes

- Sizing without measuring current performance.
- Ignoring per-core software licensing.
- Forgetting facility and support requirements.

## Key takeaways

- Gather workload, performance, capacity, availability, backup, facilities, support and licensing requirements.
- Measure current systems over a representative period.
- Consider software licensing when choosing processors.
""",
    ],
    "questions": [
        q("SINGLE", "Which RAID level provides no protection against drive failure?", ["RAID 0", "RAID 1", "RAID 5", "RAID 6"], ["RAID 0"],
          explanation="RAID 0 stripes data without redundancy."),
        q("SINGLE", "Six 12 TB drives in RAID 6 give how much usable capacity?", ["72 TB", "60 TB", "48 TB", "36 TB"], ["48 TB"],
          explanation="RAID 6 usable capacity is (6 − 2) × 12 TB = 48 TB."),
        q("TRUE_FALSE", "RAID protects against accidental deletion and ransomware.", TF, ["False"],
          explanation="RAID protects only against drive failure; backups are still needed."),
        q("SINGLE", "Which storage type shares files over the network using SMB or NFS?", ["DAS", "NAS", "SAN", "Tape"], ["NAS"],
          explanation="NAS provides file storage over the network."),
        q("MULTIPLE", "Which are block storage protocols?", ["iSCSI", "Fibre Channel", "NVMe over Fabrics", "SMB"], ["iSCSI", "Fibre Channel", "NVMe over Fabrics"],
          explanation="SMB is a file protocol."),
        q("SINGLE", "What does ECC memory do?", ["Increases screen brightness", "Detects and corrects memory errors", "Cools the CPU", "Encrypts the disk"], ["Detects and corrects memory errors"],
          explanation="ECC improves server reliability."),
        q("MATCHING", "Match each RAID level to its description.", ["RAID 1=Mirroring", "RAID 5=Single parity, survives one failure", "RAID 6=Double parity, survives two failures", "RAID 10=Mirroring plus striping"],
          explanation="Each level balances protection, capacity and performance differently."),
    ],
    "sources": [SNIA, REDFISH, MS_LEARN],
}

COURSES["Server and Storage Intermediate: Virtualisation and Backup"] = {
    "lessons": [
        """
Virtualisation lets one physical server run many virtual machines (VMs), each with its own operating system and applications. It is the foundation of most modern data centres and private clouds.

## How virtualisation works

- A **hypervisor** runs on the physical server (the host) and shares its CPU, memory, storage and network among VMs.
- **Type 1 (bare-metal) hypervisors** run directly on the hardware, such as VMware ESXi, Microsoft Hyper-V, KVM-based platforms and Nutanix AHV. These are used in data centres.
- **Type 2 hypervisors** run on top of a desktop operating system and are used mainly for testing.

## Benefits

- **Consolidation:** fewer physical servers, saving space, power and cost.
- **Flexibility:** VMs can be created, copied and moved quickly.
- **High availability:** if a host fails, VMs restart on another host in the cluster.
- **Live migration:** move running VMs between hosts for maintenance without downtime.
- **Snapshots:** capture a VM's state before changes.

## Platform choices

Organisations choose platforms based on features, skills, licensing and cost. Licensing changes in the market, such as VMware's move to subscription bundles after Broadcom completed its acquisition in November 2023, have led many customers to review their options. Compare total cost and migration effort carefully.

## Key terms

- **Hypervisor:** software that runs virtual machines.
- **Host:** a physical server running a hypervisor.
- **Cluster:** a group of hosts managed together for availability and resource sharing.
- **Live migration:** moving a running VM between hosts.

## Real-world example

A hospital runs 25 applications on 25 ageing physical servers. Each failure means downtime while hardware is repaired. The SI consolidates them onto a three-host virtualisation cluster with shared storage and high availability. When a host later fails, its VMs restart automatically on the other hosts within minutes.

## Common mistakes

- Keeping snapshots for weeks, which slows VMs and fills storage.
- Building a cluster without spare capacity for a host failure.
- Ignoring licensing costs when choosing a platform.

## Key takeaways

- Type 1 hypervisors run many VMs on one host, with clusters for availability.
- Virtualisation brings consolidation, flexibility, HA and live migration.
- Compare platforms on features, skills, licensing and total cost.
""",
        """
Host sizing decides how many physical servers a virtualisation cluster needs and how powerful they should be. Good sizing gives enough performance with room for failures and growth.

## What to size

- **CPU:** total physical cores needed. Virtual CPUs (vCPUs) can be overcommitted, meaning more vCPUs than physical cores, because most VMs do not use their CPUs fully. A common starting ratio for general workloads is up to about 4 vCPUs per physical core, lower for demanding workloads.
- **Memory:** usually the first limit. Plan for the total memory VMs actually need, with little or no overcommitment for production.
- **Storage:** capacity and performance (IOPS, latency) for all VMs.
- **Network:** bandwidth for VM traffic, storage traffic and live migration.

## Sizing steps

1. Collect performance data from current servers or VMs, including peaks.
2. Add growth for the planning period, typically three to five years.
3. Add headroom, so hosts normally run below about 70 to 80% utilisation.
4. Apply **N+1:** add one host's worth of capacity so the cluster can lose a host and still run all VMs.
5. Check licensing, as many platforms and operating systems are licensed per core or per host.

## Key terms

- **vCPU:** a virtual CPU assigned to a VM.
- **Overcommitment:** allocating more virtual resources than physical resources.
- **N+1:** one extra host for failover.
- **Headroom:** spare capacity for peaks and growth.

## Real-world example

A company needs 512 GB of RAM for its VMs, with 25% growth over three years, giving 640 GB. The SI proposes three hosts with 384 GB each, a total of 1,152 GB. If one host fails, the remaining two provide 768 GB, enough for all VMs with headroom. A design with two hosts of 384 GB would not survive a host failure.

## Common mistakes

- Forgetting N+1 capacity.
- Overcommitting memory heavily in production.
- Ignoring per-core licensing in CPU choices.

## Key takeaways

- Size CPU, memory, storage and network from real data with growth and headroom.
- Memory is often the first limit; avoid heavy memory overcommitment.
- Always include N+1 capacity and consider licensing.
""",
        """
Backups are the last line of defence against data loss from hardware failure, human error, ransomware, corruption and disasters. A good backup design protects data reliably and allows fast, tested recovery.

## Backup types

- **Full backup:** a complete copy of all selected data.
- **Incremental backup:** only data changed since the last backup of any type; fast to run, but restores need several backups.
- **Differential backup:** data changed since the last full backup.
- **Synthetic full:** a full backup assembled from previous backups, reducing load on production systems.

## Design principles

- **3-2-1 rule:** at least three copies of data, on two different types of media, with one copy off-site. Many organisations extend this with an immutable or offline copy and verified restores.
- **Immutability:** backup copies that cannot be changed or deleted for a set period, protecting against ransomware.
- **Application-consistent backups:** coordinate with databases and applications so backups can be restored cleanly.
- **Retention:** how long backups are kept, based on business, legal and regulatory needs.
- **Encryption:** protect backup data at rest and in transit.
- **Separation:** backup systems with separate credentials and, ideally, separate network access from production.

## Key terms

- **Retention policy:** rules for how long backups are kept.
- **Immutable backup:** a backup that cannot be altered or deleted for a set period.
- **Backup window:** the time available to run backups without affecting users.
- **Application-consistent:** captured in a state the application can recover from.

## Real-world example

Ransomware encrypts a company's file servers and tries to delete backups using a stolen administrator account. The company's backups are stored on an immutable repository with separate credentials, plus a weekly off-site copy. The attackers cannot delete them, and the company restores its file servers within a day without paying a ransom.

## Common mistakes

- Backups on the same system or credentials as production.
- No immutable or offline copy.
- Backing up databases without application consistency.

## Key takeaways

- Use full, incremental, differential and synthetic full backups appropriately.
- Follow the 3-2-1 rule with immutable or offline copies.
- Use application-consistent backups, encryption, retention policies and separation.
""",
        """
RPO and RTO are the two numbers that drive backup and disaster recovery design. They translate business needs into technical requirements.

## Definitions

- **RPO (recovery point objective):** the maximum amount of data, measured in time, that the business can afford to lose. An RPO of 24 hours means losing up to a day of data is acceptable; an RPO of 15 minutes needs much more frequent protection.
- **RTO (recovery time objective):** the maximum time allowed to restore a service after a disruption.

## How they shape design

- **RPO of 24 hours:** daily backups may be enough.
- **RPO of minutes:** frequent snapshots, continuous data protection or replication.
- **RPO near zero:** synchronous replication.
- **RTO of days:** restore from backup to new hardware.
- **RTO of hours:** ready-to-use recovery infrastructure and fast restore technology.
- **RTO of minutes:** standby systems with automated failover.

Shorter RPOs and RTOs cost more, so set them per application based on business impact. A business impact analysis (BIA) helps decide them.

## Testing

Regular restore tests confirm that backups work and that the RTO can actually be met. Record how long restores take and fix any gaps.

## Key terms

- **RPO:** maximum acceptable data loss, in time.
- **RTO:** maximum acceptable time to restore service.
- **Business impact analysis (BIA):** assessment of the impact of disruptions on business functions.
- **Continuous data protection (CDP):** capturing every change for very low RPO.

## Real-world example

A company's ERP has daily backups at midnight. A storage failure at 5 p.m. loses 17 hours of transactions, including the day's sales orders. Management says the acceptable loss is no more than one hour. The redesign adds hourly snapshots and replication to a second storage system, meeting a one-hour RPO for the ERP while less critical systems keep daily backups.

## Common mistakes

- Setting the same RPO and RTO for every system.
- Never measuring actual restore times.
- Choosing technology before agreeing targets with the business.

## Key takeaways

- RPO is about data loss; RTO is about downtime.
- Set targets per application through a business impact analysis.
- Design technology to meet the targets and test restores regularly.
""",
    ],
    "questions": [
        q("SINGLE", "Which type of hypervisor runs directly on server hardware?", ["Type 1 (bare-metal)", "Type 2", "A web browser", "A RAID controller"], ["Type 1 (bare-metal)"],
          explanation="Type 1 hypervisors are used in data centres."),
        q("SINGLE", "A cluster needs 640 GB of RAM for its VMs. Which design survives one host failure?", ["Two hosts with 384 GB each", "Three hosts with 384 GB each", "One host with 768 GB", "Two hosts with 256 GB each"], ["Three hosts with 384 GB each"],
          explanation="With one host down, two hosts give 768 GB, which is more than 640 GB."),
        q("SINGLE", "What does RPO measure?", ["Maximum downtime", "Maximum acceptable data loss, in time", "Backup storage cost", "Number of VMs"], ["Maximum acceptable data loss, in time"],
          explanation="RTO measures downtime; RPO measures data loss."),
        q("TRUE_FALSE", "Immutable backups help protect against ransomware deleting backup copies.", TF, ["True"],
          explanation="Immutable copies cannot be changed or deleted during their retention period."),
        q("SINGLE", "Which backup type copies only data changed since the last backup of any type?", ["Full", "Incremental", "Differential", "Synthetic full"], ["Incremental"],
          explanation="Differential copies changes since the last full backup."),
        q("MULTIPLE", "Which are good backup design practices?", ["3-2-1 rule", "Separate backup credentials", "Application-consistent backups", "Storing all backups on the production server"], ["3-2-1 rule", "Separate backup credentials", "Application-consistent backups"],
          explanation="Backups on the production server are lost with it."),
        q("MATCHING", "Match each target to a suitable approach.", ["RPO of 24 hours=Daily backup", "RPO near zero=Synchronous replication", "RTO of minutes=Standby systems with automated failover", "RTO of days=Restore to new hardware"],
          explanation="Tighter targets need more advanced and costly designs."),
    ],
    "sources": [CISA_RANSOM, SNIA, NIST_CP, MS_LEARN],
}

COURSES["Server and Storage Advanced: Architecture and Disaster Recovery"] = {
    "lessons": [
        """
Enterprise storage architecture balances performance, capacity, resilience and cost across many workloads. Modern storage systems offer features that make them more efficient and easier to protect.

## Storage system types

- **All-flash arrays:** use only SSDs, often NVMe, for high performance and low latency. Common for databases and virtualisation.
- **Hybrid arrays:** combine SSDs and HDDs, using flash for hot data and disks for capacity.
- **Scale-out storage:** add nodes to grow capacity and performance together, common for file and object storage.
- **Software-defined storage:** storage services running on standard servers.

## Efficiency and data services

- **Thin provisioning:** allocate capacity as it is used, not in advance.
- **Deduplication and compression:** reduce the space needed, especially for virtual machines and backups.
- **Snapshots:** point-in-time copies for quick recovery.
- **Replication:** copies data to another system or site.
- **Quality of service (QoS):** limits or guarantees performance for specific workloads.
- **Encryption:** protects data at rest.

## Designing for performance

- Understand workload patterns: random or sequential, read or write, block size.
- Measure **IOPS, throughput and latency** requirements.
- Use storage tiers: fast flash for active data, capacity storage for less-used data, object storage or tape for archive.

## Key terms

- **Thin provisioning:** allocating storage on demand.
- **Deduplication:** storing identical data blocks only once.
- **Data reduction ratio:** how much space efficiency features save, such as 3:1.
- **Tiering:** placing data on different storage types by importance and use.

## Real-world example

A bank's core database runs on an ageing hybrid array, and month-end processing takes 14 hours. Analysis shows high random-read latency. The SI moves the database to an NVMe all-flash array, keeps file shares and archives on capacity storage, and enables QoS to protect the database. Month-end processing drops to under five hours.

## Common mistakes

- Planning on optimistic data reduction ratios.
- Mixing critical and bulk workloads without QoS.
- Ignoring latency in favour of capacity.

## Key takeaways

- Choose all-flash, hybrid, scale-out or software-defined storage based on workload needs.
- Use thin provisioning, data reduction, snapshots, replication, QoS and encryption.
- Design tiers and measure IOPS, throughput and latency.
""",
        """
Replication copies data to another storage system or site, so that services can continue if the primary site fails. Disaster recovery (DR) uses replication and backups to restore services after major disruptions.

## Types of replication

- **Synchronous replication:** each write is confirmed only after it is stored at both sites. This gives an RPO of zero, but adds latency, so it is limited to sites close together, typically within tens of kilometres, depending on the network and the vendor's supported latency.
- **Asynchronous replication:** writes are confirmed at the primary site and copied to the secondary site shortly afterwards. RPO is seconds to minutes, and it works over long distances.
- **Application-level replication:** databases and applications replicate their own data, such as database log shipping or availability groups.

## DR site options

- **Hot site:** fully equipped and running, ready to take over quickly.
- **Warm site:** equipment in place but needing some setup before use.
- **Cold site:** space and power only; equipment must be installed.
- **Cloud DR / DRaaS:** replicating systems to a cloud provider and starting them there when needed.

## Designing DR

1. Identify critical applications and their RPO and RTO.
2. Choose replication methods and DR site types to meet them.
3. Plan the network, DNS and user access for failover.
4. Document runbooks for failover and failback.
5. Test regularly.

## Key terms

- **Synchronous / asynchronous replication:** confirmed at both sites / copied after confirmation.
- **Failover / failback:** switching to the DR site / returning to the primary site.
- **DRaaS:** disaster recovery as a service.
- **Runbook:** step-by-step procedure.

## Real-world example

A financial services firm in Mumbai uses synchronous replication to a second data centre in the same metro area for its trading systems, giving zero data loss. It also uses asynchronous replication to a DR site in another region, hundreds of kilometres away, to protect against a regional disaster. Each method is chosen to match distance and RPO needs.

## Common mistakes

- Trying synchronous replication over long distances.
- Forgetting network and DNS changes needed for failover.
- No failback plan.

## Key takeaways

- Synchronous replication gives zero RPO over short distances; asynchronous works over long distances with small data loss.
- Choose hot, warm, cold or cloud DR sites based on RTO and cost.
- Plan network, runbooks, failover and failback.
""",
        """
A disaster recovery plan that has never been tested is only a hope. DR testing proves that systems, people and procedures work, and reveals problems while there is still time to fix them.

## Types of DR tests

- **Tabletop exercise:** the team walks through a disaster scenario in a meeting, checking roles, decisions and communication. Low cost and no system impact.
- **Walkthrough or checklist test:** reviewing runbooks step by step to confirm they are complete and current.
- **Partial failover test:** recovering selected systems at the DR site, often in an isolated network.
- **Full failover test:** switching production to the DR site and running from it, then failing back. Highest confidence, highest effort.

## Planning a test

1. Define scope, objectives and success criteria, such as meeting RTO and RPO.
2. Get business approval and choose a low-risk time.
3. Prepare runbooks, contacts and a rollback plan.
4. Run the test and record times and issues.
5. Review results, update plans and fix gaps.

## Frameworks and standards

- **NIST SP 800-34** provides guidance on contingency planning, including testing, training and exercises.
- **ISO 22301** specifies requirements for business continuity management systems, including exercising and testing.
- Many regulators, especially in banking, expect regular DR drills with documented results.

## Key terms

- **Tabletop exercise:** a discussion-based scenario walkthrough.
- **Failover test:** actually switching systems to the DR site.
- **Success criteria:** measurable targets that define a successful test.
- **Lessons learned:** improvements identified after a test.

## Real-world example

During its first full DR test, a company finds that its applications start at the DR site but users cannot reach them, because DNS records still point to the primary site and a firewall rule is missing. The test takes six hours instead of the planned two. The team updates the runbook and automates DNS changes. The next test meets the two-hour RTO.

## Common mistakes

- Never testing, or testing only backups, not full recovery.
- Not involving business users in tests.
- Not updating plans after tests.

## Key takeaways

- Use tabletop, walkthrough, partial and full failover tests.
- Plan tests with success criteria, record results and fix gaps.
- Follow guidance such as NIST SP 800-34 and ISO 22301, and regulator expectations.
""",
        """
Hyperconverged infrastructure (HCI) combines compute, storage and virtualisation in standard server nodes managed as one system. Software-defined storage (SDS) is the technology that pools the drives in those servers into shared storage.

## How HCI works

- Each node contains CPUs, memory and drives.
- Software pools the drives across nodes into a shared, resilient storage layer, typically by keeping multiple copies or erasure-coded data across nodes.
- A hypervisor runs VMs on the same nodes.
- Capacity and performance grow by adding nodes.
- Management is unified in one console.

Examples include Nutanix, VMware vSAN-based systems and Microsoft's Azure Local (formerly Azure Stack HCI).

## Benefits

- **Simplicity:** no separate SAN to design and manage.
- **Scale-out growth:** add nodes as needs grow.
- **Smaller footprint:** fewer components and less rack space.
- **Good fit for remote and branch sites:** small clusters with central management.

## Considerations

- **Scaling together:** compute and storage grow together; some platforms offer storage-only or compute-only nodes.
- **Resilience settings:** decide how many node or drive failures the cluster must tolerate.
- **Network:** fast, redundant networking between nodes is essential, as storage traffic flows over it.
- **Licensing:** compare HCI software licensing and hypervisor costs.

## Software-defined storage beyond HCI

SDS can also run as standalone storage clusters on standard servers, such as Ceph for block, file and object storage.

## Key terms

- **HCI:** hyperconverged infrastructure.
- **SDS:** software-defined storage.
- **Erasure coding:** data protection that uses less capacity than full copies.
- **Node:** a server in an HCI cluster.

## Real-world example

A retail chain has small server rooms in 30 regional offices, each with ageing servers and separate storage. The SI deploys small three-node HCI clusters at each site, managed from head office, with replication to the central data centre. Remote site management becomes simpler, and failed nodes are replaced without downtime.

## Common mistakes

- Under-sizing the network between HCI nodes.
- Ignoring how resilience settings reduce usable capacity.
- Choosing HCI when storage needs vastly exceed compute needs, without considering storage-only options.

## Key takeaways

- HCI combines compute, storage and virtualisation in scale-out nodes with unified management.
- It simplifies operations, especially at branch and remote sites.
- Plan network, resilience settings, scaling balance and licensing.
""",
    ],
    "questions": [
        q("SINGLE", "Which replication type gives an RPO of zero but is limited by distance?", ["Asynchronous", "Synchronous", "Tape backup", "Snapshot"], ["Synchronous"],
          explanation="Writes are confirmed at both sites, which adds latency over distance."),
        q("SINGLE", "Which DR test type involves only a discussion of a scenario?", ["Full failover", "Partial failover", "Tabletop exercise", "Live migration"], ["Tabletop exercise"],
          explanation="Tabletop exercises test roles and decisions without touching systems."),
        q("TRUE_FALSE", "A DR plan that has never been tested should be considered unproven.", TF, ["True"],
          explanation="Testing reveals gaps in systems, procedures and people."),
        q("MULTIPLE", "Which are storage efficiency features?", ["Thin provisioning", "Deduplication", "Compression", "RAID 0"], ["Thin provisioning", "Deduplication", "Compression"],
          explanation="RAID 0 adds speed without protection; it is not an efficiency feature."),
        q("SINGLE", "Which standard specifies requirements for business continuity management systems?", ["ISO 22301", "ISO 9001", "IEEE 802.11", "IS 3043"], ["ISO 22301"],
          explanation="ISO 22301 covers business continuity management systems."),
        q("SINGLE", "What does HCI combine?", ["Printing and scanning", "Compute, storage and virtualisation in standard nodes", "Power and cooling", "Sales and presales"], ["Compute, storage and virtualisation in standard nodes"],
          explanation="HCI uses software-defined storage across server nodes."),
        q("SHORT_ANSWER", "In two or three sentences, explain why a DR test might fail even if data was replicated successfully.",
          explanation="Applications also need working networks, DNS, firewall rules, identity services and up-to-date runbooks at the DR site. If any of these are missing, users cannot reach recovered systems, so the RTO is missed."),
    ],
    "sources": [NIST_CP, ISO22301, SNIA, CISA_RANSOM],
}
