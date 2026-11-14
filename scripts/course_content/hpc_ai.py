"""HPC, AI and ML: concepts and use cases; infrastructure for AI workloads; solution sizing and design."""
from . import q, TF, MS_LEARN, AWS_SKILL_BUILDER

COURSES = {}

TOP500 = ("TOP500: list of the world's most powerful supercomputers (HPL benchmark)", "https://www.top500.org/")
MLCOMMONS = ("MLCommons: MLPerf training and inference benchmarks", "https://mlcommons.org/")
NSM = ("National Supercomputing Mission (Government of India)", "https://nsmindia.in/")
INDIAAI = ("IndiaAI Mission (MeitY)", "https://indiaai.gov.in/")
NVIDIA_DLI = ("NVIDIA Deep Learning Institute: AI and accelerated computing training", "https://www.nvidia.com/en-us/training/")
SLURM = ("Slurm Workload Manager documentation (SchedMD)", "https://slurm.schedmd.com/")
PYTORCH = ("PyTorch: open-source machine learning framework", "https://pytorch.org/")
UEC = ("Ultra Ethernet Consortium: Ethernet for AI and HPC", "https://ultraethernet.org/")
ASHRAE = ("ASHRAE TC 9.9: thermal guidelines including liquid cooling", "https://www.ashrae.org/")

