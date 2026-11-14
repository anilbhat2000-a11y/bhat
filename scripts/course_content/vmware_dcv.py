"""IT INFRA: VMware Data Center Virtualization Foundations.

Self-paced version of the 4-hour instructor-led workshop deck "VMware Data Center
Virtualization Foundations" (written for vSphere 5.5). The concepts and the workshop's
structure, scenarios and quiz are kept; product names, limits and the certification path are
updated to the current VMware (Broadcom) portfolio. Scenario organisations are fictional.
"""
from . import q, TF

STANDALONE = {}

BCOM_DOCS = ("Broadcom TechDocs: VMware vSphere documentation", "https://techdocs.broadcom.com/")
REBRAND = ("Broadcom KB 373821: rebranding of Site Recovery Manager and Cloud Disaster Recovery", "https://knowledge.broadcom.com/external/article/373821")
CERT_FAQ = ("Broadcom: VMware certification FAQs", "https://docs.broadcom.com/doc/vmw-certification-faqs")
FT_DOC = ("VMware vSphere 8 documentation: Fault Tolerance requirements and limits", "https://docs.vmware.com/en/VMware-vSphere/8.0/vsphere-availability/GUID-57929CF0-DA9B-407A-BF2E-E7B72708D825.html")
VVF_VCF = ("William Lam: what is in VMware vSphere Foundation (VVF) and VMware Cloud Foundation (VCF)", "https://williamlam.com/2024/01/whats-in-the-new-vmware-vsphere-foundation-vvf-and-vmware-cloud-foundation-vcf-offers.html")
VFRC = ("vFlash Read Cache deprecation announced (vSphere 6.7 Update 2)", "https://vcdx181.com/2019/04/15/vflash-read-cache-deprecation-announced/")

