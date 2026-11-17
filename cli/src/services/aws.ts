import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCommand, runStreaming } from '../utils/exec.js';

export interface AwsOptions {
  profile?: string;
  region?: string;
}

export interface CallerIdentity {
  account: string;
  arn: string;
  userId: string;
}

/**
 * Resolve which AWS CLI profile to pass.
 * In CI environments where static AWS env credentials are set without a profile,
 * omit `--profile` unless explicitly overridden or present in ~/.aws/config.
 */
export function buildProfileArgs(profile?: string): string[] {
  if (!profile) return [];
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && !process.env.AWS_PROFILE) {
    return [];
  }
  return ['--profile', profile];
}

export function buildAwsArgs(baseArgs: string[], opts: AwsOptions): string[] {
  const args = [...baseArgs, ...buildProfileArgs(opts.profile)];
  if (opts.region) {
    args.push('--region', opts.region);
  }
  return args;
}

export async function awsJson<T>(baseArgs: string[], opts: AwsOptions): Promise<T> {
  const args = buildAwsArgs([...baseArgs, '--output', 'json'], opts);
  const res = await runCommand('aws', args, { stdio: 'pipe' });
  if (res.code !== 0) {
    throw new Error(res.stderr || res.stdout || `aws ${baseArgs.join(' ')} failed`);
  }
  return JSON.parse(res.stdout) as T;
}