COURSES["HPC, AI and ML Basic: Concepts and Use Cases"] = {
    "lessons": [
        """
Artificial intelligence (AI) is everywhere in business conversations. To help customers, you need to explain the main ideas clearly and separate real value from hype.

## The main terms

- **Artificial intelligence (AI):** computer systems that perform tasks that normally need human intelligence, such as understanding language, recognising images or making decisions.
- **Machine learning (ML):** a branch of AI in which systems learn patterns from data instead of following only hand-written rules.
- **Deep learning:** a branch of ML that uses neural networks with many layers; it powers modern image recognition, speech and language models.
- **Generative AI:** AI that creates new content, such as text, images or code. **Large language models (LLMs)** are generative AI models trained on very large amounts of text.

## How machine learning works

1. **Data:** collect and prepare examples, such as past invoices labelled "valid" or "fraud".
2. **Training:** the model learns patterns from the data. Training large models needs a lot of computing power, usually GPUs.
3. **Evaluation:** test the model on data it has not seen to check accuracy.
4. **Inference:** use the trained model to make predictions on new data, such as checking new invoices.
5. **Monitoring and retraining:** watch performance and retrain as data changes.

## Key terms

- **Model:** the learned pattern used to make predictions.
- **Training:** the process of learning from data.
- **Inference:** using a trained model on new inputs.
- **Neural network:** a model made of layers of connected nodes.

## Real-world example

An insurance company receives thousands of claim documents each day. An ML model trained on past claims reads and classifies documents, extracts key details and flags unusual claims for human review. Staff spend less time on data entry and more on complex cases. The company starts with inference on a few GPU servers and retrains the model monthly.

## Common mistakes

- Treating AI as magic rather than a tool that depends on good data.
- Confusing training and inference needs.
- Starting without a clear business problem.

## Key takeaways

- AI includes ML, which includes deep learning; generative AI creates new content.
- ML works through data, training, evaluation, inference and monitoring.
- Good data and a clear business problem matter more than the latest model.
""",
        """
High-performance computing (HPC) uses many powerful computers working together to solve problems too large or complex for a single machine. It has long been used in science and engineering, and it shares many technologies with modern AI.

## How HPC works

- **Clusters:** many servers (nodes) connected by a fast network and working as one system.
- **Parallel computing:** a big problem is split into smaller pieces processed at the same time. Programs often use the MPI (Message Passing Interface) standard to coordinate.
- **Schedulers:** software such as Slurm queues jobs and allocates nodes fairly among users.
- **Parallel file systems:** shared storage that many nodes can read and write at high speed.
- **Accelerators:** GPUs and other processors that speed up suitable calculations.

## Measuring performance

HPC performance is often measured in **FLOPS** (floating-point operations per second). The **TOP500** list ranks the world's most powerful supercomputers twice a year using the High-Performance Linpack (HPL) benchmark.

## HPC in India

India's **National Supercomputing Mission (NSM)** has deployed supercomputers at academic and research institutions, including systems in the PARAM series. The **IndiaAI Mission,** approved in March 2024, includes building large GPU compute capacity for AI research and startups.

## Key terms

- **Node:** a single server in a cluster.
- **MPI:** a standard for communication between processes in parallel programs.
- **FLOPS:** floating-point operations per second.
- **Scheduler:** software that manages jobs and resources on a cluster.

## Real-world example

An automotive engineering firm runs crash simulations that take days on a single workstation. An SI designs a small HPC cluster with compute nodes, a fast interconnect, a parallel file system and the Slurm scheduler. Simulations now finish overnight, and engineers can test more design options before building physical prototypes.

## Common mistakes

- Assuming more nodes always means faster results; some software does not scale well.
- Ignoring storage and network performance.
- No scheduler, leading to conflicts between users.

## Key takeaways

- HPC uses clusters, parallel computing, fast networks, schedulers and parallel storage.
- Performance is measured in FLOPS; the TOP500 ranks supercomputers.
- India's NSM and IndiaAI Mission are building national compute capacity.
""",
        """
AI and HPC deliver value when they solve real business problems. Knowing common use cases helps you start useful conversations with customers in different industries.

## Use cases by industry

- **Manufacturing:** visual inspection for defects, predictive maintenance of machines, engineering simulation.
- **Banking and insurance:** fraud detection, credit risk scoring, document processing and customer service assistants.
- **Healthcare:** medical image analysis support, hospital operations planning and genomics research.
- **Retail and e-commerce:** demand forecasting, recommendations and inventory optimisation.
- **Telecom:** network optimisation, predicting customer churn and automated support.
- **Government and education:** citizen service chatbots in Indian languages, research computing and weather and climate modelling.
- **Media:** content tagging, subtitles and translation.

## Generative AI use cases

- Assistants that answer questions from company documents using **retrieval-augmented generation (RAG),** which retrieves relevant documents and passes them to the language model.
- Drafting emails, reports and code.
- Summarising long documents, calls and meetings.
- Translation and transcription across Indian languages.

## Evaluating a use case

- Clear business value and a way to measure it.
- Availability and quality of data.
- Risks: privacy, bias, errors and regulatory requirements.
- Whether to use cloud AI services, on-premises infrastructure or both.

## Key terms

- **Predictive maintenance:** predicting equipment failures before they happen.
- **Computer vision:** AI that interprets images and video.
- **RAG:** retrieval-augmented generation.
- **Churn:** customers leaving a service.

## Real-world example

A cement company loses production when kiln motors fail without warning. Using sensor data on vibration and temperature, an ML model predicts failures days in advance. Maintenance is scheduled during planned stops, and unplanned downtime falls. The model runs on an on-premises server at the plant, with data shared with the cloud for retraining.

## Common mistakes

- Starting with technology rather than a business problem.
- Ignoring data quality and privacy.
- No way to measure success.

## Key takeaways

- AI and HPC have proven use cases in every major industry.
- Generative AI with RAG helps employees use company knowledge.
- Evaluate value, data, risk and deployment options before starting.
""",
        """
Discovery for AI and HPC projects explores the business goal, the data, the workloads and the constraints. Good questions avoid over- or under-sized infrastructure and failed projects.

## Questions about goals

- What business problem are you trying to solve, and how will you measure success?
- Who will use the results, and how?
- Is this a pilot, or are you planning production use?

## Questions about workloads

- Will you **train** models, run **inference,** or both?
- What models or software will you use: open-source models, commercial software or your own code?
- How large are the models and datasets?
- How many users or requests do you expect, and what response time is needed?
- For HPC: which applications, and how well do they scale across nodes?

## Questions about data

- Where is the data today, and how much is there?
- Is it sensitive or subject to regulations such as the DPDP Act?
- Can it go to the cloud, or must it stay on-premises?

## Questions about constraints

- What power, cooling and space are available?
- What skills does the team have in AI, Linux and cluster management?
- What budget and timeline?

## Key terms

- **Workload profile:** the type and scale of computing work.
- **Pilot:** a limited first project to prove value.
- **Data sovereignty:** requirements about where data is stored and processed.

## Real-world example

A university asks for "the biggest GPU server available". Discovery reveals that most researchers run small models and need many users to share resources fairly, while one group needs large-scale training a few times a year. The SI designs a shared cluster of mid-range GPU servers with a scheduler, plus a plan to use cloud GPUs for the occasional large training jobs. The university gets more value for its budget.

## Common mistakes

- Sizing hardware before understanding workloads.
- Ignoring power and cooling limits.
- Forgetting skills and operations.

## Key takeaways

- Ask about goals, workloads, data and constraints.
- Separate training from inference needs.
- Check power, cooling, skills and budget before designing.
""",
    ],
    "questions": [
        q("SINGLE", "What is inference?", ["Collecting data", "Using a trained model to make predictions on new data", "Building a data centre", "Buying GPUs"], ["Using a trained model to make predictions on new data"],
          explanation="Training learns from data; inference applies the model."),
        q("SINGLE", "Which is the correct relationship?", ["ML includes AI", "AI includes ML, which includes deep learning", "Deep learning includes AI", "They are unrelated"], ["AI includes ML, which includes deep learning"],
          explanation="Deep learning is a branch of ML, which is a branch of AI."),
        q("SINGLE", "Which list ranks the world's most powerful supercomputers?", ["MLPerf", "TOP500", "ISO 27001", "TIA-942"], ["TOP500"],
          explanation="The TOP500 uses the HPL benchmark and is published twice a year."),
        q("TRUE_FALSE", "RAG retrieves relevant documents and passes them to a language model to answer questions.", TF, ["True"],
          explanation="Retrieval-augmented generation grounds answers in company documents."),
        q("MULTIPLE", "Which are HPC cluster components?", ["Compute nodes", "Fast interconnect", "Job scheduler", "Fax machine"], ["Compute nodes", "Fast interconnect", "Job scheduler"],
          explanation="Clusters need nodes, networks, schedulers and parallel storage."),
        q("SINGLE", "Which discovery question best separates infrastructure needs?", ["What colour should the rack be?", "Will you train models, run inference, or both?", "Who is your favourite vendor?", "How many printers do you have?"], ["Will you train models, run inference, or both?"],
          explanation="Training and inference have very different requirements."),
        q("MATCHING", "Match each term to its meaning.", ["MPI=Standard for communication in parallel programs", "FLOPS=Floating-point operations per second", "Scheduler=Allocates cluster resources to jobs", "LLM=Large language model"],
          explanation="These are basic HPC and AI terms."),
    ],
    "sources": [TOP500, NSM, INDIAAI, NVIDIA_DLI, MS_LEARN],
}