STANDALONE["VMware Data Center Virtualization Foundations"] = {
    "slug": "vmware-data-center-virtualization-foundations",
    "subject": "IT INFRA",
    "category": "TECHNICAL",
    "level": "BASIC",
    "description": (
        "How server virtualisation with VMware vSphere turns under-used physical servers into a flexible, resilient "
        "data centre: virtual machines, ESXi and vCenter, vMotion and DRS, high availability and fault tolerance, "
        "storage and virtual networking, operations and disaster recovery. Based on our 4-hour workshop, updated "
        "for today's VMware portfolio. You will be able to: explain the business case for virtualisation; describe "
        "the main vSphere components; and choose the right vSphere feature for a customer's problem."
    ),
    "modules": [
        ("Why virtualise the data centre", 45),
        ("vSphere core: compute, mobility and availability", 80),
        ("Storage, networking, operations and recovery", 30),
        ("Applying what you have learned", 40),
        ("Wrap-up and certification readiness", 15),
    ],
    "lessons": [
        (1, "Course overview: what you will learn and what has changed", """
This course is the self-paced version of our 4-hour instructor-led workshop, **VMware Data Center Virtualization Foundations**. It is for system administrators, network engineers, presales engineers, account managers and new joiners in technical roles. You need only basic IT familiarity.

## What you will be able to do

1. **Explain the value of virtualisation** in business terms: availability, scalability, optimisation and management.
2. **Describe the main components** of VMware vSphere: virtual machines, the ESXi hypervisor, vCenter Server, storage and virtual networking, and the management tools around them.
3. **Match features to real problems**: recommend the right vSphere capability for a customer's situation.

Certification exams and customers both test why a feature is used as much as what it does, so every lesson ends with that link.

## How the course is organised

- **Module 1** explains why organisations virtualise, and includes a server room audit exercise.
- **Module 2** covers the vSphere core: compute, live migration, resource balancing and availability.
- **Module 3** covers storage, virtual networking, operations and disaster recovery.
- **Module 4** applies everything to four customer scenarios.
- **Module 5** gives a feature cheat sheet and the current certification path.

## What has changed since the original workshop

The workshop was first written for vSphere 5.5, released in 2013. vSphere 5.5 reached the end of general support in September 2018. The ideas taught here have not changed, but some products have:

- **Broadcom** completed its acquisition of VMware in November 2023. VMware products are now sold mainly as subscriptions, chiefly **VMware vSphere Foundation (VVF)** and **VMware Cloud Foundation (VCF)**.
- The browser tool is now the **vSphere Client** (HTML5); the old Flash-based vSphere Web Client was removed. vCenter now runs only as the **vCenter Server Appliance**; the Windows version ended with vSphere 6.7.
- **Fault Tolerance** is no longer limited to 1 vCPU: in vSphere 8 it supports up to 8 vCPUs, depending on the licence.
- **vSphere Flash Read Cache** and **vSphere Data Protection** were discontinued.
- **vCenter Operations Manager** became vRealize Operations, then Aria Operations, and is **VCF Operations** in VCF 9.
- **Site Recovery Manager** was rebranded under the **VMware Live Recovery** family in 2024.
- The **VCA-DCV** associate certification no longer exists. See the last lesson for today's path.

## Key terms

- **Virtualisation:** running several isolated virtual computers on one physical computer.
- **vSphere:** VMware's server virtualisation platform: ESXi plus vCenter Server and their features.
- **VVF / VCF:** VMware vSphere Foundation and VMware Cloud Foundation, today's main VMware subscriptions.

## Real-world example

A presales engineer is asked by a customer whether the "vSphere 5.5 features" in an old proposal still apply. Because she knows what has been renamed, replaced or retired, she rewrites the proposal around vSphere 8 features and the customer's VVF subscription, avoiding promises about products that no longer exist.

## Common mistakes

- Quoting product names or limits from old material without checking the current version.
- Treating virtualisation as only a cost-saving exercise.

## Key takeaways

- The concepts in this course are current; some product names and limits have changed.
- Always check features against the customer's vSphere version and subscription.
"""),
        (1, "Physical versus virtual architecture", """
To see why virtualisation matters, compare a traditional server room with a virtualised one.

## The traditional physical model

In a traditional setup, each application runs on its own physical server: a web application on one, a database on another, a mail server on a third.

- **Tightly coupled:** the operating system is installed for that exact server's motherboard, network card and storage controller. Moving the application to new hardware is slow and risky.
- **Low utilisation:** most single-application servers use only a small part of their capacity, often around 5 to 15% of their CPU on an average day.
- **Server sprawl:** many servers mean high power, cooling and rack-space costs.
- **Slow provisioning:** a new server can take weeks to approve, buy, deliver, rack and install.

## The virtualised model

In a virtualised data centre, a thin software layer called a **hypervisor** runs directly on each physical server. VMware's hypervisor is **ESXi**. The hypervisor:

- **Pools** the server's CPU, memory, storage and network.
- Runs **many virtual machines (VMs)** side by side, each with its own operating system and applications, fully isolated from the others.
- Presents **standard virtual hardware** to every VM, so a VM is not tied to one physical model.

The results are higher utilisation (often 60 to 80% of host capacity), fewer servers, and new VMs ready in minutes from templates instead of weeks.

## Key terms

- **Hypervisor:** software that creates and runs virtual machines.
- **Type 1 (bare-metal) hypervisor:** installed directly on the server hardware, such as ESXi. Type 2 hypervisors, such as VMware Workstation, run on top of Windows or Linux and are used on desktops.
- **Consolidation ratio:** the number of VMs running on one physical host.
- **CAPEX / OPEX:** capital expenditure (buying hardware) and operating expenditure (power, cooling, support).

## Real-world example

A distribution company in Nagpur runs 30 physical servers, each for one application, and is out of rack space. After virtualising onto four ESXi hosts with shared storage, it frees most of its racks, cuts its power bill sharply and deploys new application servers the same day they are requested.

## Common mistakes

- Thinking a VM is "less real" than a physical server; to the operating system it behaves like a normal computer.
- Consolidating so heavily that there is no spare capacity for failures or growth.

## Key takeaways

- Physical servers tie the operating system to specific hardware and are usually under-used.
- A Type 1 hypervisor such as ESXi pools resources and runs many isolated VMs on one host.
- Virtualisation improves utilisation, cuts costs and speeds up provisioning.
"""),
        (1, "The four core IT challenges", """
Every feature in this course solves one or more of four business challenges. Learn these four, and you can explain any vSphere feature in terms a customer cares about.

## 1. Availability

**The problem:** planned hardware maintenance forces downtime windows, and unexpected server failures or site disasters cause long, costly outages.

**vSphere answers:** vMotion (move running VMs before maintenance), High Availability (automatic restart after a failure), Fault Tolerance (no downtime at all for critical VMs) and site recovery tools for disasters.

## 2. Scalability

**The problem:** the business cannot add capacity quickly for traffic spikes or growth without buying hardware that sits idle most of the time.

**vSphere answers:** VM templates and cloning for fast deployment, DRS clusters that share resources across hosts, and vSAN storage that grows by adding hosts.

## 3. Optimisation

**The problem:** under-used servers waste electricity, cooling and space, while storage bottlenecks slow important applications.

**vSphere answers:** consolidation, Distributed Power Management, Storage I/O Control and storage balancing.

## 4. Management

**The problem:** repetitive manual administration, inconsistent configuration from host to host, and reacting to problems only after users complain.

**vSphere answers:** vCenter Server for central management, the vSphere Distributed Switch for consistent networking, and operations analytics (now VCF Operations) for proactive monitoring.

## Key terms

- **Downtime:** time when a service is unavailable.
- **Provisioning:** preparing and delivering a new server or VM.
- **Server sprawl:** too many lightly used physical servers.

## Real-world example

During discovery, a hospital's IT head lists three complaints: weekend outages for maintenance, three weeks to get a new server, and no one noticing slow systems until doctors complain. The account manager maps them to availability, scalability and management, and the proposal explains vMotion, templates and proactive monitoring in those terms.

## Common mistakes

- Pitching features by name without linking them to a challenge.
- Ignoring management, which is often the biggest daily pain for small IT teams.

## Key takeaways

- The four challenges are availability, scalability, optimisation and management.
- Every vSphere feature maps to at least one of them.
- Use the four challenges to structure discovery and proposals.
"""),
        (1, "Activity: the traditional server room audit", """
This activity applies Module 1 to a realistic customer. Work through the questions before reading the suggested answers.

## The customer

**Kaveri Logistics** (a fictional company) runs a traditional server room with one application per physical rack server:

- 20 physical servers.
- Average CPU utilisation of 12%.
- New servers take about 3 weeks to deploy.
- A power supply failure last month took the shipping portal offline for 6 hours.

## Questions to answer

1. Which of the four core IT challenges is Kaveri Logistics facing?
2. At 12% average utilisation across 20 servers, how many ESXi hosts would run all 20 workloads with N+1 redundancy (one spare host's worth of capacity)?
3. How would virtualisation have prevented the 6-hour shipping portal outage?

## Suggested answers

- **Challenges:** all four. Availability (the outage), scalability (3-week provisioning), optimisation (12% utilisation) and management (20 separate servers to look after).
- **Consolidation maths:** 20 servers × 12% ≈ 2.4 servers' worth of actual load. Three or four modern ESXi hosts, running at around 60% with capacity to survive one host failure, can carry all 20 workloads, removing about 16 physical servers. Always confirm with measured CPU, memory and storage data before sizing.
- **Outage prevention:** with vSphere HA, if a host fails, its VMs restart automatically on the remaining hosts within a few minutes. Dual power supplies on each host and a UPS reduce the risk further.
- **Agility:** VM templates cut new server deployment from weeks to minutes.

## Key terms

- **N+1:** one extra unit of capacity so that one failure can be tolerated.
- **Average utilisation:** typical use over time; always check peaks too.
- **Template:** a master VM image used to create new VMs quickly.

## Real-world example

A presales engineer runs this same calculation with real monitoring data from a customer. The data shows that memory, not CPU, is the limiting factor, so the design uses hosts with more RAM. Measuring rather than guessing avoids a costly mistake.

## Common mistakes

- Sizing from average CPU only, ignoring memory, storage and peaks.
- Forgetting spare capacity for a host failure.

## Key takeaways

- Under-used physical servers can usually be consolidated onto far fewer hosts.
- Size with N+1 and real usage data.
- HA and templates address outages and slow provisioning.
"""),
        (2, "Core building blocks: virtual machines, ESXi and vCenter", """
Every vSphere environment is built from three building blocks: virtual machines, the ESXi hypervisor and vCenter Server.

## Virtual machines (VMs)

A VM is a software computer that runs its own operating system and applications. Four properties make VMs powerful:

- **Partitioning:** many VMs share one physical host.
- **Isolation:** a crash or malware in one VM does not affect the others.
- **Encapsulation:** the whole VM is stored as a set of files, so it can be copied, moved and backed up easily.
- **Hardware independence:** every VM sees the same standard virtual hardware, on any supported host.

Important VM files include the **.vmx** file (configuration), the **.vmdk** file (virtual disk) and the **.nvram** file (virtual BIOS or UEFI settings).

## ESXi hypervisor

**ESXi** is VMware's Type 1, bare-metal hypervisor, installed directly on the physical server with no Windows or Linux underneath.

- It schedules CPU time, allocates memory and shares storage and network access among VMs.
- Its small footprint means a small attack surface and less patching than a general-purpose operating system.
- A single ESXi host can be managed on its own through its host client.

## vCenter Server

**vCenter Server** is the central management platform for many hosts and VMs.

- One place to manage hundreds of hosts and thousands of VMs, through the browser-based **vSphere Client**.
- **Required** for the cluster features in this course: vMotion, DRS, HA, Fault Tolerance and the vSphere Distributed Switch.
- Today it is deployed as the **vCenter Server Appliance**, a pre-built Linux-based virtual machine.

## Key terms

- **Guest operating system:** the operating system inside a VM.
- **Host:** a physical server running ESXi.
- **Cluster:** a group of hosts managed together in vCenter, sharing resources and availability features.

## Real-world example

A school group runs two standalone ESXi hosts managed separately. When one host needs maintenance, every VM on it must be shut down. After adding vCenter and creating a cluster, the IT team moves running VMs to the other host before maintenance, with no interruption to students.

## Common mistakes

- Expecting vMotion, HA or DRS on standalone hosts without vCenter.
- Deleting or editing VM files directly on the datastore instead of using vCenter.

## Key takeaways

- VMs are isolated, encapsulated, hardware-independent computers stored as files.
- ESXi is a bare-metal Type 1 hypervisor.
- vCenter Server is required for cluster features such as vMotion, DRS, HA and FT.
"""),
        (2, "Live migration and resource balancing: vMotion, DRS and DPM", """
Three features build on each other to keep workloads running smoothly across a cluster: vMotion, DRS and DPM.

## vSphere vMotion

**vMotion** moves a running VM from one ESXi host to another with no downtime and no dropped connections. It copies the VM's active memory and execution state over a dedicated vMotion network, then switches the VM to the new host in a moment. Users do not notice.

- **Main use:** planned host maintenance, such as firmware updates or hardware repairs.
- With shared storage, the VM's disk files stay where they are; only the running state moves.

## Distributed Resource Scheduler (DRS)

**DRS** automates vMotion. It treats the CPU and memory of all hosts in a cluster as one pool:

- **Initial placement:** chooses the best host when a VM is powered on.
- **Load balancing:** continuously checks the cluster and moves VMs with vMotion when a host becomes overloaded.
- **Automation levels:** manual (DRS only recommends), partially automated (DRS places new VMs, recommends moves) and fully automated (DRS acts on its own).

## Distributed Power Management (DPM)

**DPM** is an option of DRS clusters. When demand is low, such as at night, it moves VMs onto fewer hosts and puts idle hosts into standby to save power and cooling. When demand rises, it powers them back on.

## Key terms

- **Live migration:** moving a running VM without shutting it down.
- **vMotion network:** a dedicated network (VMkernel port) for vMotion traffic.
- **Automation level:** how much DRS acts on its own.

## Real-world example

An IT team must update the firmware on all six hosts in a cluster. It puts each host into maintenance mode in turn; DRS moves that host's VMs to the others with vMotion. The firmware is updated during working hours, and nobody notices.

## Common mistakes

- Running vMotion over a congested shared network instead of a dedicated one.
- Setting DRS to manual and never acting on its recommendations.

## Key takeaways

- vMotion moves running VMs between hosts with no downtime.
- DRS balances CPU and memory across a cluster using vMotion.
- DPM saves power by putting idle hosts into standby when demand is low.
"""),
        (2, "Storage mobility and optimisation: Storage vMotion, Storage DRS and SIOC", """
Storage can become a bottleneck or a source of downtime too. vSphere provides three features for moving and balancing storage.

## Storage vMotion

**Storage vMotion** moves a running VM's virtual disk files (.vmdk) from one datastore or storage array to another, with no downtime.

- **Main uses:** replacing a storage array, retiring old storage, or freeing space on a full datastore.
- **vMotion versus Storage vMotion:** vMotion moves the running VM between **hosts** (the disks stay put); Storage vMotion moves the VM's **disks** between datastores (the VM stays on its host). Both can be combined in one migration.

## Storage DRS

**Storage DRS** groups several datastores into a **datastore cluster** and:

- Chooses where to place a new VM's disks.
- Balances **capacity** (how full each datastore is) and **I/O latency** (how slow it is), moving disks with Storage vMotion when needed.

## Storage I/O Control (SIOC)

**SIOC** provides quality of service for storage. When a datastore's latency rises above a threshold, SIOC gives disk access to VMs according to their shares, so lower-priority VMs are throttled first.

- **Main use:** stopping "noisy neighbour" VMs, such as backup or batch jobs, from starving important databases.

## Key terms

- **Datastore:** a storage container for VM files.
- **Datastore cluster:** a group of datastores managed by Storage DRS.
- **Latency:** the delay for a storage operation, in milliseconds.
- **Shares:** relative priority used when resources are contended.

## Real-world example

A bank is replacing its five-year-old storage array. Using Storage vMotion, the team moves VM disks to the new array during the day, a few at a time, with no outage. Afterwards, Storage DRS keeps capacity and latency balanced across the new datastores automatically.

## Common mistakes

- Confusing vMotion (hosts) with Storage vMotion (disks).
- Leaving backup VMs with the same storage priority as critical databases.

## Key takeaways

- Storage vMotion moves VM disks between datastores without downtime.
- Storage DRS balances capacity and latency across a datastore cluster.
- SIOC protects important VMs from noisy neighbours when storage is busy.
"""),
        (2, "Availability and data protection: HA, Fault Tolerance, replication and backup", """
Different workloads need different levels of protection. vSphere provides a range from automatic restart to zero downtime.

## vSphere High Availability (HA)

**HA** monitors the hosts in a cluster. If a host fails, the other hosts automatically restart its VMs, typically within a few minutes. HA can also restart a VM whose guest operating system stops responding.

- Works for all VMs with little overhead.
- **Admission control** reserves enough spare capacity in the cluster to restart VMs after a failure.

## vSphere Fault Tolerance (FT)

**FT** gives continuous availability: no downtime and no data loss if a host fails. It keeps a **secondary VM** on another host, continuously synchronised with the primary. If the primary's host fails, the secondary takes over instantly.

- Used only for the most critical VMs, because it doubles resource use and needs a fast dedicated network.
- In vSphere 8, an FT VM can have up to 8 vCPUs with vSphere Enterprise Plus or VVF, and up to 2 vCPUs with Standard or Enterprise. (The original vSphere 5.5 limit was 1 vCPU.)

**Exam and customer tip:** HA **restarts** VMs after a failure (minutes of downtime); FT **avoids** downtime entirely.

## vSphere Replication

**vSphere Replication** copies VMs to another site, asynchronously, at the hypervisor level. You choose a recovery point objective, from minutes up to 24 hours. It does not need identical storage arrays at both sites.

## Backup

Backups protect against deletion, corruption and ransomware, which HA and FT do not. VMware's own backup appliance, vSphere Data Protection, was discontinued; today, backup products from vendors such as Veeam, Commvault and Veritas protect vSphere VMs using VMware's storage APIs for data protection, with changed block tracking for fast incremental backups.

## Key terms

- **RTO:** recovery time objective, how quickly service must return.
- **RPO:** recovery point objective, how much data loss is acceptable.
- **Admission control:** HA reserving capacity for failover.
- **Changed block tracking (CBT):** recording which disk blocks changed since the last backup.

## Real-world example

A hospital protects its patient-monitoring database with FT, its other clinical systems with HA, replicates key VMs to its DR site with vSphere Replication and backs everything up daily with immutable copies. Each tier matches the business impact of downtime.

## Common mistakes

- Assuming HA means zero downtime.
- Thinking HA or FT replace backups.

## Key takeaways

- HA restarts VMs after a host failure; FT gives zero downtime for critical VMs.
- vSphere Replication copies VMs to another site with a chosen RPO.
- Backups are still essential for deletion, corruption and ransomware.
"""),
        (2, "Guided walkthrough: vCenter and the vSphere Client", """
In the workshop, the instructor demonstrates these steps live. Follow them in a lab or training environment, never in production without approval.

## Step 1: explore the inventory

1. Sign in to the **vSphere Client** in a browser.
2. Open **Hosts and Clusters**. Note the hierarchy: vCenter → data centre → cluster → hosts → VMs.
3. Select an ESXi host and review its **summary**: CPU, memory, ESXi version and build.
4. Open **Datastores** and browse a VM's folder to see its **.vmx** and **.vmdk** files.

## Step 2: watch a live vMotion

1. From another machine, start a continuous ping to a running test VM (for example `ping -t web-01` on Windows).
2. Right-click the VM → **Migrate** → **Change compute resource only**.
3. Choose another host in the cluster and finish the wizard.
4. Watch the ping: it continues with no lost replies, or at most one, while the VM moves.

If vMotion fails, check that both hosts have a VMkernel adapter with the **vMotion** service enabled, on a network they can both reach.

## Step 3: review HA and DRS settings

1. Select the cluster → **Configure**.
2. Under **vSphere DRS**, review the automation level: manual, partially automated or fully automated.
3. Under **vSphere Availability**, review host monitoring, admission control and VM restart priority.

## Key terms

- **Inventory:** the tree of data centres, clusters, hosts and VMs in vCenter.
- **VMkernel adapter:** a host network interface for services such as management, vMotion or storage.
- **Restart priority:** the order in which HA restarts VMs.

## Real-world example

A new support engineer practises these steps in the company's training lab. A month later, during a real host failure, she knows where to check HA events and restart priorities, and explains to the customer exactly what happened.

## Common mistakes

- Practising on production systems.
- Missing the vMotion VMkernel configuration when migrations fail.

## Key takeaways

- The vSphere Client shows the inventory from vCenter down to VM files.
- A continuous ping demonstrates zero-downtime vMotion.
- HA and DRS are configured at the cluster level.
"""),
        (3, "Storage and virtual networking", """
VMs need storage for their disks and networks to talk to users and each other. vSphere provides both.

## Storage options

- **VMFS datastores:** VMware's clustered file system on block storage (Fibre Channel, iSCSI, or NVMe over Fabrics), which several hosts can use at once.
- **NFS datastores:** file-based storage from a NAS over the IP network.
- **vSAN:** VMware's software-defined, hyper-converged storage. It pools the local disks of the hosts in a cluster into one shared datastore, with no separate storage array. vSAN's original architecture used flash for cache and disks for capacity; the newer **Express Storage Architecture** (vSphere 8 onwards) uses all-NVMe flash.
- **vSphere Flash Read Cache**, taught in the original workshop, was deprecated in vSphere 6.7 Update 2 and is no longer available in current releases.

## Virtual networking

- **vSphere Standard Switch (vSS):** a virtual switch configured separately on each host. It connects VMs' virtual network cards to the host's physical uplinks.
- **vSphere Distributed Switch (vDS):** configured once in vCenter and shared by many hosts, so VLANs and policies are consistent everywhere. It adds features such as Network I/O Control and NetFlow, and requires vCenter.

## VMkernel adapters

Each host uses **VMkernel adapters** for its own traffic, separate from VM traffic. Common services include **management**, **vMotion**, **Fault Tolerance logging**, **IP storage** (iSCSI or NFS), **vSAN** and **vSphere Replication**. Separate networks or VLANs for these services improve performance and security.

## Key terms

- **Uplink:** a physical network card connecting a host to the physical network.
- **Port group:** a set of virtual switch ports with the same settings, such as a VLAN.
- **Hyper-converged infrastructure (HCI):** compute and storage combined in the same servers.

## Real-world example

A retail company with 24 hosts configures VLANs on standard switches host by host, and one typo breaks the payment network on two hosts. Moving to a distributed switch, configured once in vCenter, removes the inconsistency, and changes now take minutes instead of hours.

## Common mistakes

- Putting vMotion, storage and management traffic on one congested network.
- Configuring standard switches differently on each host.

## Key takeaways

- Datastores can be VMFS, NFS or vSAN; vSAN pools hosts' local disks.
- Distributed switches give consistent networking across hosts and need vCenter.
- Separate VMkernel services such as management, vMotion, storage and vSAN.
"""),
        (3, "Operations and disaster recovery", """
Running a large virtual environment well needs proactive monitoring and a tested disaster recovery plan.

## Operations analytics

The workshop's **vCenter Operations Manager (vC Ops)** has been renamed several times: vRealize Operations, then Aria Operations, and **VCF Operations** in VMware Cloud Foundation 9. The ideas are the same:

- **Health:** is something wrong right now? It learns normal behaviour and flags anomalies.
- **Risk:** will we run out of capacity soon? It forecasts when CPU, memory or storage will run out.
- **Efficiency:** are we wasting resources? It finds oversized and idle VMs whose resources can be reclaimed.

This moves the team from firefighting to planning.

## Disaster recovery orchestration

The workshop's **vCenter Site Recovery Manager (SRM)** automates site failover. In 2024 Broadcom rebranded it under the **VMware Live Recovery** family (as VMware Live Site Recovery) and it is now part of VMware Cloud Foundation; check Broadcom's current product pages for the latest name and packaging. Its capabilities:

- **Recovery plans:** the order in which VMs start, scripts to run and IP address changes at the recovery site.
- **Non-disruptive testing:** full DR tests in an isolated network, with no effect on production.
- **Replication choice:** works with vSphere Replication or storage array replication.

Automated, tested plans replace long manual runbooks that are rarely tested and often fail under pressure.

## Key terms

- **Capacity forecasting:** predicting when resources will run out.
- **Right-sizing:** adjusting VM CPU and memory to what is actually used.
- **Recovery plan:** an automated, ordered set of steps for failover.
- **DR test (drill):** a practice failover to prove the plan works.

## Real-world example

An insurance company's DR plan is a 100-page document last tested three years ago. After implementing automated recovery plans, it runs a quarterly DR test in an isolated network in under an hour, records the results for its auditors and fixes two issues it would otherwise have discovered during a real disaster.

## Common mistakes

- Buying monitoring tools but acting only on alerts after users complain.
- Having a DR plan that has never been tested.

## Key takeaways

- Operations analytics (now VCF Operations) show health, risk and efficiency.
- DR orchestration automates failover and allows non-disruptive testing.
- Product names change; the capabilities, and the need to test, do not.
"""),
        (4, "Four scenario stations: availability, scalability, optimisation and management", """
In the workshop, groups rotate through four customer stations. For each one, decide which vSphere features you would recommend before reading the suggested solution. The organisations are fictional.

## Station 1: availability, Sahyadri Multispeciality Hospital

The patient-monitoring database cannot tolerate even 30 seconds of downtime. Other clinical applications need automatic recovery from hardware failure. Regional branches need automated disaster recovery with testing that does not disturb production.

**Suggested solution:** Fault Tolerance for the patient-monitoring database (zero downtime, zero data loss); HA for other clinical VMs (automatic restart in minutes); VMware Live Recovery (formerly SRM) with vSphere Replication for orchestrated branch DR and isolated DR tests.

## Station 2: scalability, CartKart online retail

Weekend flash sales bring sudden traffic spikes. The retailer needs 15 new web servers in minutes, automatic balancing across 8 hosts and storage that grows without buying an expensive SAN.

**Suggested solution:** VM templates and cloning for fast deployment; DRS to balance CPU and memory across the 8 hosts; vSAN for storage that scales by adding disks or hosts.

## Station 3: optimisation, Dalal Street Analytics

Servers sit mostly idle overnight, wasting electricity. At month end, batch jobs hog shared storage and slow down executive dashboards.

**Suggested solution:** DPM to consolidate VMs and put idle hosts into standby at night; Storage I/O Control to throttle batch VMs when storage is congested. (The original workshop also suggested Flash Read Cache, which is no longer available; today, all-flash or vSAN storage addresses read performance.)

## Station 4: management, a lean IT team

Three administrators look after 400 VMs on 24 hosts. They configure virtual switches host by host, move VMs off full datastores by hand and find performance problems only after users complain.

**Suggested solution:** vCenter Server with a vSphere Distributed Switch for central, consistent configuration; VCF Operations (formerly vC Ops) for health, risk and efficiency analytics; Storage DRS to balance datastore capacity and latency automatically.

## Key terms

- **Scenario-based design:** choosing features from a customer's stated needs.
- **Tiered protection:** different availability levels for different workloads.

## Real-world example

An account manager uses these four stations as a discovery checklist with a new customer. By asking about availability, scalability, optimisation and management in turn, she finds a DR gap the customer had not mentioned, which becomes the largest part of the eventual order.

## Common mistakes

- Recommending Fault Tolerance for every VM, which wastes resources.
- Proposing features the customer's licence or version does not include.

## Key takeaways

- Start from the customer's challenge, then choose the feature.
- Combine features: no single feature solves every need.
- Check that recommended features are in the customer's version and subscription.
"""),
        (5, "Feature cheat sheet and today's certification path", """
Use this lesson as a quick revision sheet and a guide to next steps.

## Feature cheat sheet

- **Host maintenance with no VM downtime:** vMotion.
- **Moving VM disks to new storage with no downtime:** Storage vMotion.
- **Automatic VM restart after a host failure:** vSphere HA.
- **Zero downtime and zero data loss for a critical VM:** Fault Tolerance.
- **Automatic CPU and memory balancing across a cluster:** DRS.
- **Powering down idle hosts at night:** DPM.
- **Stopping noisy neighbours on shared storage:** Storage I/O Control.
- **Balancing datastore capacity and latency:** Storage DRS.
- **Hyper-converged storage from hosts' local disks:** vSAN.
- **Consistent networking across many hosts:** vSphere Distributed Switch.
- **Health, risk and efficiency analytics:** VCF Operations (formerly vC Ops / Aria Operations).
- **Automated, testable site failover:** VMware Live Recovery (formerly Site Recovery Manager).

## Three things to remember

1. **vCenter dependencies:** vMotion, DRS, HA, FT and the distributed switch all need vCenter Server.
2. **VMkernel services:** management, vMotion, FT logging, IP storage, vSAN and replication.
3. **HA versus FT:** HA restarts; FT avoids downtime.

## Today's certification path

The workshop originally prepared learners for the **VCA-DCV** associate exam, which no longer exists. After Broadcom's acquisition, VMware certifications were reorganised around its current products:

- **VCP-VVF Administrator** focuses on VMware vSphere Foundation, the natural next step after this course.
- **VCP-VCF Administrator** covers the wider VMware Cloud Foundation stack, including NSX, vSAN and SDDC Manager.

Several legacy certifications, including VCP-DCV, are reported to have been retired in December 2025. Exam names, codes and requirements change, so always check Broadcom's official certification pages before booking. Ask L&D about the company's certification support.

## Key terms

- **VCP:** VMware Certified Professional.
- **VVF / VCF:** VMware vSphere Foundation / VMware Cloud Foundation.

## Real-world example

After finishing this course, a support engineer uses the cheat sheet to revise, builds a small lab, and plans for the VCP-VVF Administrator exam with the company's certification support. Customers now see a certified engineer on their projects, which also helps the company's VMware partner status.

## Common mistakes

- Studying for retired exams from old guides.
- Memorising feature names without understanding which problem each solves.

## Key takeaways

- Match each customer need to the right feature using the cheat sheet.
- vCenter is required for the cluster features.
- Check Broadcom's current certification pages; VCP-VVF and VCP-VCF are today's main paths.
"""),
    ],
    "questions": [
        q("SINGLE", "An administrator must update firmware on an ESXi host without interrupting users of its running VMs. Which feature is needed?", ["vSphere High Availability", "vSphere vMotion", "vSphere Replication", "Storage I/O Control"], ["vSphere vMotion"],
          explanation="vMotion moves running VMs to another host with no downtime, so the host can be maintained."),
        q("SINGLE", "How does vSphere Fault Tolerance differ from vSphere High Availability?", ["FT powers off idle hosts; HA balances CPU", "FT gives zero downtime with a synchronised secondary VM; HA restarts VMs after a failure", "FT moves disks; HA moves memory", "FT backs up VMs; HA replicates over the WAN"], ["FT gives zero downtime with a synchronised secondary VM; HA restarts VMs after a failure"],
          explanation="HA restarts VMs (minutes of downtime); FT keeps a live secondary VM, so there is no downtime or data loss."),
        q("SINGLE", "Which solution pools the local disks of the hosts in a cluster into one shared, hyper-converged datastore?", ["Storage DRS", "vSphere Distributed Switch", "vSAN", "VCF Operations"], ["vSAN"],
          explanation="vSAN is VMware's software-defined, hyper-converged storage built from hosts' local disks."),
        q("SINGLE", "A company has 20 physical servers averaging 12% CPU use. Roughly how much actual compute load is that?", ["About 2.4 servers' worth", "About 12 servers' worth", "About 20 servers' worth", "About 0.5 servers' worth"], ["About 2.4 servers' worth"],
          explanation="20 × 12% ≈ 2.4 servers of load, so three or four hosts with N+1 headroom could run them all (confirm with measured data)."),
        q("SINGLE", "What does Storage vMotion move?", ["A running VM's memory between hosts", "A running VM's disk files between datastores", "Physical disks between servers", "Backups to another site"], ["A running VM's disk files between datastores"],
          explanation="vMotion moves the running VM between hosts; Storage vMotion moves its disks between datastores."),
        q("MULTIPLE", "Which features require vCenter Server?", ["vMotion", "DRS", "vSphere HA", "Running a single VM on a standalone ESXi host"], ["vMotion", "DRS", "vSphere HA"],
          explanation="Cluster features need vCenter; a standalone host can still run VMs on its own."),
        q("SINGLE", "Backup VMs are slowing down a production database on shared storage. Which feature helps most?", ["Distributed Power Management", "Storage I/O Control", "vSphere Standard Switch", "VM templates"], ["Storage I/O Control"],
          explanation="SIOC gives storage access by priority when latency rises, throttling noisy neighbours."),
        q("TRUE_FALSE", "vSphere HA and Fault Tolerance make regular backups unnecessary.", TF, ["False"],
          explanation="HA and FT protect against host failure, not against deletion, corruption or ransomware."),
        q("TRUE_FALSE", "A vSphere Distributed Switch is configured once in vCenter and shared by many hosts.", TF, ["True"],
          explanation="Unlike a standard switch, which is configured on each host, a distributed switch gives consistent networking everywhere."),
        q("MATCHING", "Match each customer need to the vSphere feature.", ["Automatic VM restart after a host failure=vSphere HA", "Automatic CPU and memory balancing=DRS", "Powering down idle hosts at night=DPM", "Automated, testable site failover=VMware Live Recovery (formerly SRM)"],
          explanation="Matching needs to features is the core skill this course builds."),
    ],
    "sources": [BCOM_DOCS, FT_DOC, REBRAND, CERT_FAQ, VVF_VCF, VFRC],
}
