import * as cxapi from '@aws-cdk/cx-api';
import { DescribeVpcEndpointServicesCommand } from '@aws-sdk/client-ec2';
import { SdkProvider } from '../api/aws-auth/sdk-provider';
import { ContextProviderPlugin, Mode } from '../api/plugin';
import { debug } from '../logging';

/**
 * Plugin to retrieve the Availability Zones for an endpoint service
 */
export class EndpointServiceAZContextProviderPlugin implements ContextProviderPlugin {
  constructor(private readonly aws: SdkProvider) {}

  public async getValue(args: { [key: string]: any }) {
    const region = args.region;
    const account = args.account;
    const serviceName = args.serviceName;
    debug(`Reading AZs for ${account}:${region}:${serviceName}`);
    const options = { assumeRoleArn: args.lookupRoleArn };
    const ec2 = (
      await this.aws.forEnvironment(cxapi.EnvironmentUtils.make(account, region), Mode.ForReading, options)
    ).ec2();
    const command = new DescribeVpcEndpointServicesCommand({ ServiceNames: [serviceName] });
    const response = await ec2.send(command);

    // expect a service in the response
    if (!response.ServiceDetails || response.ServiceDetails.length === 0) {
      debug(`Could not retrieve service details for ${account}:${region}:${serviceName}`);
      return [];
    }
    const azs = response.ServiceDetails[0].AvailabilityZones;
    debug(`Endpoint service ${account}:${region}:${serviceName} is available in availability zones ${azs}`);
    return azs;
  }
}
