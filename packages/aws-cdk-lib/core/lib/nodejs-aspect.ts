import { Construct, IConstruct } from 'constructs';
import { IAspect, Aspects } from './aspect';
import * as cdk from '../../../aws-cdk-lib';
import * as lambda from '../../aws-lambda';
import { ReceiptRuleSet } from '../../aws-ses/lib/receipt-rule-set';
import { Provider } from '../../custom-resources/lib';

/**
 * Runtime aspec
 */
abstract class RuntimeAspectsBase implements IAspect {

  /**
   * The string key for the runtime
   */
  public readonly runtime: string;

  constructor(runtime: string) {
    this.runtime = runtime;
  }

  public visit(construct: IConstruct): void {

    //To handle custom providers
    if (construct instanceof cdk.CustomResourceProviderBase) {
      this.handleCustomResourceProvider(construct);
    }

    //To handle providers
    if (construct instanceof Provider) {
      this.handleProvider(construct);
    }

    //To handle single Function case
    if (construct instanceof ReceiptRuleSet) {
      this.handleReceiptRuleSet(construct);
    }
  }

  private handleCustomResourceProvider(provider: cdk.CustomResourceProviderBase): void {
    const node = provider as cdk.CustomResourceProviderBase;
    // only replace for nodejs case
    if (this.isValidRuntime(node.runtime)) {
      const targetnode = node.node.children.find((child) => child instanceof cdk.CfnResource &&
      child.cfnResourceType === 'AWS::Lambda::Function') as cdk.CfnResource;
      targetnode.addPropertyOverride('Runtime', 'nodejs20.x');
    }
  }

  private handleProvider(provider: Provider): void {
    const functionNodes = provider.node.children.filter((child) => child instanceof lambda.Function);
    for ( var node of functionNodes) {
      const targetNode = node.node.children.find((child) => child instanceof cdk.CfnResource && child.cfnResourceType === 'AWS::Lambda::Function') as lambda.CfnFunction;
      if (targetNode.runtime && this.isValidRuntime(targetNode.runtime)) {
        targetNode.runtime = lambda.Runtime.NODEJS_20_X.toString();
      }

      // onEvent Handlers
      const onEventHandler = provider.onEventHandler as lambda.Function;
      const onEventHandlerRuntime = onEventHandler.node.children.find((child) => child instanceof cdk.CfnResource && child.cfnResourceType === 'AWS::Lambda::Function') as lambda.CfnFunction;
      if (targetNode.runtime && this.isValidRuntime(targetNode.runtime)) {
        onEventHandlerRuntime.runtime = lambda.Runtime.NODEJS_20_X.toString();
      }

      //isComplete Handlers
      // Handlers
      const isCompleteHandler = provider.isCompleteHandler as lambda.Function;
      const isCompleteHandlerRuntime = isCompleteHandler.node.children.find((child) => child instanceof cdk.CfnResource && child.cfnResourceType === 'AWS::Lambda::Function') as lambda.CfnFunction;
      if (targetNode.runtime && this.isValidRuntime(targetNode.runtime)) {
        isCompleteHandlerRuntime.runtime = lambda.Runtime.NODEJS_20_X.toString();
      }
    }
  }

  private handleReceiptRuleSet(ruleSet: ReceiptRuleSet): void {
    const functionnode = ruleSet.node.findChild('DropSpam');
    const ses = functionnode.node.findChild('Function') as lambda.CfnFunction;
    if (ses.runtime && this.isValidRuntime(ses.runtime)) {
      ses.addPropertyOverride('Runtime', 'nodejs20.x');
    }
  }

  /**
 *Runtime Validation
 *
 */
  private isValidRuntime(runtime: string) : boolean {
    if (runtime === this.runtime) {
      return true;
    } else {return false;}
  }
}
//}
/**
 * RuntimeAspect
 */
export class RuntimeAspect extends RuntimeAspectsBase {

  /**
   * DEPRECATED: add tags to the node of a construct and all its the taggable children
   *
   * @deprecated use `Tags.of(scope).add()`
   */
  public static add(scope: Construct, key: string) {
    Runtime.of(scope).add(key);
  }

  constructor(key: string) {
    super(key);
  }
}

/**
 * Runtime
 */
export class Runtime {
  /**
   * Returns the runtime API for this scope.
   * @param scope The scope
   */
  public static of(scope: IConstruct): Runtime {
    return new Runtime(scope);
  }

  private constructor(private readonly scope: IConstruct) { }

  /**
   * modify runtime
   */
  public add(key: string) {
    Aspects.of(this.scope).add(new RuntimeAspect(key));
  }

}
