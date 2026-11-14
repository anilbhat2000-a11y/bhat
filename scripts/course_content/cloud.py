"""Cloud: IaaS, PaaS and SaaS; migration and cost management; hybrid architecture and operations."""
from . import q, TF, MS_LEARN, AWS_SKILL_BUILDER

COURSES = {}

NIST_CLOUD = ("NIST SP 800-145: The NIST Definition of Cloud Computing", "https://csrc.nist.gov/pubs/sp/800/145/final")
AWS_SRM = ("AWS: Shared Responsibility Model", "https://aws.amazon.com/compliance/shared-responsibility-model/")
AZURE_SRM = ("Microsoft Learn: shared responsibility in the cloud", "https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility")
AWS_7RS = ("AWS Prescriptive Guidance: migration strategies (the 7 Rs)", "https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html")
MS_CAF = ("Microsoft Cloud Adoption Framework for Azure", "https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/")
AWS_WAF = ("AWS Well-Architected Framework", "https://aws.amazon.com/architecture/well-architected/")
FINOPS = ("FinOps Foundation: cloud financial management framework", "https://www.finops.org/")
MEITY = ("MeitY: cloud service provider empanelment for government (MeghRaj)", "https://www.meity.gov.in/")
CSA = ("Cloud Security Alliance: cloud security guidance and Cloud Controls Matrix", "https://cloudsecurityalliance.org/")