COURSES["HPC, AI and ML Intermediate: Infrastructure for AI Workloads"] = {
    "lessons": [
        """
GPUs (graphics processing units) are the engine of modern AI. Their thousands of cores perform many calculations in parallel, which suits the matrix mathematics used in neural networks.

## Why GPUs for AI

- **Parallelism:** thousands of cores working at once.
- **Tensor cores / matrix engines:** specialised units for AI calculations.
- **High-bandwidth memory (HBM):** very fast memory attached to the GPU, essential for large models.
- **Software ecosystem:** platforms such as NVIDIA CUDA and AMD ROCm, used by frameworks such as PyTorch and TensorFlow.

## Important GPU specifications

- **GPU memory capacity:** decides how large a model fits on each GPU. For example, model weights in 16-bit precision need about 2 bytes per parameter, so a 70-billion-parameter model needs roughly 140 GB just for its weights, before other memory needs.
- **Memory bandwidth:** how fast data moves to the cores.
- **Compute performance:** at different precisions such as FP32, FP16, BF16 and FP8; lower precision is faster and uses less memory.
- **GPU-to-GPU interconnect:** high-speed links such as NVIDIA NVLink connect GPUs inside a server.
- **Power:** high-end data-centre GPUs can draw several hundred watts to over a kilowatt each.

## Other accelerators

Other options include AMD Instinct GPUs, Intel Gaudi accelerators and cloud-specific chips. The right choice depends on software support, performance, availability and cost.

## Key terms

- **GPU:** graphics processing unit, used as a parallel accelerator.
- **HBM:** high-bandwidth memory.
- **Precision:** the number format used, such as FP16 or FP8.
- **CUDA / ROCm:** GPU software platforms from NVIDIA / AMD.

## Real-world example

A company wants to run a 70-billion-parameter open-source language model internally. It plans to buy one GPU with 48 GB of memory. The SI explains that the model's weights alone need about 140 GB in 16-bit precision. Options include several larger-memory GPUs connected with a high-speed interconnect, a quantised version of the model using lower precision, or a smaller model. The customer chooses a quantised model on two GPUs after testing accuracy.

## Common mistakes

- Choosing GPUs by compute speed alone, ignoring memory.
- Ignoring software support for non-mainstream accelerators.
- Underestimating power needs.

## Key takeaways

- GPUs suit AI because of parallelism, tensor cores and high-bandwidth memory.
- GPU memory decides model size; about 2 bytes per parameter at 16-bit precision.
- Consider precision, interconnect, software support and power.
""",
        """
AI workloads fall into two broad types, with very different infrastructure needs: training and inference. Understanding the difference is essential for sizing.

## Training

- **What it is:** teaching a model from data, which may take hours to months.
- **Needs:** many GPUs working together, very fast GPU-to-GPU and node-to-node networking, high-throughput storage to feed data, and large power and cooling capacity.
- **Fine-tuning:** adapting an existing model to a specific task with less data and computing than training from scratch.
- **Pattern:** runs as large batch jobs, often scheduled.

## Inference

- **What it is:** using a trained model to answer requests.
- **Needs:** enough GPU memory to hold the model, enough throughput for the number of users, and low latency for interactive use.
- **Pattern:** runs continuously, often with variable demand during the day.
- **Optimisations:** quantisation (lower precision), batching of requests and efficient serving software.

## Key differences

- Training is usually the bigger short-term investment for model builders; inference often becomes the bigger long-term cost for organisations using models at scale.
- Many enterprises fine-tune or use existing models and focus on inference infrastructure.
- Inference may run at the edge, close to where data is created, such as in factories or stores.

## Key terms

- **Fine-tuning:** adapting a pre-trained model to a specific task.
- **Quantisation:** using lower-precision numbers to reduce memory and increase speed.
- **Batching:** processing several requests together for efficiency.
- **Latency:** time to respond to a request.

## Real-world example

A bank wants an internal assistant for 5,000 employees. It does not need to train a model from scratch. The SI proposes fine-tuning an existing open model on internal documents using a short GPU cluster job, then serving the model on inference servers sized for peak concurrent users, with quantisation and batching. The project costs far less than building training infrastructure.

## Common mistakes

- Buying training-scale infrastructure for an inference-only need.
- Sizing inference for average load instead of peaks.
- Ignoring latency requirements.

## Key takeaways

- Training needs many connected GPUs, fast networks and storage; inference needs memory, throughput and low latency.
- Many enterprises fine-tune existing models and focus on inference.
- Use quantisation and batching to make inference efficient.
""",
        """
GPUs are only as fast as the data and communication that feed them. Storage and networking are often the hidden bottlenecks in AI and HPC clusters.

## Networking for AI

- **Within a server:** GPU-to-GPU links such as NVLink.
- **Between servers:** high-bandwidth, low-latency fabrics, typically 400 Gbps or more per GPU in large training clusters.
- **InfiniBand:** a high-performance interconnect widely used in HPC and AI training.
- **Ethernet with RoCE (RDMA over Converged Ethernet):** an Ethernet-based option that supports remote direct memory access; industry groups such as the Ultra Ethernet Consortium are developing Ethernet for AI and HPC.
- **Topology:** non-blocking or low-oversubscription designs, such as fat-tree or rail-optimised layouts, so all GPUs can communicate at full speed.
- **Separate networks:** compute fabric, storage network and management network are often separated.

## Storage for AI

- **High throughput:** training reads large datasets repeatedly; slow storage leaves GPUs idle.
- **Parallel file systems:** such as Lustre, IBM Storage Scale and other high-performance file platforms, let many nodes read data at once.
- **NVMe flash:** fast local or shared storage for active data.
- **Tiering:** fast storage for active datasets and cheaper capacity storage or object storage for archives.
- **Checkpointing:** training jobs save checkpoints regularly; storage must absorb these large writes quickly.

## Key terms

- **InfiniBand:** a high-performance, low-latency interconnect.
- **RDMA / RoCE:** remote direct memory access / RDMA over Ethernet.
- **Parallel file system:** shared storage designed for many simultaneous clients.
- **Checkpoint:** a saved state of a training job for recovery.

## Real-world example

A research lab buys eight powerful GPU servers but connects them with a standard 10 Gbps network and a single NAS. GPU utilisation stays low because the GPUs wait for data and for each other. After the SI adds a 400 Gbps compute fabric and a parallel file system on NVMe, training jobs finish several times faster on the same GPUs.

## Common mistakes

- Spending on GPUs but not on network and storage.
- Using oversubscribed networks for training clusters.
- No plan for checkpoint storage.

## Key takeaways

- Use high-bandwidth, low-latency fabrics such as InfiniBand or RoCE Ethernet.
- Use parallel file systems and NVMe to keep GPUs fed.
- Separate compute, storage and management networks.
""",
        """
AI servers use far more power than traditional servers. A single 8-GPU training server can draw around 10 kW, and racks of such servers can exceed 40 kW or much more. Power and cooling often decide whether an AI project can be deployed at all.

## Power considerations

- **Server power:** check the manufacturer's maximum power, not just typical figures. For example, NVIDIA specifies a maximum of about 10.2 kW for a DGX H100 system.
- **Rack power:** traditional data centres often support 5 to 10 kW per rack; AI racks may need several times more.
- **Electrical infrastructure:** UPS capacity, distribution, three-phase rack PDUs and generator capacity.
- **Redundancy:** decide which AI workloads need full power redundancy; some training clusters accept less redundancy to reduce cost.

## Cooling options

- **Air cooling:** possible for moderate densities with good containment.
- **Rear-door heat exchangers:** remove heat at the rack.
- **Direct liquid cooling (DLC):** cold plates on GPUs and CPUs carry heat away with liquid; increasingly standard for high-end AI servers.
- **Immersion cooling:** servers submerged in special fluid.
- ASHRAE's TC 9.9 publishes guidance for liquid-cooled IT equipment as well as air-cooled environments.

## Planning steps

1. Get exact power and cooling specifications for the chosen servers.
2. Check current facility capacity: power per rack, total power, cooling and floor loading.
3. Choose a cooling approach and plan facility upgrades.
4. Consider colocation or cloud if the site cannot support the density.

## Key terms

- **Rack density:** power per rack, in kW.
- **Direct liquid cooling:** liquid-cooled cold plates on components.
- **Colocation:** renting space, power and cooling in a third-party data centre.

## Real-world example

A company orders four 8-GPU servers and plans to put them in its existing server room, designed for 6 kW per rack. Each server needs about 10 kW. The SI flags the problem before delivery and arranges space in a colocation data centre that supports high-density racks with liquid cooling. The servers go live on time without overheating.

## Common mistakes

- Ordering AI servers before checking facility capacity.
- Using typical rather than maximum power figures.
- Assuming air cooling will always be enough.

## Key takeaways

- AI servers can draw around 10 kW each; racks may exceed 40 kW.
- Check power, cooling and floor loading before ordering.
- Plan for liquid cooling or colocation where needed.
""",
    ],
    "questions": [
        q("SINGLE", "About how much memory do the weights of a 70-billion-parameter model need at 16-bit precision?", ["14 GB", "70 GB", "140 GB", "700 GB"], ["140 GB"],
          explanation="16-bit precision uses about 2 bytes per parameter: 70 billion × 2 bytes ≈ 140 GB."),
        q("SINGLE", "Which workload usually needs many connected GPUs, very fast networking and high-throughput storage?", ["Inference for a few users", "Large-scale training", "Email", "Printing"], ["Large-scale training"],
          explanation="Training large models is the most demanding workload."),
        q("TRUE_FALSE", "Quantisation uses lower-precision numbers to reduce memory use and speed up inference.", TF, ["True"],
          explanation="Accuracy should be tested after quantisation."),
        q("MULTIPLE", "Which are high-performance networking options for AI clusters?", ["InfiniBand", "Ethernet with RoCE", "NVLink within a server", "Serial RS-232"], ["InfiniBand", "Ethernet with RoCE", "NVLink within a server"],
          explanation="RS-232 is a slow serial control link."),
        q("SINGLE", "About how much maximum power can a single 8-GPU training server such as a DGX H100 draw?", ["500 W", "2 kW", "About 10 kW", "100 kW"], ["About 10 kW"],
          explanation="NVIDIA specifies about 10.2 kW maximum for a DGX H100."),
        q("TRUE_FALSE", "Slow storage can leave expensive GPUs idle during training.", TF, ["True"],
          explanation="Storage must feed data fast enough to keep GPUs busy."),
        q("MATCHING", "Match each term to its meaning.", ["HBM=Fast memory attached to the GPU", "Fine-tuning=Adapting a pre-trained model", "Checkpoint=Saved training state", "DLC=Liquid-cooled cold plates on components"],
          explanation="These terms appear in every AI infrastructure design."),
    ],
    "sources": [NVIDIA_DLI, MLCOMMONS, UEC, ASHRAE, PYTORCH],
}