export async function listAwsProfiles(): Promise<string[]> {
  try {
    const res = await runCommand('aws', ['configure', 'list-profiles'], { stdio: 'pipe' });
    if (res.code !== 0 || !res.stdout) return [];
    return res.stdout
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function getCallerIdentity(opts: AwsOptions): Promise<CallerIdentity> {
  const data = await awsJson<{ Account: string; Arn: string; UserId: string }>(
    ['sts', 'get-caller-identity'],
    opts
  );
  return { account: data.Account, arn: data.Arn, userId: data.UserId };
}

export async function isCdkBootstrapped(opts: AwsOptions): Promise<boolean> {
  try {
    const res = await awsJson<{ Stacks: Array<{ StackStatus: string }> }>(
      ['cloudformation', 'describe-stacks', '--stack-name', 'CDKToolkit'],
      opts
    );
    const status = res.Stacks?.[0]?.StackStatus ?? '';
    return status.endsWith('_COMPLETE') && !status.startsWith('DELETE_');
  } catch {
    return false;
  }
}

export async function bootstrapCdk(
  backEndDir: string,
  account: string,
  region: string,
  profile?: string
): Promise<void> {
  const args = ['cdk', 'bootstrap', `aws://${account}/${region}`, ...buildProfileArgs(profile)];
  await runStreaming(process.platform === 'win32' ? 'npx.cmd' : 'npx', args, { cwd: backEndDir });
}

export async function checkSsmParam(name: string, opts: AwsOptions): Promise<boolean> {
  try {
    await awsJson(['ssm', 'get-parameter', '--name', name], opts);
    return true;
  } catch {
    return false;
  }
}

export async function putSsmSecureParam(name: string, value: string, opts: AwsOptions): Promise<void> {
  const args = buildAwsArgs(
    ['ssm', 'put-parameter', '--type', 'SecureString', '--name', name, '--value', value, '--overwrite'],
    opts
  );
  const res = await runCommand('aws', args, { stdio: 'pipe' });
  if (res.code !== 0) {
    throw new Error(res.stderr || res.stdout || `Failed to write SSM parameter ${name}`);
  }
}

export async function findHostedZone(domain: string, opts: AwsOptions): Promise<{ id: string; name: string } | null> {
  const data = await awsJson<{ HostedZones: Array<{ Id: string; Name: string }> }>(
    ['route53', 'list-hosted-zones-by-name', '--dns-name', domain],
    opts
  );
  const normalized = domain.endsWith('.') ? domain : `${domain}.`;
  const match = data.HostedZones?.find(z => z.Name === normalized);
  return match ? { id: match.Id.replace('/hostedzone/', ''), name: match.Name } : null;
}

export async function getSesStatus(opts: AwsOptions): Promise<{ productionAccess: boolean; sendingEnabled: boolean }> {
  const data = await awsJson<{ ProductionAccessEnabled?: boolean; SendingEnabled?: boolean }>(
    ['sesv2', 'get-account'],
    opts
  );
  return {
    productionAccess: Boolean(data.ProductionAccessEnabled),
    sendingEnabled: Boolean(data.SendingEnabled)
  };
}

export async function getStackOutputs(
  stackName: string,
  opts: AwsOptions
): Promise<Record<string, string> | null> {
  try {
    const data = await awsJson<{
      Stacks: Array<{ StackStatus: string; Outputs?: Array<{ OutputKey: string; OutputValue: string }> }>;
    }>(['cloudformation', 'describe-stacks', '--stack-name', stackName], opts);
    const stack = data.Stacks?.[0];
    if (!stack) return null;
    const outputs: Record<string, string> = {};
    for (const out of stack.Outputs ?? []) {
      outputs[out.OutputKey] = out.OutputValue;
    }
    return outputs;
  } catch {
    return null;
  }
}

export async function getStackStatus(stackName: string, opts: AwsOptions): Promise<string | null> {
  try {
    const data = await awsJson<{ Stacks: Array<{ StackStatus: string }> }>(
      ['cloudformation', 'describe-stacks', '--stack-name', stackName],
      opts
    );
    return data.Stacks?.[0]?.StackStatus ?? null;
  } catch {
    return null;
  }
}

export async function findFrontEndDistributionFallback(
  domain: string,
  opts: AwsOptions
): Promise<{ distributionId: string; bucketName: string } | null> {
  const list = await awsJson<{
    DistributionList?: {
      Items?: Array<{
        Id: string;
        Aliases?: { Items?: string[] };
        Origins?: { Items?: Array<{ DomainName: string }> };
      }>;
    };
  }>(['cloudfront', 'list-distributions'], opts);

  const match = list.DistributionList?.Items?.find(d => d.Aliases?.Items?.includes(domain));
  if (!match) return null;

  const originDomain = match.Origins?.Items?.[0]?.DomainName;
  if (!originDomain) return null;

  return {
    distributionId: match.Id,
    bucketName: originDomain.split('.')[0]
  };
}

export async function resolveApiLogGroup(
  project: string,
  stage: string,
  fnName: string | undefined,
  opts: AwsOptions
): Promise<string | null> {
  const stackName = `${project}-${stage}-api`;

  if (fnName) {
    try {
      const fnConfig = await awsJson<{ LoggingConfig?: { LogGroup?: string } }>(
        ['lambda', 'get-function-configuration', '--function-name', `${project}_${stage}_${fnName}`],
        opts
      );
      if (fnConfig.LoggingConfig?.LogGroup) {
        return fnConfig.LoggingConfig.LogGroup;
      }
    } catch {
      // Fallback to stack resources lookup below
    }
  }

  try {
    const res = await awsJson<{
      StackResources: Array<{ ResourceType: string; LogicalResourceId: string; PhysicalResourceId?: string }>;
    }>(['cloudformation', 'describe-stack-resources', '--stack-name', stackName], opts);
    const logGroup = res.StackResources?.find(r => r.ResourceType === 'AWS::Logs::LogGroup');
    if (logGroup?.PhysicalResourceId) {
      return logGroup.PhysicalResourceId;
    }
  } catch {
    // Ignore if stack doesn't exist
  }

  return fnName ? `/aws/lambda/${project}_${stage}_${fnName}` : null;
}

export async function listApiLambdaFunctions(
  project: string,
  stage: string,
  opts: AwsOptions
): Promise<string[]> {
  try {
    const res = await awsJson<{
      StackResources: Array<{ ResourceType: string; PhysicalResourceId?: string }>;
    }>(['cloudformation', 'describe-stack-resources', '--stack-name', `${project}-${stage}-api`], opts);
    const prefix = `${project}_${stage}_`;
    return (res.StackResources ?? [])
      .filter(r => r.ResourceType === 'AWS::Lambda::Function' && r.PhysicalResourceId?.startsWith(prefix))
      .map(r => r.PhysicalResourceId!.slice(prefix.length))
      .sort();
  } catch {
    return [];
  }
}

export interface AcmValidationRecord {
  domainName: string;
  validationStatus?: string;
  recordName?: string;
  recordType?: string;
  recordValue?: string;
}

export interface AcmCertificateDetail {
  certificateArn: string;
  domainName: string;
  subjectAlternativeNames: string[];
  status: string;
  validationOptions: AcmValidationRecord[];
}

export async function getCloudFrontDistributionDomain(
  distributionId: string,
  opts: AwsOptions
): Promise<string | null> {
  try {
    const data = await awsJson<{ Distribution?: { DomainName?: string } }>(
      ['cloudfront', 'get-distribution', '--id', distributionId],
      opts
    );
    return data.Distribution?.DomainName ?? null;
  } catch {
    return null;
  }
}

export async function findFrontEndDistributionDomain(
  project: string,
  stage: string,
  stageDomain: string,
  opts: AwsOptions
): Promise<{ distributionId: string; domainName: string } | null> {
  const outputs = await getStackOutputs(`${project}-${stage}-front-end`, opts);
  let distributionId = outputs?.CloudFrontDistributionID;
  if (!distributionId) {
    const fallback = await findFrontEndDistributionFallback(stageDomain, opts);
    distributionId = fallback?.distributionId;
  }
  if (!distributionId) return null;

  const domainName = await getCloudFrontDistributionDomain(distributionId, opts);
  return domainName ? { distributionId, domainName } : null;
}

export async function requestAcmCertificateUsEast1(
  domainName: string,
  subjectAlternativeNames: string[],
  opts: AwsOptions
): Promise<string> {
  const extraSans = subjectAlternativeNames.filter(d => d !== domainName);
  const args = [
    'acm',
    'request-certificate',
    '--validation-method',
    'DNS',
    '--domain-name',
    domainName,
    ...(extraSans.length > 0 ? ['--subject-alternative-names', ...extraSans] : [])
  ];
  const data = await awsJson<{ CertificateArn: string }>(args, { ...opts, region: 'us-east-1' });
  return data.CertificateArn;
}

export async function describeAcmCertificateUsEast1(
  certificateArn: string,
  opts: AwsOptions
): Promise<AcmCertificateDetail> {
  const data = await awsJson<{
    Certificate: {
      CertificateArn: string;
      DomainName: string;
      SubjectAlternativeNames?: string[];
      Status: string;
      DomainValidationOptions?: Array<{
        DomainName: string;
        ValidationStatus?: string;
        ResourceRecord?: { Name: string; Type: string; Value: string };
      }>;
    };
  }>(['acm', 'describe-certificate', '--certificate-arn', certificateArn], { ...opts, region: 'us-east-1' });

  const cert = data.Certificate;
  return {
    certificateArn: cert.CertificateArn,
    domainName: cert.DomainName,
    subjectAlternativeNames: cert.SubjectAlternativeNames ?? [],
    status: cert.Status,
    validationOptions: (cert.DomainValidationOptions ?? []).map(opt => ({
      domainName: opt.DomainName,
      validationStatus: opt.ValidationStatus,
      recordName: opt.ResourceRecord?.Name,
      recordType: opt.ResourceRecord?.Type,
      recordValue: opt.ResourceRecord?.Value
    }))
  };
}

export async function waitForAcmValidationRecords(
  certificateArn: string,
  opts: AwsOptions,
  timeoutMs = 20000
): Promise<AcmCertificateDetail> {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const detail = await describeAcmCertificateUsEast1(certificateArn, opts);
    const allReady =
      detail.validationOptions.length > 0 &&
      detail.validationOptions.every(v => v.recordName && v.recordValue);
    if (allReady || Date.now() >= deadline) {
      return detail;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

export async function upsertRoute53Cname(
  hostedZoneId: string,
  recordName: string,
  recordValue: string,
  opts: AwsOptions
): Promise<void> {
  const changeBatch = {
    Comment: 'Managed by ga-app CLI for ACM DNS validation',
    Changes: [
      {
        Action: 'UPSERT',
        ResourceRecordSet: {
          Name: recordName,
          Type: 'CNAME',
          TTL: 300,
          ResourceRecords: [{ Value: recordValue }]
        }
      }
    ]
  };

  const tmpFile = path.join(os.tmpdir(), `ga-app-r53-${Date.now()}.json`);
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(changeBatch), 'utf8');
    const args = buildAwsArgs(
      ['route53', 'change-resource-record-sets', '--hosted-zone-id', hostedZoneId, '--change-batch', `file://${tmpFile}`],
      opts
    );
    const res = await runCommand('aws', args, { stdio: 'pipe' });
    if (res.code !== 0) {
      throw new Error(res.stderr || res.stdout || 'Route 53 change-resource-record-sets failed');
    }
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
}