COURSES["Cloud Basic: IaaS, PaaS and SaaS"] = {
    "lessons": [
        """
Cloud computing means using computing resources, such as servers, storage, databases and software, over the internet, paying for what you use instead of buying and running everything yourself. The US National Institute of Standards and Technology (NIST) defines cloud computing in SP 800-145, and its definition is widely used.

## Five essential characteristics (NIST)

- **On-demand self-service:** users can provision resources themselves, without waiting for the provider.
- **Broad network access:** services are available over the network from many types of devices.
- **Resource pooling:** the provider serves many customers from shared resources.
- **Rapid elasticity:** resources can scale up and down quickly.
- **Measured service:** usage is measured, and customers pay for what they use.

## Three service models

- **IaaS (Infrastructure as a Service):** virtual servers, storage and networks. The customer manages the operating system, applications and data. Examples include virtual machines from AWS, Microsoft Azure and Google Cloud.
- **PaaS (Platform as a Service):** a platform for building and running applications, such as managed databases and application hosting. The provider manages the underlying servers and operating systems.
- **SaaS (Software as a Service):** complete applications delivered over the internet, such as Microsoft 365, Google Workspace, Salesforce or Zoho. The customer simply uses the software.

## Key terms

- **Cloud service provider (CSP):** a company that offers cloud services.
- **Virtual machine (VM):** a software-based server.
- **Elasticity:** scaling resources up and down with demand.
- **Pay-as-you-go:** paying based on actual usage.

## Real-world example

An online education startup expects huge traffic during exam results week but low traffic the rest of the year. Buying servers for the peak would leave them idle most of the year. Using IaaS and PaaS, the startup scales up automatically during results week and back down afterwards, paying only for what it uses. Its email and documents run on a SaaS suite, with no servers to manage.

## Common mistakes

- Assuming the cloud is always cheaper, regardless of how it is used.
- Confusing IaaS, PaaS and SaaS responsibilities.
- Leaving resources running when they are not needed.

## Key takeaways

- NIST defines five essential characteristics of cloud computing.
- IaaS gives infrastructure, PaaS gives a platform, SaaS gives complete applications.
- The cloud's value comes from elasticity and paying for what you use.
""",
        """
Deployment models describe who uses the cloud infrastructure and where it runs. NIST SP 800-145 defines four deployment models.

## The four deployment models

- **Public cloud:** infrastructure owned and operated by a provider and shared by many customers. Examples: AWS, Microsoft Azure, Google Cloud and Oracle Cloud, many of which have regions in India.
- **Private cloud:** infrastructure used by one organisation, either in its own data centre or hosted by a provider.
- **Community cloud:** shared by organisations with common needs, such as government departments.
- **Hybrid cloud:** a combination of two or more models, connected so that data and applications can move between them.

Many organisations also use **multi-cloud,** meaning services from more than one public cloud provider.

## Choosing a model

- **Regulation and data residency:** some data must stay in India or in specific facilities. For example, the RBI has required since 2018 that payment system data be stored only in India.
- **Government workloads:** Indian government bodies generally use cloud service providers empanelled by MeitY.
- **Performance and latency:** some applications need to run close to users or equipment.
- **Existing investment:** recent on-premises investments may continue alongside the cloud.
- **Skills and operations:** the organisation's ability to manage each environment.

## Key terms

- **Region:** a geographic area where a provider has data centres.
- **Data residency:** where data is physically stored.
- **Multi-cloud:** using more than one public cloud provider.
- **Empanelment:** approval of providers for government use.

## Real-world example

A private bank wants to use the cloud for its mobile app and analytics. Payment data must remain in India under RBI rules, and some core systems must stay in its own data centre. The SI designs a hybrid model: public cloud services in Indian regions for the app and analytics, connected securely to the bank's private data centre for core banking.

## Common mistakes

- Ignoring data residency rules.
- Assuming one model fits every workload.
- Using multiple clouds without the skills to manage them.

## Key takeaways

- NIST defines public, private, community and hybrid deployment models.
- Regulation, data residency, performance and skills guide the choice.
- Hybrid and multi-cloud are common in large organisations.
""",
        """
Moving to the cloud does not move all responsibility to the provider. The **shared responsibility model** explains who secures and manages what. Misunderstanding it is a leading cause of cloud security incidents.

## How responsibility is shared

- **The provider** is responsible for the security **of** the cloud: physical data centres, hardware, networking and the virtualisation layer.
- **The customer** is responsible for security **in** the cloud: their data, user accounts and access, configurations and, depending on the service model, operating systems and applications.

## Responsibility by service model

- **IaaS:** the customer manages the operating system, patching, applications, data, identities and network settings such as firewall rules.
- **PaaS:** the provider manages the operating system and platform; the customer manages applications, data, identities and configuration.
- **SaaS:** the provider manages almost everything; the customer still manages users, access, data and settings such as sharing permissions.

In every model, the customer is always responsible for its **data, identities and access.**

## Common customer responsibilities

- Strong identity controls and MFA, especially for administrator accounts.
- Correct configuration of storage, networks and permissions.
- Encryption and key management choices.
- Backup of data, including SaaS data where the provider does not guarantee recovery.
- Logging and monitoring.

## Key terms

- **Shared responsibility model:** division of security duties between provider and customer.
- **Misconfiguration:** an incorrect setting, such as public access to private data.
- **Root / global administrator:** the most powerful cloud account.

## Real-world example

A company stores customer documents in cloud object storage and accidentally sets the bucket to public. A security researcher finds it and reports it. The cloud provider's infrastructure worked perfectly; the exposure was entirely due to the customer's configuration. The company adds policies that block public storage by default and enables configuration monitoring.

## Common mistakes

- Assuming the provider backs up and secures everything.
- No MFA on administrator accounts.
- Leaving storage or databases publicly accessible.

## Key takeaways

- The provider secures the cloud; the customer secures what it puts in the cloud.
- Responsibilities shift with IaaS, PaaS and SaaS, but data, identity and access always stay with the customer.
- Configuration, identity and backup are critical customer duties.
""",
        """
Organisations usually start their cloud journey with workloads that offer clear benefits and low risk. Good first workloads build skills and confidence before moving critical systems.

## Common first workloads

- **Email and collaboration (SaaS):** moving to Microsoft 365 or Google Workspace.
- **Backup and archive:** storing backup copies in the cloud for off-site protection.
- **Disaster recovery:** using the cloud as a recovery site.
- **Development and test environments:** created and deleted as needed.
- **Websites and customer portals:** benefiting from scalability.
- **File sharing:** replacing old file servers with cloud storage.

## Assessing a first workload

- **Business benefit:** cost, agility, resilience or user experience.
- **Risk:** how critical the workload is and what happens if something goes wrong.
- **Dependencies:** what other systems it connects to.
- **Data sensitivity and residency:** whether the data can be stored in the chosen cloud region.
- **Skills:** whether the team can operate it.

## Building foundations

Even for the first workload, set up basic foundations: account structure, identity and MFA, network design, security baselines, cost monitoring and tagging. Cloud providers' adoption frameworks, such as the Microsoft Cloud Adoption Framework and the AWS Cloud Adoption Framework, describe these foundations, often called a **landing zone**.

## Key terms

- **Landing zone:** a pre-configured, secure cloud environment ready for workloads.
- **Pilot:** a small first deployment to learn and prove value.
- **Tagging:** labelling cloud resources for cost and ownership tracking.

## Real-world example

A manufacturing company is cautious about the cloud. Its SI suggests starting with cloud backup of its on-premises servers and moving email to a SaaS suite. Within six months, the company has off-site backups it can restore from, no email server to maintain, and staff skilled in cloud administration. It then plans to move its development environments.

## Common mistakes

- Starting with the most critical, complex system.
- Skipping foundations such as identity and cost monitoring.
- Not training staff before go-live.

## Key takeaways

- Start with beneficial, lower-risk workloads such as SaaS email, backup and DR.
- Assess benefit, risk, dependencies, data and skills.
- Build a secure landing zone even for the first workload.
""",
    ],
    "questions": [
        q("SINGLE", "Which NIST publication defines cloud computing?", ["SP 800-53", "SP 800-145", "SP 800-207", "SP 800-63B"], ["SP 800-145"],
          explanation="SP 800-145 is The NIST Definition of Cloud Computing."),
        q("MULTIPLE", "Which are NIST's essential characteristics of cloud computing?", ["On-demand self-service", "Rapid elasticity", "Measured service", "Unlimited free storage"], ["On-demand self-service", "Rapid elasticity", "Measured service"],
          explanation="The five are on-demand self-service, broad network access, resource pooling, rapid elasticity and measured service."),
        q("SINGLE", "Microsoft 365 is an example of:", ["IaaS", "PaaS", "SaaS", "On-premises software"], ["SaaS"],
          explanation="It is a complete application delivered over the internet."),
        q("TRUE_FALSE", "Under the shared responsibility model, the customer is always responsible for its data, identities and access.", TF, ["True"],
          explanation="This stays with the customer in IaaS, PaaS and SaaS."),
        q("SINGLE", "A company accidentally makes a cloud storage bucket public. Whose responsibility was this?", ["The cloud provider", "The customer", "The ISP", "Nobody"], ["The customer"],
          explanation="Configuration of resources in the cloud is the customer's responsibility."),
        q("SINGLE", "Which is usually a good first cloud workload?", ["The core banking system", "Cloud backup or SaaS email", "The plant control system", "All systems at once"], ["Cloud backup or SaaS email"],
          explanation="Lower-risk, high-benefit workloads build skills first."),
        q("MATCHING", "Match each service model to who manages the operating system.", ["IaaS=Customer manages the OS", "PaaS=Provider manages the OS", "SaaS=Provider manages almost everything", "On-premises=Customer manages everything"],
          explanation="Responsibility shifts towards the provider from IaaS to SaaS."),
    ],
    "sources": [NIST_CLOUD, AWS_SRM, AZURE_SRM, MEITY, MS_LEARN, AWS_SKILL_BUILDER],
}