COURSES["HPC, AI and ML Advanced: Solution Sizing and Design"] = {
    "lessons": [
        """
Cluster sizing turns workload requirements into a specific number of GPUs, servers and supporting infrastructure. Good sizing balances performance, cost and future growth.

## Sizing for training

- **Model size and precision:** decide GPU memory needs, including model weights, optimiser states and activations, which can be several times the size of the weights.
- **Dataset size and number of training runs:** determine total compute needed.
- **Target time to train:** how quickly results are needed; more GPUs shorten time if the software scales well.
- **Scaling efficiency:** adding GPUs rarely gives perfectly linear speed-up; communication overhead grows.
- **Benchmarks:** MLPerf Training results from MLCommons help compare systems on standard tasks.

## Sizing for inference

- **Model memory:** the model must fit in GPU memory, plus memory for the key-value cache that grows with conversation length and concurrent users in language models.
- **Throughput:** requests or tokens per second needed at peak.
- **Latency:** time to first token and time per token for interactive applications.
- **Concurrency:** number of simultaneous users.
- **Benchmarks and tests:** MLPerf Inference results and, best of all, tests with the customer's own model and prompts.

## Sizing for HPC

- Application scaling behaviour, memory per core, and input/output patterns.
- Licence costs for commercial software, which may be per core.

## Key terms

- **Scaling efficiency:** how well performance grows as resources are added.
- **Key-value (KV) cache:** memory used by language models during inference to store context.
- **Throughput / latency:** volume of work per second / time per response.
- **MLPerf:** industry benchmarks from MLCommons.

## Real-world example

A customer wants an internal chatbot for 2,000 employees, with up to 200 using it at the same time. The SI tests the chosen model on candidate GPUs, measuring tokens per second and latency at different concurrency levels. Results show that two servers with four GPUs each meet the peak load with headroom, while one larger server would struggle at peak. The sizing is based on measured data, not guesswork.

## Common mistakes

- Sizing training memory using only model weights.
- Sizing inference for average users instead of peak concurrency.
- Relying on vendor marketing numbers instead of tests.

## Key takeaways

- Training sizing depends on model, data, time to train and scaling efficiency.
- Inference sizing depends on memory, KV cache, throughput, latency and concurrency.
- Use benchmarks such as MLPerf and test with the customer's own workload.
""",
        """
Network and storage design for AI and HPC must match the compute design. An unbalanced design wastes expensive GPUs.

## Network design steps

1. **Choose the fabric:** InfiniBand or high-performance Ethernet with RoCE, based on scale, skills, existing standards and budget.
2. **Bandwidth per GPU:** large training clusters commonly use 400 Gbps or more per GPU for the compute fabric.
3. **Topology:** non-blocking fat-tree or rail-optimised designs for training; inference clusters can often use simpler designs.
4. **Separate networks:** compute, storage, in-band management and out-of-band management.
5. **Cabling and optics:** plan transceivers, cable types and lengths, which are a significant part of the cost.
6. **Growth:** design the fabric so more nodes can be added without rebuilding.

## Storage design steps

1. **Capacity:** datasets, checkpoints, models, and results, with growth.
2. **Throughput:** enough read bandwidth to keep GPUs busy, and write bandwidth for checkpoints.
3. **Tiers:** high-performance parallel file system on NVMe for active work; capacity or object storage for archives.
4. **Data protection:** backups or replicas for important datasets and models.
5. **Access:** support for the protocols and tools users need.

## Key terms

- **Fat-tree:** a non-blocking network topology common in clusters.
- **Rail-optimised:** a design where each GPU position connects to its own network "rail".
- **Oversubscription:** when total possible traffic exceeds uplink capacity.
- **Object storage:** scalable storage accessed through APIs, suited to archives and datasets.

## Real-world example

A design for a 32-node GPU training cluster originally includes an oversubscribed Ethernet network to save money. Simulations of the planned training jobs show that communication time would double. The SI revises the design to a non-blocking rail-optimised fabric and adds a parallel file system sized for checkpoint bursts. The higher network cost is justified by much shorter training times.

## Common mistakes

- Oversubscribed fabrics for training.
- Forgetting optics and cabling costs.
- Sizing storage capacity but not throughput.

## Key takeaways

- Choose the fabric and bandwidth per GPU, with non-blocking topology for training.
- Separate compute, storage and management networks.
- Size storage for both capacity and throughput, with tiers and protection.
""",
        """
Hardware alone does not make a usable AI or HPC platform. The software stack and job scheduling let users run work reliably, share resources fairly and keep the system secure.

## The software stack

- **Operating system:** usually Linux distributions supported by the hardware vendors.
- **Drivers and libraries:** GPU drivers, CUDA or ROCm, communication libraries and math libraries.
- **Containers:** packaging software and dependencies so they run consistently, using tools such as Docker-compatible runtimes or Apptainer in HPC.
- **Frameworks:** PyTorch, TensorFlow and JAX for AI; MPI-based applications for HPC.
- **Model serving:** inference servers that handle requests, batching and scaling.
- **MLOps tools:** experiment tracking, model registries and deployment pipelines.

## Scheduling and orchestration

- **Slurm:** a widely used open-source workload manager for HPC and AI training clusters. It queues jobs, allocates GPUs and enforces fair-share policies.
- **Kubernetes:** a container orchestration platform common for inference and MLOps, with GPU support through device plugins and operators.
- **Policies:** quotas, priorities and fair-share rules so that one user or project does not monopolise the cluster.

## Operations

- Monitor GPU utilisation, temperatures, errors and job efficiency.
- Keep drivers and firmware updated in tested combinations.
- Manage user access, secure data and log activity.

## Key terms

- **Container:** a packaged application with its dependencies.
- **Slurm:** an HPC and AI workload manager.
- **Kubernetes:** a container orchestration platform.
- **MLOps:** practices for deploying and operating ML models reliably.

## Real-world example

A university's GPU servers are shared by booking time on a spreadsheet. Some users hold GPUs for days without using them, while others wait. The SI deploys Slurm with fair-share policies and containerised software environments. GPU utilisation rises sharply, waiting times fall, and researchers stop fighting over machines.

## Common mistakes

- Installing software directly on hosts, causing version conflicts.
- No scheduler or fair-share policies.
- Not monitoring GPU utilisation.

## Key takeaways

- The stack includes OS, drivers, libraries, containers, frameworks, serving and MLOps.
- Use Slurm for batch training and HPC, Kubernetes for inference and MLOps.
- Monitor utilisation and enforce fair sharing.
""",
        """
An AI or HPC sizing proposal involves large investments. Presenting it clearly helps the customer understand what they are buying, why and what alternatives exist.

## What to include

- **Business goals and workloads:** what the customer wants to achieve and the workloads analysed.
- **Assumptions:** model sizes, users, datasets, growth and performance targets.
- **Sizing method:** how the numbers were calculated, including benchmark or test results.
- **Proposed architecture:** compute, network, storage, software stack and management, with a diagram.
- **Facilities:** power, cooling and space needs, and any upgrades required.
- **Options:** for example on-premises, colocation, cloud or hybrid; or different GPU models.
- **Costs:** capital and operating costs over several years, including power, support and staff.
- **Risks and mitigations:** supply lead times, skills, software compatibility and facility readiness.
- **Roadmap:** phases for deployment and growth.

## Presenting well

- Lead with goals and results, not part numbers.
- Explain assumptions openly and show how changes would affect the size.
- Compare options fairly, including cloud versus on-premises total cost.
- Offer a pilot or proof of concept to validate the sizing.

## Key terms

- **Assumption register:** a list of assumptions behind a design.
- **Sensitivity analysis:** showing how results change when assumptions change.
- **Lead time:** time from order to delivery, which can be long for high-demand GPUs.

## Real-world example

An SI presents an AI platform proposal to a research institute's board. It shows three options: buy and host on-premises with facility upgrades, host in a colocation centre, or use cloud GPUs. The five-year cost comparison shows on-premises is cheapest at high utilisation, but cloud is better if usage stays low. The board chooses colocation with a phased build, starting with a pilot to confirm usage.

## Common mistakes

- Hiding assumptions or presenting only one option.
- Ignoring facility upgrade costs and lead times.
- Overloading the presentation with technical details.

## Key takeaways

- Present goals, assumptions, method, architecture, facilities, options, costs, risks and roadmap.
- Be open about assumptions and show sensitivity.
- Compare deployment options fairly and offer a pilot.
""",
    ],
    "questions": [
        q("SINGLE", "When sizing GPU memory for training, what must be included beyond model weights?", ["Nothing else", "Optimiser states and activations", "Only the dataset size", "Printer memory"], ["Optimiser states and activations"],
          explanation="Training memory can be several times the size of the weights."),
        q("SINGLE", "Which industry benchmark suite is published by MLCommons?", ["TOP500", "MLPerf", "SPECpower", "PUE"], ["MLPerf"],
          explanation="MLPerf covers training and inference benchmarks."),
        q("TRUE_FALSE", "Inference sizing should be based on peak concurrent users, not average usage.", TF, ["True"],
          explanation="Peaks decide whether users get acceptable response times."),
        q("SINGLE", "Which tool is widely used to schedule jobs on HPC and AI training clusters?", ["Slurm", "Excel", "DHCP", "SNMP"], ["Slurm"],
          explanation="Slurm is a widely used open-source workload manager."),
        q("MULTIPLE", "Which should a sizing proposal include?", ["Assumptions", "Facility requirements", "Options such as cloud or on-premises", "Only part numbers"], ["Assumptions", "Facility requirements", "Options such as cloud or on-premises"],
          explanation="Part numbers alone do not explain value, risk or alternatives."),
        q("TRUE_FALSE", "Oversubscribed networks are ideal for large-scale training clusters.", TF, ["False"],
          explanation="Training needs non-blocking or low-oversubscription fabrics."),
        q("SHORT_ANSWER", "In two or three sentences, explain why testing with the customer's own model is better than relying on marketing figures.",
          explanation="Real performance depends on the specific model, precision, prompts and concurrency. Testing measures actual throughput and latency, so the sizing is based on evidence and avoids over- or under-buying."),
    ],
    "sources": [MLCOMMONS, SLURM, TOP500, NVIDIA_DLI, AWS_SKILL_BUILDER],
}
