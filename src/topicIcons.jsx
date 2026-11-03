import {
  ShieldCheck, Server, Scale, Archive, Globe, Database, Zap, Table2, Waypoints, MessagesSquare,
  Container, Sprout, GitBranch, Layers, Activity, KeyRound, Puzzle, UserRound, Shuffle, Fingerprint, BookOpen,
} from "lucide-react";

const ICONS = {
  iam: ShieldCheck, ec2: Server, "elb-asg": Scale, s3: Archive, cloudfront: Globe, "rds-aurora": Database,
  lambda: Zap, dynamodb: Table2, "api-gateway": Waypoints, "sqs-sns-kinesis": MessagesSquare,
  "ecs-ecr": Container, beanstalk: Sprout, cicd: GitBranch, cloudformation: Layers, monitoring: Activity,
  kms: KeyRound, sam: Puzzle, cognito: UserRound, "step-functions": Shuffle, "advanced-identity": Fingerprint,
};

export function TopicIcon({ id, size = 24 }) {
  const Icon = ICONS[id] ?? BookOpen;
  return <Icon size={size} strokeWidth={1.9} />;
}
