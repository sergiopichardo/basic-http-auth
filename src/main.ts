#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { WebsiteStack } from './infra';

const app = new cdk.App();

new WebsiteStack(app, 'BasicAuthWebsiteStack', {
  appName: 'BasicAuthWebsite',
  cloudFrontFunctionPath: path.join(__dirname, '..', 'cloudfront-functions', 'basic-http-auth.js'),
  websitePath: path.join(__dirname, './static-site'),
});
