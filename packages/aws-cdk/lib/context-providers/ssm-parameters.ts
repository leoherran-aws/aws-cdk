import * as cxschema from '@aws-cdk/cloud-assembly-schema';
import * as cxapi from '@aws-cdk/cx-api';
import { GetParameterCommand, GetParameterCommandOutput } from '@aws-sdk/client-ssm';
import { SdkProvider } from '../api/aws-auth/sdk-provider';
import { ContextProviderPlugin, Mode } from '../api/plugin';
import { debug } from '../logging';

/**
 * Plugin to read arbitrary SSM parameter names
 */
export class SSMContextProviderPlugin implements ContextProviderPlugin {
  constructor(private readonly aws: SdkProvider) {}

  public async getValue(args: cxschema.SSMParameterContextQuery) {
    const region = args.region;
    const account = args.account;
    if (!('parameterName' in args)) {
      throw new Error('parameterName must be provided in props for SSMContextProviderPlugin');
    }
    const parameterName = args.parameterName;
    debug(`Reading SSM parameter ${account}:${region}:${parameterName}`);

    const response = await this.getSsmParameterValue(account, region, parameterName, args.lookupRoleArn);
    if (!response.Parameter || response.Parameter.Value === undefined) {
      throw new Error(`SSM parameter not available in account ${account}, region ${region}: ${parameterName}`);
    }
    return response.Parameter.Value;
  }

  /**
   * Gets the value of an SSM Parameter, while not throwin if the parameter does not exist.
   * @param account       the account in which the SSM Parameter is expected to be.
   * @param region        the region in which the SSM Parameter is expected to be.
   * @param parameterName the name of the SSM Parameter
   * @param lookupRoleArn the ARN of the lookup role.
   *
   * @returns the result of the ``GetParameter`` operation.
   *
   * @throws Error if a service error (other than ``ParameterNotFound``) occurs.
   */
  private async getSsmParameterValue(
    account: string,
    region: string,
    parameterName: string,
    lookupRoleArn?: string,
  ): Promise<GetParameterCommandOutput> {
    const options = { assumeRoleArn: lookupRoleArn };
    const ssm = (
      await this.aws.forEnvironment(cxapi.EnvironmentUtils.make(account, region), Mode.ForReading, options)
    ).ssm();
    try {
      const command = new GetParameterCommand({
        Name: parameterName,
      });
      return await ssm.send(command);
    } catch (e: any) {
      if (e.name === 'ParameterNotFound') {
        return { $metadata: {} };
      }
      throw e;
    }
  }
}