COURSES["Cloud Intermediate: Migration and Cost Management"] = {
    "lessons": [
        """
Before moving to the cloud, each application and server must be assessed. A workload assessment shows what you have, how it is used, how it connects to other systems and which migration approach fits.

## What to assess

- **Inventory:** servers, applications, databases, storage and their owners.
- **Performance:** CPU, memory, storage and network usage over time, including peaks.
- **Dependencies:** which systems talk to each other; migrating one without its dependencies can break both.
- **Licensing:** whether software licences can move to the cloud and at what cost.
- **Data:** size, sensitivity, residency requirements and growth.
- **Business criticality:** how important the workload is, and acceptable downtime during migration.
- **Technical fit:** operating system versions, supported platforms and any special hardware.

## Tools and methods

- **Discovery tools** from cloud providers and third parties collect inventory, performance and dependency data.
- **Interviews** with application owners reveal business requirements and constraints.
- **Grouping into migration waves:** related applications move together.

## Key terms

- **Workload:** an application or set of resources serving a business purpose.
- **Dependency mapping:** identifying connections between systems.
- **Migration wave:** a group of workloads moved together.
- **Rightsizing:** matching cloud resources to actual usage.

## Real-world example

A company plans to move its ERP application server to the cloud, leaving the database on-premises. Dependency mapping shows thousands of queries per minute between the two. Running them across a WAN link would slow the ERP badly. The assessment groups the application and database into the same migration wave, avoiding a performance disaster.

## Common mistakes

- Sizing cloud servers to match old hardware instead of actual usage.
- Ignoring dependencies between systems.
- Discovering licensing restrictions after migration.

## Key takeaways

- Assess inventory, performance, dependencies, licensing, data and criticality.
- Use discovery tools and interviews, and group workloads into waves.
- Rightsize based on measured usage.
""",
        """
Not every workload should move to the cloud in the same way. AWS describes seven common migration strategies, often called the **7 Rs**, which are widely used across the industry.

## The 7 Rs

- **Retire:** switch off applications that are no longer needed.
- **Retain:** keep the application where it is for now, for example because of regulations or recent investment.
- **Rehost ("lift and shift"):** move the application to cloud virtual machines with minimal changes. Fastest, but gains fewer cloud benefits.
- **Relocate:** move a whole virtualised environment to the cloud at the hypervisor level, for example a VMware environment to a cloud-hosted VMware service.
- **Replatform ("lift and reshape"):** make small changes to use cloud services, such as moving a database to a managed database service.
- **Repurchase:** replace the application with a SaaS product, such as moving from an on-premises CRM to a SaaS CRM.
- **Refactor (re-architect):** redesign the application to be cloud-native, for scale and agility. The most effort and the most benefit.

## Choosing a strategy

- Business value and urgency of the application.
- Technical condition and supportability.
- Cost and effort of change.
- Skills available.
- Data residency and compliance.

## Key terms

- **Lift and shift:** rehosting with minimal change.
- **Cloud-native:** designed to use cloud services such as managed databases, containers and serverless.
- **Managed service:** a cloud service the provider operates, such as a managed database.

## Real-world example

A company with 120 applications runs an assessment. It finds 15 unused applications to retire, 10 to retain due to regulatory and hardware constraints, 60 to rehost quickly, 20 to replatform onto managed databases, 10 to repurchase as SaaS and 5 customer-facing applications to refactor over time. Different strategies for different workloads let the company move quickly while focusing deep work where it adds most value.

## Common mistakes

- Using one strategy for every application.
- Rehosting and never optimising afterwards.
- Refactoring applications that add little business value.

## Key takeaways

- The 7 Rs are retire, retain, rehost, relocate, replatform, repurchase and refactor.
- Choose per workload based on value, condition, cost, skills and compliance.
- Plan to optimise after migration.
""",
        """
Cloud costs can grow quickly if not managed. Pay-as-you-go pricing gives flexibility, but every running resource costs money. Cloud cost management, often called **FinOps**, brings finance, technology and business teams together to get the most value from cloud spending.

## Common causes of overspending

- Resources left running when not needed, such as test servers at night.
- Oversized virtual machines and databases.
- Unattached storage volumes and old snapshots.
- Data transfer (egress) charges for moving data out of the cloud.
- Lack of ownership: no one knows who created a resource or why.

## Cost management practices

- **Tagging:** label every resource with owner, project and environment.
- **Budgets and alerts:** set spending limits and alerts per team or project.
- **Rightsizing:** match resources to actual usage.
- **Scheduling:** shut down non-production resources outside working hours.
- **Commitment discounts:** reserved instances or savings plans for steady workloads.
- **Storage tiering:** move rarely used data to cheaper storage classes.
- **Regular reviews:** monthly cost reviews with resource owners.

## The FinOps approach

The FinOps Foundation describes an iterative cycle of **inform** (visibility and allocation), **optimise** (reduce waste and improve rates) and **operate** (continuous improvement and governance).

## Key terms

- **FinOps:** cloud financial management that brings finance and engineering together.
- **Egress:** data transferred out of a cloud provider's network, which is often charged.
- **Reserved instances / savings plans:** discounts in return for usage commitments.
- **Showback / chargeback:** showing or charging cloud costs to the teams that use them.

## Real-world example

A company's cloud bill doubles in six months. A FinOps review finds development servers running 24x7, large virtual machines using 10% of their CPU, and terabytes of old snapshots. By scheduling development servers, rightsizing and cleaning up storage, the company cuts its monthly bill by about a third. Commitment discounts for steady production workloads save more.

## Common mistakes

- No tagging, so costs cannot be allocated.
- Ignoring egress charges in designs.
- Buying commitments before rightsizing.

## Key takeaways

- Cloud costs need active management; common waste comes from idle and oversized resources.
- Use tagging, budgets, rightsizing, scheduling, commitments and storage tiering.
- Follow the FinOps cycle: inform, optimise, operate.
""",
        """
Cloud security builds on the shared responsibility model. The customer must secure identities, configurations, data and workloads in the cloud. Most cloud breaches come from mistakes in these areas, not from failures of the provider's infrastructure.

## Core cloud security practices

- **Identity and access management (IAM):** use individual accounts, MFA for all users and especially administrators, least-privilege roles and no shared credentials. Protect the root or global administrator account and use it rarely.
- **Configuration management:** use secure baselines and policies, such as blocking public storage by default. Cloud security posture management (CSPM) tools detect misconfigurations.
- **Network security:** use virtual networks, security groups and firewalls; limit public exposure; use private connectivity for sensitive systems.
- **Data protection:** encrypt data at rest and in transit, manage keys carefully and classify sensitive data.
- **Logging and monitoring:** enable audit logs for all accounts and send them to a central SIEM.
- **Workload protection:** patch virtual machines, scan container images and protect workloads with endpoint security.
- **Backup:** protect against deletion and ransomware with separate, immutable backups.

## Frameworks for cloud security

The Cloud Security Alliance publishes the Cloud Controls Matrix, and providers publish well-architected and security benchmark guidance. ISO/IEC 27017 gives guidance on information security controls for cloud services.

## Key terms

- **IAM:** identity and access management.
- **CSPM:** cloud security posture management.
- **Encryption at rest / in transit:** protecting stored data / data moving across networks.
- **Security group:** a virtual firewall for cloud resources.

## Real-world example

An attacker finds cloud access keys accidentally published in a developer's public code repository. Within hours, the attacker starts expensive virtual machines for cryptocurrency mining. The company's billing alert and CSPM tool flag the unusual activity, and the security team revokes the keys and removes the machines. The company then moves to short-lived credentials and scans repositories for secrets.

## Common mistakes

- No MFA on administrator accounts.
- Access keys stored in code.
- Audit logging not enabled.

## Key takeaways

- Secure identities with MFA and least privilege, and protect administrator accounts.
- Prevent and detect misconfigurations; encrypt data and enable logging.
- Protect workloads and keep immutable backups.
""",
    ],
    "questions": [
        q("SINGLE", "Which migration strategy moves an application to cloud VMs with minimal change?", ["Refactor", "Rehost", "Repurchase", "Retire"], ["Rehost"],
          explanation="Rehosting is 'lift and shift'."),
        q("SINGLE", "Replacing an on-premises CRM with a SaaS CRM is which strategy?", ["Rehost", "Replatform", "Repurchase", "Retain"], ["Repurchase"],
          explanation="Repurchase means moving to a different product, often SaaS."),
        q("TRUE_FALSE", "Dependency mapping helps avoid splitting tightly connected systems across locations.", TF, ["True"],
          explanation="Moving one system without its dependencies can cause serious performance problems."),
        q("MULTIPLE", "Which practices reduce cloud costs?", ["Rightsizing", "Scheduling non-production resources", "Tagging resources by owner", "Leaving test servers running 24x7"], ["Rightsizing", "Scheduling non-production resources", "Tagging resources by owner"],
          explanation="Idle resources are a common cause of waste."),
        q("SINGLE", "What are egress charges?", ["Charges for data transferred out of the cloud", "Charges for creating accounts", "Import duties", "Charges for MFA"], ["Charges for data transferred out of the cloud"],
          explanation="Egress charges should be considered in designs."),
        q("SINGLE", "Which tool detects cloud misconfigurations such as public storage?", ["CSPM", "UPS", "DHCP", "HDMI"], ["CSPM"],
          explanation="Cloud security posture management tools find risky settings."),
        q("MATCHING", "Match each FinOps phase to its focus.", ["Inform=Visibility and cost allocation", "Optimise=Reduce waste and improve rates", "Operate=Continuous improvement and governance", "Tagging=Labelling resources by owner and project"],
          explanation="FinOps is an iterative cycle supported by practices such as tagging."),
    ],
    "sources": [AWS_7RS, FINOPS, CSA, AWS_SRM, MS_CAF],
}

