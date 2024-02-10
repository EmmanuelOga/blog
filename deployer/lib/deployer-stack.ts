import * as cdk from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class DeployerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC');

    const role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    const instanceProfile = new iam.InstanceProfile(this, 'InstanceProfile', { role });

    const userData = ec2.UserData.forLinux();

    // Install Docker, add ec2-user to docker group, enable and start docker.
    userData.addCommands('yum update -y');
    userData.addCommands('yum install docker -y');
    userData.addCommands('usermod -a -G docker ec2-user');
    userData.addCommands('systemctl enable docker');
    userData.addCommands('systemctl start docker');

    // Install docker compose.
    userData.addCommands('curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose');
    userData.addCommands('chmod +x /usr/local/bin/docker-compose');

    // Nicety.. use starship prompt.
    userData.addCommands('curl -sS https://starship.rs/install.sh | sh');
    userData.addCommands('echo eval "$(starship init bash)" >> /etc/profile');

    const template = new ec2.LaunchTemplate(this, 'LaunchTemplate', {
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      instanceType: new ec2.InstanceType('t4g.nano'),
      securityGroup: new ec2.SecurityGroup(this, 'LaunchTemplateSG', {
        vpc: vpc,
      }),
      instanceProfile,
      userData,
    });

    const autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
      vpc,
      minCapacity: 1,
      maxCapacity: 1,
      desiredCapacity: 1,
      launchTemplate: template,
      ssmSessionPermissions: true,
    });
  }
}
