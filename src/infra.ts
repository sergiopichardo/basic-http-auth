import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cloudfrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

interface WebsiteStackProps extends cdk.StackProps {
  appName: string;
  cloudFrontFunctionPath: string;
  websitePath: string;
}


export class WebsiteStack extends cdk.Stack {
  public readonly websiteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    super(scope, id, props);

    this.websiteBucket = this._originBucket({
      appName: props.appName,
    });

    // Create Basic Auth function
    const authFunction = this._authFunction({
      appName: props.appName,
      filePath: props.cloudFrontFunctionPath,
    });

    // Create CloudFront distribution
    this.distribution = this._cloudfrontDistribution({
      appName: props.appName,
      authFunction,
    });

    this._websiteDeployment({
      appName: props.appName,
      websitePath: props.websitePath,
    });

    // Output the CloudFront URL
    new cdk.CfnOutput(this, 'distributionDomainName', {
      value: this.distribution.distributionDomainName,
      exportName: `distributionDomainName`,
    });

    new cdk.CfnOutput(this, 'websiteBucketName', {
      value: this.websiteBucket.bucketName,
      exportName: `websiteBucketName`,
    });

    new cdk.CfnOutput(this, 'cloudFrontDistributionId', {
      value: this.distribution.distributionId,
      exportName: `cloudFrontDistributionId`,
    });
  }

  private _originBucket(props: {
    appName: string;
  }): s3.Bucket {
    return new s3.Bucket(this, `${props.appName}WebsiteBucket`, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }

  private _authFunction(props: {
    appName: string;
    filePath: string;
  }): cloudfront.Function {

    return new cloudfront.Function(this, `${props.appName}AuthFunction`, {
      code: cloudfront.FunctionCode.fromFile({
        filePath: props.filePath,
      }),
    });
  }

  private _cloudfrontDistribution(props: {
    appName: string;
    authFunction: cloudfront.Function;
  }): cloudfront.Distribution {
    return new cloudfront.Distribution(this, `${props.appName}Distribution`, {
      defaultBehavior: {
        origin: cloudfrontOrigins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket),
        functionAssociations: [{
          function: props.authFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST
        }],
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
    });
  }

  private _websiteDeployment(props: {
    appName: string;
    websitePath: string;
  }): s3deploy.BucketDeployment {
    return new s3deploy.BucketDeployment(this, `${props.appName}WebsiteDeployment`, {
      sources: [s3deploy.Source.asset(props.websitePath)],
      distribution: this.distribution,
      distributionPaths: ["/*"],
      destinationBucket: this.websiteBucket,
      retainOnDelete: false,
    });
  }
}