COURSES["Cloud Advanced: Hybrid Architecture and Operations"] = {
    "lessons": [
        """
Most large organisations run a hybrid environment: some workloads in their own data centres, some in one or more public clouds, and many SaaS applications. Hybrid architecture makes these environments work together securely and efficiently.

## Why hybrid

- Regulatory or data residency requirements for some systems.
- Low-latency needs close to users or equipment, such as factories.
- Recent investment in on-premises infrastructure.
- Gradual migration over several years.
- Using the cloud for burst capacity, backup or disaster recovery.

## Key design areas

- **Connectivity:** site-to-site VPNs or private connections such as AWS Direct Connect, Azure ExpressRoute and Google Cloud Interconnect, sized for traffic and with redundancy.
- **Identity:** a single identity system with federation and single sign-on across on-premises, cloud and SaaS.
- **Network design:** consistent IP addressing without overlaps, DNS that works across environments, and segmentation.
- **Security:** consistent policies, firewalls, monitoring and logging across all environments.
- **Management:** tools that manage on-premises and cloud resources together, such as hybrid management services from cloud providers.
- **Data placement:** deciding where each type of data lives, considering latency, cost and compliance.

## Key terms

- **Hybrid cloud:** a combination of on-premises and cloud environments working together.
- **Private connectivity:** dedicated links between a data centre and a cloud provider.
- **Federation:** trusting identities across systems.
- **Latency:** the delay in network communication.

## Real-world example

A manufacturer keeps its plant control systems on-premises for low latency and safety, while moving analytics and its customer portal to the public cloud. The SI designs redundant private connections to the cloud, single sign-on for all users, consistent firewall policies and central monitoring. Plant data flows to cloud analytics without exposing control systems to the internet.

## Common mistakes

- Overlapping IP ranges between on-premises and cloud.
- Separate identity systems for each environment.
- A single connection with no redundancy.

## Key takeaways

- Hybrid suits regulation, latency, existing investment and gradual migration.
- Design connectivity, identity, network, security, management and data placement together.
- Avoid overlapping addresses and build redundant connections.
""",
        """
Cloud governance sets the rules for how an organisation uses the cloud, so that it stays secure, compliant and cost-effective as usage grows. Without governance, cloud environments quickly become hard to control.

## Elements of cloud governance

- **Account and subscription structure:** separate accounts or subscriptions for production, development and different business units.
- **Policies and guardrails:** automated rules that prevent risky actions, such as creating public storage or using unapproved regions.
- **Identity and access:** roles, approvals and regular access reviews.
- **Cost governance:** budgets, tagging rules and cost reviews.
- **Security and compliance baselines:** required configurations, logging and encryption.
- **Resource standards:** naming conventions, approved services and approved images.
- **Change and release management:** controlled deployment, often using infrastructure as code.

## Frameworks

Cloud providers publish adoption and architecture frameworks that include governance guidance:

- **Microsoft Cloud Adoption Framework** and the **Azure Well-Architected Framework.**
- **AWS Cloud Adoption Framework** and the **AWS Well-Architected Framework,** whose pillars include operational excellence, security, reliability, performance efficiency, cost optimisation and sustainability.

## Key terms

- **Guardrail:** an automated control that prevents or detects non-compliant actions.
- **Infrastructure as code (IaC):** defining infrastructure in code templates for consistent deployment.
- **Landing zone:** a governed, pre-configured cloud environment.
- **Access review:** a periodic check that users still need their access.

## Real-world example

A company lets each team create cloud resources freely. After a year, it has hundreds of untagged resources, several public storage buckets and costs it cannot allocate. The SI builds a landing zone with separate accounts per environment, policies that block public storage and enforce tags, and infrastructure-as-code templates. New projects now start secure and visible by default.

## Common mistakes

- Adding governance only after problems occur.
- Manual checks instead of automated guardrails.
- One account for everything.

## Key takeaways

- Governance covers structure, policies, identity, cost, security baselines and standards.
- Use automated guardrails and infrastructure as code.
- Use provider adoption and well-architected frameworks as guides.
""",
        """
Data in the cloud still needs backup and disaster recovery (DR). Cloud providers make infrastructure resilient, but they do not automatically protect customers from accidental deletion, ransomware, misconfiguration or regional outages.

## Key concepts

- **RPO (recovery point objective):** the maximum acceptable data loss, measured in time. An RPO of 15 minutes means losing at most 15 minutes of data.
- **RTO (recovery time objective):** the maximum acceptable time to restore service.
- These targets come from business requirements and drive the design and cost.

## Cloud backup and DR options

- **Backups to cloud storage:** off-site copies of on-premises data.
- **Cloud-native backups:** snapshots and backup services for cloud workloads, copied to another region or account.
- **Immutable backups:** copies that cannot be changed or deleted for a set period, protecting against ransomware.
- **SaaS backup:** many SaaS providers keep data for limited periods; third-party backup protects email, files and CRM data.
- **DR to cloud (DRaaS):** replicating on-premises systems to the cloud and starting them there if the main site fails.
- **Multi-region designs:** running critical cloud workloads across regions.

## Testing

A backup or DR plan is only proven by testing. Run regular restore tests and DR drills, record results and fix problems found.

## Key terms

- **RPO / RTO:** recovery point and recovery time objectives.
- **DRaaS:** disaster recovery as a service.
- **Snapshot:** a point-in-time copy of a disk or volume.
- **Cross-region replication:** copying data to another cloud region.

## Real-world example

A company's administrator account is compromised, and the attacker deletes production databases and their snapshots in the same cloud account. Fortunately, the company also copies backups to a separate account with immutable retention. It restores within hours. Its new design keeps backups in an isolated account with separate credentials as standard.

## Common mistakes

- Assuming the provider backs up customer data automatically.
- Keeping backups in the same account and region as production.
- Never testing restores or DR failover.

## Key takeaways

- Define RPO and RTO from business needs.
- Use isolated, immutable, cross-region backups, including for SaaS data.
- Test restores and DR regularly.
""",
        """
Managed cloud services mean a partner operates an organisation's cloud environment: monitoring, security, cost optimisation and support. Many organisations lack the skills or staff to run cloud environments around the clock.

## What managed cloud services cover

- **Monitoring and incident response:** 24x7 monitoring of performance, availability and alerts.
- **Operations:** patching, backups, scaling and configuration changes.
- **Security:** posture management, threat detection, identity reviews and compliance reporting.
- **Cost optimisation:** regular FinOps reviews, rightsizing and commitment management.
- **Governance:** maintaining landing zones, policies and standards.
- **Support:** a service desk and escalation to the cloud provider.
- **Advisory:** architecture reviews and roadmap planning.

## Designing the service

- Define scope: which accounts, workloads and services.
- Agree responsibilities with a RACI chart: who is responsible, accountable, consulted and informed.
- Set SLAs for response, resolution and availability.
- Agree reporting and regular reviews.
- Price by environment size, number of resources or a percentage of cloud spend, depending on the model.

## Key terms

- **Managed service provider (MSP):** a partner that operates services for customers.
- **RACI:** a matrix defining roles and responsibilities.
- **Well-architected review:** a structured review of a cloud workload against best practices.

## Real-world example

A retail company's small IT team migrated its e-commerce platform to the cloud but struggles with night-time alerts and rising costs. A managed cloud service provides 24x7 monitoring, monthly cost reviews and quarterly well-architected reviews. Outages are resolved faster, and cost optimisation pays for much of the service.

## Common mistakes

- Unclear responsibilities between customer and provider.
- No cost optimisation in the service.
- SLAs that do not match business needs.

## Key takeaways

- Managed cloud services cover monitoring, operations, security, cost, governance and support.
- Define scope, a RACI, SLAs and reporting clearly.
- Cost optimisation and regular reviews show the service's value.
""",
    ],
    "questions": [
        q("SINGLE", "What does RPO measure?", ["Maximum acceptable downtime", "Maximum acceptable data loss, measured in time", "Cloud cost per month", "Number of regions"], ["Maximum acceptable data loss, measured in time"],
          explanation="RPO is the recovery point objective; RTO is the time to restore service."),
        q("TRUE_FALSE", "Keeping backups in the same cloud account as production fully protects against a compromised administrator account.", TF, ["False"],
          explanation="Isolated accounts and immutable backups are needed."),
        q("MULTIPLE", "Which are key hybrid design areas?", ["Connectivity", "Identity", "Non-overlapping IP addressing", "Ignoring security policies"], ["Connectivity", "Identity", "Non-overlapping IP addressing"],
          explanation="Consistent security is also essential."),
        q("SINGLE", "What is a cloud guardrail?", ["A physical barrier", "An automated control that prevents or detects non-compliant actions", "A type of firewall cable", "A billing invoice"], ["An automated control that prevents or detects non-compliant actions"],
          explanation="Guardrails enforce governance automatically."),
        q("SINGLE", "What does a RACI chart define?", ["Network speeds", "Who is responsible, accountable, consulted and informed", "Cloud regions", "Backup retention"], ["Who is responsible, accountable, consulted and informed"],
          explanation="A RACI clarifies roles in managed services."),
        q("TRUE_FALSE", "SaaS providers may keep deleted data only for limited periods, so third-party SaaS backup can be needed.", TF, ["True"],
          explanation="Customers remain responsible for their data in SaaS."),
        q("SHORT_ANSWER", "In two or three sentences, explain why infrastructure as code helps cloud governance.",
          explanation="Infrastructure as code defines resources in reviewed templates, so every deployment follows the same approved, secure configuration. Changes are tracked and repeatable, reducing manual errors and drift."),
    ],
    "sources": [MS_CAF, AWS_WAF, FINOPS, NIST_CLOUD, AWS_SKILL_BUILDER],
}
