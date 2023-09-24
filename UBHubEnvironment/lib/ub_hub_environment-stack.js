const path = require("path");
const cdk = require('aws-cdk-lib');
// const keypair = require("cdk-ec2-key-pair");
// const apigateway = require('aws-cdk-lib/aws-apigateway');
const elbv2 = require('aws-cdk-lib/aws-elasticloadbalancingv2');

class UbHubEnvironmentStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const subnetConfiguration = {
      name: "name",
      mapPublicIpOnLaunch: true,
    };

    const vpc = new cdk.aws_ec2.Vpc(this, "UBHubVpc", {
      cidr: '10.0.0.0/16',
      natGateways: 0,
      subnetConfiguration: [
        {name: 'public', cidrMask: 24, subnetType: cdk.aws_ec2.SubnetType.PUBLIC},
      ],
    });

    const cluster = new cdk.aws_ecs.Cluster(this, "UBHubCluster", {
      vpc: vpc
    });

    // Create a Key Pair to be used with this EC2 Instance
    // Temporarily disabled since `cdk-ec2-key-pair` is not yet CDK v2 compatible
    // const key = new keypair.KeyPair(this, "KeyPair", {
    //   name: "UBHub-cdk-keypair",
    //   description: "Key Pair created with UBHub CDK Deployment",
    // });
    // key.grantReadOnPublicKey

    const ami = new cdk.aws_ec2.AmazonLinuxImage({
      generation: cdk.aws_ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: cdk.aws_ec2.AmazonLinuxCpuType.X86_64,
    });

    const securityGroup = new cdk.aws_ec2.SecurityGroup(this, "UBHubSecurityGroup", {
      vpc,
      description: "Allow SSH (TCP port 22) and HTTP (TCP port 80) in",
      allowAllOutbound: true,
    });

    // Allow SSH access on port tcp/22
    securityGroup.addIngressRule(
        cdk.aws_ec2.Peer.anyIpv4(), // todo: do not allow any ssh in the world
        cdk.aws_ec2.Port.tcp(22),
        "Allow SSH Access"
    );

    // Allow HTTP access on port tcp/80
    securityGroup.addIngressRule(
        cdk.aws_ec2.Peer.anyIpv4(),
        cdk.aws_ec2.Port.tcp(80),
        "Allow HTTP Access"
    );

    // IAM role to allow access to other AWS services
    const role = new cdk.aws_iam.Role(this, "ec2Role", {
      assumedBy: new cdk.aws_iam.ServicePrincipal("ec2.amazonaws.com"),
    });

    // IAM policy attachment to allow access to
    role.addManagedPolicy(
        cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );

    const ec2Instance = new cdk.aws_ec2.Instance(this, "Instance", {
      vpc: vpc,
      vpcSubnets: {
        subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
      },
      instanceType: cdk.aws_ec2.InstanceType.of(
          cdk.aws_ec2.InstanceClass.T2,
          cdk.aws_ec2.InstanceSize.MICRO
      ),
      machineImage: ami,
      securityGroup: securityGroup,
      // keyName: key.keyPairName,
      role: role,
    });

    const autoScalingGroup = new cdk.aws_applicationautoscaling.(this, "loadBalancer", {
      vpc,
      instanceType
    });

    const loadBalancer = new cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer(this, "loadBalancer", {
          vpc,
          internet_facing: true,
        }
    );

    loadBalancer.add_target(autoScalingGroup);
    loadBalancer.addListener("listener", {
      port: 80
    });

    // Create an integration for the API Gateway to target the EC2 instance
    const ec2Integration = new apigateway.HttpIntegration(
        `http://${ec2Instance.instancePrivateIp}:80`
    );

    // Create a resource and method for the API Gateway
    const apiResource = ubhubApiGateway.root.addResource('ec2');
    apiResource.addMethod('GET', ec2Integration);

    // // Update security group to allow inbound traffic from API Gateway
    // securityGroup.addIngressRule(
    //     new ec2Instance.SecurityGroup(this, 'ApiGatewaySecurityGroupRule', {
    //       vpc,
    //       description: 'Allow HTTP traffic from API Gateway',
    //     }),
    //     ec2Instance.Port.tcp(80),
    //     'Allow API Gateway Access'
    // );

    // This is interesting:

    // const restapi = new apigw.RestApi(this, 'my-rest-api', {
    //   description: `test`,
    //   restApiName: `test-api`,
    //   endpointTypes: [apigw.EndpointType.REGIONAL],
    //   domainName: {
    //     securityPolicy: apigw.SecurityPolicy.TLS_1_2,
    //     domainName: `test-api.mydomain.com`,
    //     certificate: acm.Certificate.fromCertificateArn(
    //         this,'my-cert', myCertArn),
    //     endpointType: apigw.EndpointType.REGIONAL,
    //   },
    //   deployOptions: {
    //     stageName: 'qa'
    //   },
    // });
    // const hostedZone = route53.HostedZone.fromLookup(this, 'hosted-zone-lookup', {
    //   domainName: `mydomain.com`,
    // });
    // new route53.ARecord(this, 'api-gateway-route53', {
    //   recordName: `test-api.mydomain.com`,
    //   zone: hostedZone,
    //   target: route53.RecordTarget.fromAlias(new route53Targets.ApiGateway(restApi)),
    // });

    const zipFileName = "ubhubSourceZip";

    // upload to s3
    const ubHubNodeJsSourceCode = new cdk.aws_s3_assets.Asset(this, "ubHubNodeJsSourceCode", {
      path: path.join(__dirname, `../../nodeServer/${zipFileName}`),
    });

    ubHubNodeJsSourceCode.grantRead(role);

    const ubHubNodeJsSourceCodeFilePath = ec2Instance.userData.addS3DownloadCommand({
      bucket: ubHubNodeJsSourceCode.bucket,
      bucketKey: ubHubNodeJsSourceCode.s3ObjectKey,
    });

    const configScriptAsset = new cdk.aws_s3_assets.Asset(this, "ConfigScriptAsset", {
      path: path.join(__dirname, "../../nodeServer/configure_amz_linux_app.sh"),
    });

    configScriptAsset.grantRead(ec2Instance.role);

    const configScriptFilePath = ec2Instance.userData.addS3DownloadCommand({
      bucket: configScriptAsset.bucket,
      bucketKey: configScriptAsset.s3ObjectKey,
    });

    ec2Instance.userData.addExecuteFileCommand({
      filePath: configScriptFilePath,
      arguments: zipFileName,
    });

    // 👇 create an Output for the API URL
    new cdk.CfnOutput(this, 'apiUrl', {value: ubhubApiGateway.url});

    // Output the public IP address of the EC2 instance
    new cdk.CfnOutput(this, "IP Address", {
      value: ec2Instance.instancePublicIp,
    });

    // Command to download the SSH key
    new cdk.CfnOutput(this, "Download Key Command", {
      value:
          "aws secretsmanager get-secret-value --secret-id ec2-ssh-key/cdk-keypair/private --query SecretString --output text > cdk-key.pem && chmod 400 cdk-key.pem",
    });

    // Command to access the EC2 instance using SSH
    new cdk.CfnOutput(this, "ssh command", {
      value:
          "ssh -i cdk-key.pem -o IdentitiesOnly=yes ec2-user@" +
          ec2Instance.instancePublicIp,
    });

  }
}

module.exports = { UbHubEnvironmentStack }
