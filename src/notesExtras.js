// Visual extras layered on top of the notes in the database: diagrams,
// cheat-sheet tables and exam tips, keyed by topic id.
// Diagram spec: see components/Diagram.jsx. Tones: user, compute, storage, db,
// net, sec, int, ok, bad.

const n = (label, sub, tone) => ({ label, sub, tone });

export const NOTES_EXTRAS = {
  iam: {
    diagrams: [
      {
        title: "How IAM decides a request",
        layers: [["req"], ["deny"], ["guard"], ["allow"], ["ok"]],
        nodes: {
          req: n("Request", "user / role / service", "user"),
          deny: n("Explicit Deny?", "any policy → DENIED", "bad"),
          guard: n("SCP & boundary", "must also allow", "sec"),
          allow: n("Allow found?", "identity or resource policy", "int"),
          ok: n("Access granted", "default is implicit deny", "ok"),
        },
        edges: [["req", "deny"], ["deny", "guard", "no"], ["guard", "allow", "pass"], ["allow", "ok", "yes"]],
        caption: "Explicit Deny always wins. With no matching Allow, the answer is an implicit deny.",
      },
      {
        title: "Assuming a role with STS",
        layers: [["who"], ["sts"], ["creds"], ["res"]],
        nodes: {
          who: n("Caller", "user, EC2, Lambda", "user"),
          sts: n("AWS STS", "AssumeRole", "sec"),
          creds: n("Temporary creds", "key + secret + token", "int"),
          res: n("AWS resource", "S3, DynamoDB…", "storage"),
        },
        edges: [["who", "sts", "trusted"], ["sts", "creds"], ["creds", "res", "signed calls"]],
      },
    ],
    tables: [
      {
        title: "Credential lookup order (CLI / SDK)",
        head: ["#", "Source"],
        rows: [["1", "Command-line options"], ["2", "Environment variables"], ["3", "CLI credentials / config files"], ["4", "Container credentials (ECS task role)"], ["5", "Instance profile (EC2 role)"]],
      },
    ],
    tips: [
      "Never put access keys on EC2 — attach an IAM role (instance profile).",
      "Policy evaluation: explicit Deny → Allow → implicit Deny.",
      "Use `aws sts decode-authorization-message` to read encoded authorization failures.",
    ],
  },

  ec2: {
    tables: [
      {
        title: "Purchasing options",
        head: ["Option", "Best for", "Notes"],
        rows: [
          ["On-Demand", "Short, unpredictable workloads", "Pay per second, no commitment"],
          ["Reserved / Savings Plans", "Steady usage", "1 or 3 year commitment, up to ~72% off"],
          ["Spot", "Fault-tolerant, flexible jobs", "Up to 90% off, can be interrupted"],
          ["Dedicated Host", "Licensing / compliance", "Whole physical server"],
          ["Capacity Reservation", "Guaranteed capacity in an AZ", "Pay On-Demand rate whether used or not"],
        ],
      },
    ],
    tips: ["User data runs once, at first boot, as root.", "Instance metadata is at http://169.254.169.254/latest/meta-data/ (use IMDSv2 tokens)."],
  },

  "elb-asg": {
    diagrams: [
      {
        title: "Load balancer in front of an Auto Scaling group",
        layers: [["users"], ["alb"], ["a", "b", "c"]],
        nodes: {
          users: n("Users", "HTTPS", "user"),
          alb: n("ALB", "health checks, routing", "net"),
          a: n("EC2 · AZ-a", "", "compute"),
          b: n("EC2 · AZ-b", "", "compute"),
          c: n("EC2 · AZ-c", "scaled out", "compute"),
        },
        edges: [["users", "alb"], ["alb", "a"], ["alb", "b"], ["alb", "c", "", { dashed: true }]],
        caption: "The ASG replaces unhealthy instances and scales on CloudWatch metrics.",
      },
    ],
    tables: [
      {
        title: "Load balancer types",
        head: ["Type", "Layer", "Use it for"],
        rows: [
          ["ALB", "7 (HTTP/HTTPS/gRPC)", "Path/host routing, containers, Lambda targets"],
          ["NLB", "4 (TCP/UDP/TLS)", "Ultra-low latency, static/Elastic IP"],
          ["GWLB", "3 (GENEVE)", "Firewalls and inspection appliances"],
          ["CLB", "4 & 7", "Legacy — avoid for new work"],
        ],
      },
    ],
    tips: [
      "Client IP behind an ALB is in the X-Forwarded-For header.",
      "Sticky sessions use cookies (AWSALB / custom); connection draining = deregistration delay.",
    ],
  },

  s3: {
    diagrams: [
      {
        title: "S3 event notifications",
        layers: [["s3"], ["sns", "sqs", "fn", "eb"]],
        nodes: {
          s3: n("S3 bucket", "ObjectCreated…", "storage"),
          sns: n("SNS topic", "", "int"),
          sqs: n("SQS queue", "", "int"),
          fn: n("Lambda", "", "compute"),
          eb: n("EventBridge", "advanced filtering", "int"),
        },
        edges: [["s3", "sns"], ["s3", "sqs"], ["s3", "fn"], ["s3", "eb"]],
      },
      {
        title: "Pre-signed URL",
        layers: [["app"], ["s3"], ["url"], ["client"]],
        nodes: {
          app: n("Your backend", "has IAM permission", "compute"),
          s3: n("S3", "generate URL", "storage"),
          url: n("Pre-signed URL", "time-limited", "sec"),
          client: n("Client", "GET / PUT directly", "user"),
        },
        edges: [["app", "s3", "sign"], ["s3", "url"], ["url", "client", "hand over"]],
      },
    ],
    tables: [
      {
        title: "Storage classes",
        head: ["Class", "Access", "Min. duration"],
        rows: [
          ["Standard", "Frequent", "—"],
          ["Intelligent-Tiering", "Unknown / changing", "—"],
          ["Standard-IA / One Zone-IA", "Infrequent, rapid", "30 days"],
          ["Glacier Instant Retrieval", "Rare, milliseconds", "90 days"],
          ["Glacier Flexible Retrieval", "Archive, minutes–hours", "90 days"],
          ["Glacier Deep Archive", "Archive, up to 12h+", "180 days"],
        ],
      },
    ],
    tips: [
      "Multi-part upload is recommended above 100 MB and required above 5 GB.",
      "SSE-S3, SSE-KMS and SSE-C are server-side; with SSE-KMS watch KMS request quotas.",
      "S3 supports 3,500 PUT/POST/DELETE and 5,500 GET/HEAD requests per second per prefix.",
    ],
  },

  cloudfront: {
    diagrams: [
      {
        title: "CloudFront request flow",
        layers: [["user"], ["edge"], ["origin"]],
        nodes: {
          user: n("Viewer", "", "user"),
          edge: n("Edge location", "cache", "net"),
          origin: n("Origin", "S3 (OAC) / ALB / HTTP", "storage"),
        },
        edges: [["user", "edge", "request"], ["edge", "origin", "cache miss"]],
        caption: "A cache hit is answered at the edge. Restrict an S3 origin with Origin Access Control.",
      },
    ],
    tips: [
      "Use signed URLs for a single file; signed cookies for many files.",
      "Field-level encryption protects sensitive form fields at the edge.",
      "Invalidate cached objects with `/path/*` (cost applies) or version your file names.",
    ],
  },

  "rds-aurora": {
    diagrams: [
      {
        title: "Lazy loading (cache-aside) with ElastiCache",
        layers: [["app"], ["cache"], ["db"]],
        nodes: {
          app: n("Application", "", "compute"),
          cache: n("ElastiCache", "Redis / Memcached", "db"),
          db: n("RDS / Aurora", "source of truth", "db"),
        },
        edges: [["app", "cache", "1 · read"], ["cache", "db", "2 · miss"], ["db", "app", "3 · fill", { dashed: true }]],
        caption: "Write-through updates the cache on every write — fresher data, but more writes and a bigger cache.",
      },
    ],
    tables: [
      {
        title: "Redis vs Memcached",
        head: ["", "Redis", "Memcached"],
        rows: [
          ["Persistence / backup", "Yes", "No"],
          ["Replication / Multi-AZ", "Yes", "No"],
          ["Data types", "Rich (sets, sorted sets…)", "Simple key/value"],
          ["Multi-threaded", "No", "Yes"],
        ],
      },
    ],
    tips: ["Read Replicas are asynchronous (eventual consistency); Multi-AZ is synchronous and for failover only.", "IAM database authentication gives 15-minute tokens instead of passwords."],
  },

  lambda: {
    diagrams: [
      {
        title: "Ways Lambda gets invoked",
        layers: [["sync", "async", "poll"], ["fn"], ["out"]],
        nodes: {
          sync: n("Synchronous", "API Gateway, ALB, SDK", "user"),
          async: n("Asynchronous", "S3, SNS, EventBridge", "int"),
          poll: n("Event source mapping", "SQS · Kinesis · DDB Streams", "db"),
          fn: n("Lambda function", "", "compute"),
          out: n("Destinations / DLQ", "on failure or success", "sec"),
        },
        edges: [["sync", "fn", "waits"], ["async", "fn", "retried ×2"], ["poll", "fn", "polls"], ["fn", "out", "", { dashed: true }]],
      },
    ],
    tables: [
      {
        title: "Key limits",
        head: ["Setting", "Limit"],
        rows: [
          ["Memory", "128 MB – 10,240 MB (CPU scales with memory)"],
          ["Timeout", "Up to 15 minutes"],
          ["/tmp storage", "512 MB – 10,240 MB"],
          ["Env variables", "4 KB total"],
          ["Deployment package", "50 MB zipped / 250 MB unzipped (10 GB container image)"],
          ["Sync payload", "6 MB request / response"],
          ["Account concurrency", "1,000 by default (soft limit)"],
        ],
      },
    ],
    tips: [
      "Reduce cold starts with Provisioned Concurrency; initialise SDK clients outside the handler.",
      "A Lambda in a VPC needs a NAT gateway (or VPC endpoints) to reach the internet / AWS APIs.",
      "Use versions + aliases (with weighted routing) for canary releases.",
    ],
  },

  dynamodb: {
    diagrams: [
      {
        title: "DynamoDB Streams",
        layers: [["app"], ["table"], ["stream"], ["fn"], ["sink"]],
        nodes: {
          app: n("App writes", "", "compute"),
          table: n("DynamoDB table", "", "db"),
          stream: n("Stream", "24h of changes", "int"),
          fn: n("Lambda", "", "compute"),
          sink: n("Downstream", "SNS · OpenSearch · S3", "storage"),
        },
        edges: [["app", "table"], ["table", "stream", "changes"], ["stream", "fn"], ["fn", "sink"]],
      },
    ],
    tables: [
      {
        title: "Capacity math",
        head: ["Unit", "Equals"],
        rows: [
          ["1 RCU", "1 strongly consistent read/s of up to 4 KB (2 eventually consistent)"],
          ["1 WCU", "1 write/s of up to 1 KB"],
          ["Transactional", "Costs 2× (2 RCU / 2 WCU per item)"],
        ],
      },
      {
        title: "Indexes",
        head: ["", "LSI", "GSI"],
        rows: [
          ["Partition key", "Same as base table", "Any attribute"],
          ["Created", "Only at table creation", "Any time"],
          ["Capacity", "Shares table capacity", "Own RCU/WCU"],
          ["Consistency", "Strong or eventual", "Eventual only"],
        ],
      },
    ],
    tips: [
      "Query is efficient; Scan reads the whole table — prefer Query and use pagination / parallel scan carefully.",
      "ProvisionedThroughputExceededException → exponential backoff; fix hot partitions.",
      "Use TTL for free expiry, DAX for microsecond read caching, conditional writes for optimistic locking.",
    ],
  },

  "api-gateway": {
    diagrams: [
      {
        title: "API Gateway request path",
        layers: [["client"], ["apigw"], ["auth"], ["back"]],
        nodes: {
          client: n("Client", "", "user"),
          apigw: n("API Gateway", "throttle · cache · validate", "net"),
          auth: n("Authorizer", "Cognito / Lambda / IAM", "sec"),
          back: n("Backend", "Lambda · HTTP · AWS service", "compute"),
        },
        edges: [["client", "apigw"], ["apigw", "auth", "authenticate"], ["auth", "back", "integration"]],
      },
    ],
    tables: [
      {
        title: "Endpoint types",
        head: ["Type", "Use it for"],
        rows: [
          ["Edge-optimized (default)", "Global clients — requests routed via CloudFront"],
          ["Regional", "Clients in the same Region"],
          ["Private", "Access only from a VPC through an interface endpoint"],
        ],
      },
    ],
    tips: [
      "429 = throttled; 502 = bad Lambda response; 504 = integration timeout (29 s max).",
      "Stages + stage variables handle dev / test / prod; canary deployments split a % of traffic.",
      "Enable CORS on the API when browsers call it from another origin.",
    ],
  },

  "sqs-sns-kinesis": {
    diagrams: [
      {
        title: "SNS → SQS fan-out",
        layers: [["pub"], ["topic"], ["q1", "q2", "fn"]],
        nodes: {
          pub: n("Publisher", "", "compute"),
          topic: n("SNS topic", "", "int"),
          q1: n("SQS · orders", "", "int"),
          q2: n("SQS · analytics", "", "int"),
          fn: n("Lambda", "email", "compute"),
        },
        edges: [["pub", "topic"], ["topic", "q1"], ["topic", "q2"], ["topic", "fn"]],
        caption: "One message, many independent consumers — each queue scales and fails on its own.",
      },
    ],
    tables: [
      {
        title: "SQS Standard vs FIFO",
        head: ["", "Standard", "FIFO"],
        rows: [
          ["Throughput", "Nearly unlimited", "300 msg/s (3,000 with batching); higher with high-throughput mode"],
          ["Ordering", "Best-effort", "Strict, per message group"],
          ["Delivery", "At-least-once", "Exactly-once (dedup 5 min)"],
          ["Name", "Any", "Must end in .fifo"],
        ],
      },
      {
        title: "Kinesis family",
        head: ["Service", "Purpose"],
        rows: [
          ["Data Streams", "Real-time ingest; 1 MB/s or 1,000 rec/s per shard in, 2 MB/s out"],
          ["Data Firehose", "Near-real-time delivery to S3 / Redshift / OpenSearch"],
          ["Managed Service for Apache Flink", "Real-time SQL / stream analytics"],
        ],
      },
    ],
    tips: [
      "Visibility timeout (default 30 s) hides a message while it's processed; use long polling to cut empty receives.",
      "Failed messages → dead-letter queue (set maxReceiveCount). Max SQS message size is 256 KB.",
      "Same partition key → same shard → ordering in Kinesis.",
    ],
  },

  "ecs-ecr": {
    diagrams: [
      {
        title: "Container delivery path",
        layers: [["dev"], ["ecr"], ["ecs"], ["run"]],
        nodes: {
          dev: n("Docker build", "docker push", "user"),
          ecr: n("Amazon ECR", "image registry", "storage"),
          ecs: n("ECS service", "task definition", "compute"),
          run: n("Fargate / EC2", "running tasks", "compute"),
        },
        edges: [["dev", "ecr", "push"], ["ecr", "ecs", "pull"], ["ecs", "run", "schedule"]],
      },
    ],
    tips: [
      "Give containers AWS access with a Task Role (not the EC2 instance role).",
      "Fargate = serverless containers; EC2 launch type = you manage the instances.",
      "Dynamic port mapping lets several tasks of one service share a host behind an ALB.",
    ],
  },

  beanstalk: {
    tables: [
      {
        title: "Deployment policies",
        head: ["Policy", "Downtime", "Extra cost", "Rollback"],
        rows: [
          ["All at once", "Yes", "None", "Redeploy"],
          ["Rolling", "No (reduced capacity)", "None", "Redeploy"],
          ["Rolling + additional batch", "No (full capacity)", "Small", "Redeploy"],
          ["Immutable", "No", "High (double instances)", "Fast — terminate new"],
          ["Traffic splitting", "No", "High", "Fast — reroute"],
          ["Blue/Green", "No", "High", "Fast — swap URLs"],
        ],
      },
    ],
    tips: ["Customise the environment with .ebextensions/*.config files in the source bundle.", "Blue/green is a manual CNAME swap, not a built-in deployment policy."],
  },

  cicd: {
    diagrams: [
      {
        title: "CodePipeline: source → production",
        layers: [["src"], ["build"], ["test"], ["deploy"], ["target"]],
        nodes: {
          src: n("Source", "CodeCommit / GitHub / S3", "storage"),
          build: n("Build", "CodeBuild · buildspec.yml", "compute"),
          test: n("Test", "CodeBuild / manual approval", "int"),
          deploy: n("Deploy", "CodeDeploy · appspec.yml", "net"),
          target: n("Targets", "EC2 · Lambda · ECS", "compute"),
        },
        edges: [["src", "build", "commit"], ["build", "test", "artifact"], ["test", "deploy"], ["deploy", "target"]],
        caption: "Each stage hands an artifact (stored in S3) to the next one.",
      },
    ],
    tables: [
      {
        title: "CodeDeploy lifecycle hooks (EC2 / on-premises)",
        head: ["Order", "Hook"],
        rows: [
          ["1", "ApplicationStop"], ["2", "DownloadBundle"], ["3", "BeforeInstall"],
          ["4", "Install"], ["5", "AfterInstall"], ["6", "ApplicationStart"], ["7", "ValidateService"],
        ],
      },
    ],
    tips: [
      "buildspec.yml (CodeBuild) lives at the repo root: phases install → pre_build → build → post_build, then artifacts.",
      "appspec.yml tells CodeDeploy where files go and which hooks to run; the CodeDeploy agent must be installed on EC2.",
      "In-place updates instances where they are; blue/green launches a new fleet and shifts traffic.",
    ],
  },

  cloudformation: {
    diagrams: [
      {
        title: "Stack lifecycle",
        layers: [["tpl"], ["stack"], ["cs"], ["res"]],
        nodes: {
          tpl: n("Template", "YAML / JSON in S3", "storage"),
          stack: n("Stack", "create / update", "int"),
          cs: n("Change set", "preview the diff", "sec"),
          res: n("AWS resources", "rollback on failure", "compute"),
        },
        edges: [["tpl", "stack"], ["stack", "cs", "update"], ["cs", "res", "execute"]],
      },
    ],
    tables: [
      {
        title: "Template sections & intrinsic functions",
        head: ["Item", "Purpose"],
        rows: [
          ["Resources", "The only required section"],
          ["Parameters / Mappings / Conditions", "Inputs, lookup tables, conditional creation"],
          ["Outputs + Export", "Share values; import with Fn::ImportValue"],
          ["!Ref · !GetAtt · !Sub · !FindInMap", "Reference, attribute, substitute, lookup"],
        ],
      },
    ],
    tips: ["DeletionPolicy: Retain / Snapshot protects resources when a stack is deleted.", "StackSets deploy one template to multiple accounts and Regions.", "Drift detection finds manual changes made outside CloudFormation."],
  },

  monitoring: {
    diagrams: [
      {
        title: "Observability at a glance",
        layers: [["app"], ["cw", "xr", "ct"], ["act"]],
        nodes: {
          app: n("Your workload", "", "compute"),
          cw: n("CloudWatch", "metrics · logs · alarms", "int"),
          xr: n("X-Ray", "traces & service map", "net"),
          ct: n("CloudTrail", "who called which API", "sec"),
          act: n("Act", "SNS · Auto Scaling", "ok"),
        },
        edges: [["app", "cw"], ["app", "xr"], ["app", "ct"], ["cw", "act", "alarm"]],
      },
    ],
    tables: [
      {
        title: "Which service?",
        head: ["Question", "Use"],
        rows: [
          ["How is it performing? Alert me.", "CloudWatch metrics + alarms"],
          ["What did the app log?", "CloudWatch Logs"],
          ["Where is the latency in a request?", "X-Ray"],
          ["Who changed this resource?", "CloudTrail"],
        ],
      },
    ],
    tips: [
      "Standard metrics are 1 minute (EC2 basic = 5 min); high-resolution custom metrics go to 1 second.",
      "Custom metrics (e.g. memory) need the CloudWatch agent or PutMetricData.",
      "X-Ray: instrument with the SDK, run the daemon, annotations are indexed, metadata isn't.",
    ],
  },

  kms: {
    diagrams: [
      {
        title: "Envelope encryption",
        layers: [["app"], ["kms"], ["keys"], ["enc"]],
        nodes: {
          app: n("Application", "GenerateDataKey", "compute"),
          kms: n("KMS key", "never leaves KMS", "sec"),
          keys: n("Data key", "plaintext + encrypted copy", "int"),
          enc: n("Stored output", "ciphertext + encrypted key", "storage"),
        },
        edges: [["app", "kms", "request"], ["kms", "keys"], ["keys", "enc", "encrypt"]],
        caption: "To decrypt, the app sends the encrypted data key to KMS (Decrypt) and uses the returned plaintext key.",
      },
    ],
    tables: [
      {
        title: "Key types",
        head: ["Type", "Notes"],
        rows: [
          ["AWS owned", "Invisible and free"],
          ["AWS managed (aws/service)", "Free, rotated every year automatically"],
          ["Customer managed", "$1 / month, optional rotation, custom key policy"],
        ],
      },
    ],
    tips: [
      "Encrypt / Decrypt API handles up to 4 KB — use GenerateDataKey (envelope) for more.",
      "KMS keys are Region-bound; copying encrypted snapshots across Regions needs re-encryption.",
      "ThrottlingException on KMS → exponential backoff, request quota increase, or use data-key caching.",
    ],
  },

  sam: {
    diagrams: [
      {
        title: "SAM workflow",
        layers: [["tpl"], ["build"], ["pkg"], ["cfn"]],
        nodes: {
          tpl: n("template.yaml", "Transform: AWS::Serverless", "storage"),
          build: n("sam build", "", "compute"),
          pkg: n("sam package / deploy", "upload artifacts to S3", "int"),
          cfn: n("CloudFormation", "expands to full resources", "net"),
        },
        edges: [["tpl", "build"], ["build", "pkg"], ["pkg", "cfn"]],
      },
    ],
    tips: [
      "Serverless resource types: Function, Api, HttpApi, SimpleTable, LayerVersion, Application, StateMachine.",
      "`sam local invoke` / `sam local start-api` test functions locally with Docker.",
      "SAM Accelerate (`sam sync`) pushes code changes quickly during development.",
    ],
  },

  cognito: {
    diagrams: [
      {
        title: "User pool + identity pool",
        layers: [["user"], ["pool"], ["idp"], ["aws"]],
        nodes: {
          user: n("User", "", "user"),
          pool: n("User pool", "sign-up / sign-in → JWT", "sec"),
          idp: n("Identity pool", "swap token for AWS creds", "int"),
          aws: n("AWS services", "S3 · DynamoDB", "storage"),
        },
        edges: [["user", "pool", "authenticate"], ["pool", "idp", "ID token"], ["idp", "aws", "temp creds"]],
        caption: "User pools prove who you are; identity pools decide what AWS resources you can reach.",
      },
    ],
    tips: [
      "API Gateway can use a Cognito user pool authorizer directly (validates the JWT).",
      "Identity pools support guests (unauthenticated) and social / SAML / OIDC providers.",
      "Lambda triggers let you customise sign-up, auth challenges and tokens.",
    ],
  },
};
