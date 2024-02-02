import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecsp from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';

export class DeployStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "MyVpc", {
      maxAzs: 3 // Default is all AZs in region
    });

    const cluster = new ecs.Cluster(this, "MyCluster", {
      vpc: vpc
    });

    const imageAsset = new ecrAssets.DockerImageAsset(this, 'BlogImage', {
      directory: `${__dirname}/../..`,
    });

    // Create a load-balanced Fargate service and make it public
    new ecsp.ApplicationLoadBalancedFargateService(this, "MyFargateService", {
      cluster: cluster, // Required
      desiredCount: 1,
      cpu: 256,
      memoryLimitMiB: 512,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(imageAsset.repository),
      },
      publicLoadBalancer: true,
      circuitBreaker: { rollback: true }
    });
  }
}