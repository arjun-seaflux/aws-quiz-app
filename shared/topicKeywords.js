// Maps a note topic id to a keyword pattern. Used on the client to link a
// question to the notes ("Study this topic") and on the server for topic practice.
// Patterns are written with JS syntax; the server converts \b to Postgres \y.
export const TOPIC_KEYWORDS = {
  iam: "\\biam\\b|identity and access|assume ?role|\\bsts\\b|permission boundar|access key|inline policy|managed policy",
  ec2: "\\bec2\\b|instance profile|user data|\\bami\\b|spot instance|placement group|\\bebs\\b|instance store|metadata",
  "elb-asg": "load balancer|\\balb\\b|\\bnlb\\b|auto ?scaling|\\basg\\b|target group|sticky session|connection draining",
  s3: "\\bs3\\b|bucket|pre-?signed|glacier|multi-?part|object lock|lifecycle rule",
  cloudfront: "cloudfront|edge location|global accelerator|origin access|signed cookie",
  "rds-aurora": "\\brds\\b|aurora|elasticache|read replica|memcached|redis|lazy loading|write.through",
  lambda: "lambda|cold start|provisioned concurrency|event source mapping|execution role|\\blayers?\\b",
  dynamodb: "dynamodb|dynamo ?db|\\bgsi\\b|\\blsi\\b|partition key|sort key|\\bdax\\b|read capacity|write capacity|\\bttl\\b",
  "api-gateway": "api gateway|usage plan|stage variable|\\bcors\\b|authorizer|throttl",
  "sqs-sns-kinesis": "\\bsqs\\b|\\bsns\\b|kinesis|dead.letter|visibility timeout|\\bfifo\\b|long polling|fan.?out",
  "ecs-ecr": "\\becs\\b|\\becr\\b|fargate|container|task definition|docker",
  beanstalk: "beanstalk|\\.ebextensions|elastic beanstalk",
  cicd: "codepipeline|codebuild|codedeploy|codecommit|appspec|buildspec|ci/cd|codeartifact",
  cloudformation: "cloudformation|stack ?sets?|change set|\\bcfn\\b|intrinsic function|drift",
  monitoring: "cloudwatch|x-?ray|cloudtrail|\\balarms?\\b|custom metric|log group|tracing",
  kms: "\\bkms\\b|envelope encryption|customer master|\\bcmk\\b|data key|encrypt",
  sam: "\\bsam\\b|serverless application model|sam (cli|template)",
  cognito: "cognito|user pool|identity pool",
  "step-functions": "step functions|state machine|appsync|graphql",
  "advanced-identity": "directory service|\\bsso\\b|single sign|secrets manager|parameter store|\\bssm\\b|\\bsaml\\b|\\boidc\\b|federat",
};

/** Up to `max` topic ids whose keywords appear most in the text. */
export function matchTopics(text, max = 2) {
  const t = String(text || "");
  return Object.entries(TOPIC_KEYWORDS)
    .map(([id, src]) => [id, (t.match(new RegExp(src, "gi")) || []).length])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([id]) => id);
}

/** Postgres ARE flavour of a topic pattern (\b → \y). */
export const pgPattern = (id) => (TOPIC_KEYWORDS[id] || "").replace(/\\b/g, "\\y");
