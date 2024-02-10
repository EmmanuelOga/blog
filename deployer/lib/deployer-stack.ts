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

    const securityGroup = new ec2.SecurityGroup(this, 'LaunchTemplateSG', { vpc: vpc, });

    const autoScalingGroup = new autoscaling.AutoScalingGroup(this, 'AutoScalingGroup', {
      vpc,
      role,
      securityGroup,

      // We can connect to the machine through SSM, without opening port 22.
      // Add the following configuration in .ssh/config, then connect with `ssh i-*`, where i-* is the instance id.
      // Also make sure your are using your own key pair, i'm using id_ed25519 and id_ed25519.pub here.
      // See: https://cloudonaut.io/connect-to-your-ec2-instance-using-ssh-the-modern-way/ for more information.
      /*
      # SSH AWS instance over Session Manager.
      host i-*
        IdentityFile ~/.ssh/id_ed25519
        User ec2-user
        ProxyCommand sh -c "aws ec2-instance-connect send-ssh-public-key --instance-id %h --instance-os-user %r --ssh-public-key 'file://~/.ssh/id_ed25519.pub' --availability-zone '$(aws ec2 describe-instances --instance-ids %h --query 'Reservations[0].Instances[0].Placement.AvailabilityZone' --output text)' && aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"
      */
      ssmSessionPermissions: true,

      instanceType: new ec2.InstanceType('t4g.nano'),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({ cpuType: ec2.AmazonLinuxCpuType.ARM_64 }),

      // Cluster size.
      minCapacity: 1,
      maxCapacity: 1,
      desiredCapacity: 1,

      // How long to CloudFormation wait for the signals to be completed.
      signals: autoscaling.Signals.waitForAll({
        timeout: cdk.Duration.minutes(5),
      }),
    });

    // Install docker-compose, which is not available in the Amazon Linux 2 repositories.
    // https://docs.docker.com/compose/install/linux/#install-the-plugin-manually
    const composeInstallPath = '/usr/local/lib/docker/cli-plugins/';

    // Instead of userData, use cloud formation helper functions to configure the instance.
    // The userData will be filled by CDK to run the CloudFormationInit helper functions.
    // This enables nice features like logging and error handling, and waiting for services to start.
    const init = ec2.CloudFormationInit.fromElements(
      // Instal docker and enable the service. Add the ec2-user to the docker group.
      ec2.InitPackage.yum('docker'),
      ec2.InitUser.fromName('ec2-user', { groups: ['docker'] }),
      ec2.InitService.enable('docker', { enabled: true, ensureRunning: true, serviceManager: ec2.ServiceManager.SYSTEMD }),

      // Docker.
      ec2.InitCommand.shellCommand('mkdir -p ' + composeInstallPath),
      ec2.InitCommand.shellCommand('curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m) -o ' + composeInstallPath + 'docker-compose'),
      ec2.InitCommand.shellCommand('chmod +x ' + composeInstallPath + 'docker-compose'),

      // Setup a fancy prompt for all users.
      ec2.InitCommand.shellCommand('curl -s https://ohmyposh.dev/install.sh | bash -s'),
      ec2.InitFile.fromString('/etc/profile.d/prompt.sh', 'eval "$(oh-my-posh init bash)"'),
    );

    autoScalingGroup.applyCloudFormationInit(init, {
      printLog: true,
      ignoreFailures: true,
    });
  }
}
