# How to (re)create the app environment

Hello, there! This is a guide to deploy the app on a new environment; it only takes about one hour, and it's almost
fully-automated.

**The back-end is implemented on AWS** ([Amazon Web Services](https://aws.amazon.com/)) resources. _Note: you don't need
to have particular knowledge on AWS to complete this walkthrough._

If you're following this guide to implement the tool for a National Organization, you may want to use
[this email template](https://docs.google.com/document/d/1o9HHcC_hKjlFrVs9g53jh_VfJwZaNsg7qnL7tT-Hzug/edit#heading=h.3c135plyvtua).

## Prerequisites

### Set up the AWS Account

1. Choose an AWS account you own, or [create a new one](https://aws.amazon.com/getting-started/). **Make sure to link a
   valid credit card** to avoid issues later on.
2. **Set up DNS in Route 53 (Choose Option A or Option B)**:
    - **Option A (Recommended): Subdomain Delegation via NS Records No domain purchase needed**:

      If your National Organization already owns a domain (e.g. `esn.org`), you can delegate a dedicated subdomain (e.g.
      `ga.esn.org`) to AWS Route 53:
        1. Open the [Route 53 Console](https://console.aws.amazon.com/route53/) and create a new **Public Hosted Zone**
           with your chosen subdomain as the domain name (e.g. `ga.esncy.org`).
        2. Once created, note the 4 **Name Server (NS)** addresses assigned to your zone (e.g. `ns-xxx.awsdns-xx.org`).
        3. Go to your existing DNS provider (where your parent domain is managed, e.g. Cloudflare, Namecheap, cPanel)
           and add **NS records** for that subdomain pointing to those 4 Route 53 name servers.
        4. That's it! Route 53 is now authorised to manage all DNS records and SSL certificates for that subdomain and
           all child records (`api.*`, `dev.*`, `media.*`, `socket.*`).
    - **Option B: Purchase a new domain directly in Route 53**:

      If you don't have an existing domain or prefer a separate standalone domain, you can
      [purchase a new domain name](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html)
      directly inside Route 53 (e.g. `esn-ga.link`). The operation takes approximately 30 minutes and automatically
      creates the Public Hosted Zone in Route 53. _Note: for a domain like `esn-ga.link` purchased through Route 53, it
      costs around $5/year._
3. Identify an [IAM user](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html)
   ([or create a new one](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html) — [here's a small video guide](https://drive.google.com/file/d/1Ko_F91PczCZwQCIMeLk7YJx5J8qDNtaJ/view?usp=drive_link));
   then, [create a new set of access keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html):
   these will be later on saved in your computer (in a profile) and used to access and manage AWS cloud resources.
4. Identify one [AWS region](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/) to use, i.e. where all
   your cloud resources will be deployed. Suggested regions — since they are close and support all the cloud resources
   that we use in the project: **Frankfurt** (`eu-central-1`) or **Ireland** (`eu-west-1`).

### Set up your local computer

1. Any modern OS (**macOS**, **Linux**, or **Windows**) works. We're going to be using a cross-platform CLI.
2. Install the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html).
3. Open your terminal (command prompt) and [configure a **named
   profile**](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) with the credentials (access
   keys) linked to your AWS account. You can choose any name for your profile, but make sure to use it consistently
   later on.

   ```sh
   aws configure --profile {AWS_PROFILE}

   # example:
   aws configure --profile esn-assembly-cuba
   # AWS Access Key ID [None]: {YOUR_ACCESS_KEY_ID}
   # AWS Secret Access Key [None]: {YOUR_ACCESS_KEY_SECRET}
   # Default region name [None]: eu-central-1
   # Default output format [None]: json
   ```

4. Install [Node.js](https://nodejs.org/en/) (v24 or newer). The app and CLI are built on TypeScript and Node.js.
5. Install the [AWS Cloud Development Kit (CDK)](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
   and [Angular CLI](https://angular.io/guide/setup-local#install-the-angular-cli) / [Ionic CLI](https://ionicframework.com/docs/cli)
   (optional globally, as project dependencies include them).

## Deployment

The suggested IDEs are [Visual Studio Code](https://code.visualstudio.com/) or a **JetBrains IDE** (such as
[WebStorm](https://www.jetbrains.com/webstorm/) or [PhpStorm](https://www.jetbrains.com/phpstorm/)); we included
handy shortcuts and pre-configured run configurations for both.

1. Fork the [repository on GitHub](https://github.com/uatisdeproblem/esn-assembly) (or create a new branch from the
   `main` one) and download the project's files.
2. Open the project folder in the IDE and install the CLI dependencies (optionally linking `ga-app` globally):
   ```sh
   cd cli
   npm install
   # optional: link `ga-app` globally so you can run `ga-app` instead of `node cli`
   npm link
   ```
3. Run the interactive setup wizard from the repository root:
   ```sh
   node cli setup
   # or, if linked globally:
   ga-app setup
   ```
   The wizard will guide you through:
    - Choosing your `project` codename (lowercase letters, numbers, and dashes only — e.g. `esn-assembly-cuba`),
    - Setting your base Route 53 Hosted Zone `domain` (e.g. `ga.esn.org` or `esn-ga.link`),
    - Configuring your AWS region, AWS CLI profile (optionally stored in the gitignored `ga-app.local.json` override),
      and deployment stages (`prod` and `dev`),
    - Installing `back-end` and `front-end` npm dependencies,
    - Running `cdk bootstrap` on your AWS account/region if needed, and
    - Creating the `/<project>/auth` `SecureString` parameter in AWS Systems Manager Parameter Store.

   All shared project configuration is saved to a single centralised file at the repository root: [
   `ga-app.config.json`](/ga-app.config.json) (with IDE schema validation from [
   `ga-app.config.schema.json`](/ga-app.config.schema.json)). Personal local overrides (such as your local
   `aws.profile`) can go into a gitignored `ga-app.local.json` file.

4. Run the preflight diagnostics check before your first deployment:
   ```sh
   node cli doctor
   ```
5. Deploy your back-end and release your front-end using the interactive CLI or your IDE:
    - **Interactive CLI**:
      ```sh
      node cli
      ```
      Or directly by command (replace `node cli` with `ga-app` if you ran `npm link`):
      ```sh
      node cli deploy backend --stage dev
      node cli deploy frontend --stage dev
      ```
    - **Visual Studio Code**:
        1. Open "Terminal > Run build task" (`Ctrl+Shift+B` / `Cmd+Shift+B`), select **"Deploy a back-end
           environment"**, and pick your stage (`dev` or `prod`).
        2. Open "Terminal > Run build task", select **"Release a front-end environment"**, and pick the target stage.
    - **JetBrains IDEs (WebStorm / PhpStorm)**:
        1. Open the Run/Debug configurations dropdown in the top toolbar.
        2. Select **`Deploy Back-end Dev`** (or `Deploy Back-end Prod`) and click Run (`▶`).
        3. Select **`Release Front-end Dev`** (or `Release Front-end Prod`) and click Run (`▶`). *(These run
           configurations are pre-defined in the `.run` folder of the repository).*
    - **Note on local front-end development**: When running the front-end locally (`cd front-end && npm start`), it
      targets `prod` by default; run `npx ng serve --configuration=dev` to target the `dev` back-end stage.
6. Feel free to commit `ga-app.config.json` (and any code changes) in your forked GitHub repository (or branch).
   _Please, if you make any changes to the source code, commit them so that other NOs can take advantage of your
   improvements._
7. **Note well.** The first user to access a given app environment will automatically be administrator.
8. Some internal features require sending email messages (login codes, voting links, notifications). New AWS accounts
   place [Amazon SES](https://aws.amazon.com/ses/) in the **sandbox** by default, allowing emails only to verified
   addresses.

   To send emails to your users, you need to request **Production Access** in the AWS SES Console:

    1. Open the [Amazon SES Console](https://console.aws.amazon.com/ses/) in your deployment region (e.g.,
       `eu-central-1` or `eu-west-1`).
    2. In the left navigation pane, select **Account dashboard**.
    3. In the sandbox banner at the top, click **Request production access** (or **Edit account details**).
    4. Fill out the request form:
        - **Mail type**: Choose `Transactional`.
        - **Website URL**: `https://{DOMAIN}` (e.g. `https://ga.esn.org`).
        - **How do you plan to build or acquire your mailing list?**:
          > "Recipients are registered members and volunteers of our National Organization attending the General
          > Assembly. Email addresses are added by administrators or entered directly by users requesting one-time login
          > links."
        - **How will you handle bounces and complaints?**:
          > "We only send transactional emails to active, internal organisation members. The application uses an SNS
          > notification topic and automated bounce-handling mechanism to flag invalid addresses immediately."
        - **How do recipients opt-in, and how can they opt out?**:
          > *"Emails are strictly transactional (authentication tokens, voting notifications, and application alerts).
          > They are directly initiated by user actions or general assembly processes."*
        - **Use case description**:
          > "We are hosting an internal General Assembly web application for our non-profit student volunteer
          > organisation. Amazon SES is used strictly for transactional emails: sending magic login links, voting
          > verification codes, and assembly notifications to our verified members. No marketing or bulk emails are
          > sent."
        - **Additional contact email addresses**: Enter your contact email address.
    5. Acknowledge the terms and submit. AWS Trust & Safety usually reviews and approves the request within 24–48 hours.

## Deploying new changes

### Automated Deployment (CI/CD via GitHub Actions)

Once your initial AWS setup, DNS delegation, and CDK bootstrap are completed, deployments can be fully automated using
GitHub Actions (`.github/workflows/deploy.yml`).

#### 1. Configure Repository Secrets

In your GitHub repository, navigate to **Settings > Secrets and variables > Actions** and add:

- `AWS_ACCESS_KEY_ID`: Your AWS IAM access key ID.
- `AWS_SECRET_ACCESS_KEY`: Your AWS IAM secret access key.
- `AWS_REGION`: (Optional) Your target AWS region (defaults to `eu-central-1` if omitted).
- `GITLAB_SYNC_TOKEN`: (Optional) Personal access token if using the GitLab mirror workflow (`gitlab-mirror.yml`).

#### 2. Deployment Triggers

The CI/CD pipeline supports three deployment flows:

* **Development (`dev`)**: Any push or merge into the `main` branch automatically runs linting and unit tests, and
  deploys modified components (`back-end` and/or `front-end` based on path changes) to the `dev` stage.
* **Production (`prod`)**: Pushing a release version tag triggers a complete deployment of both back-end and front-end
  to production:
  ```sh
  git tag v1.11.4
  git push origin v1.11.4
  ```
* **Manual Deployment (Workflow Dispatch)**: From your GitHub repository, go to the **Actions** tab, select **Deploy**,
  click **Run workflow**, choose the target environment (`dev` or `prod`), and toggle whether to deploy the backend,
  frontend, or both.

### Manual Deployment (Local / IDE)

If you prefer to deploy manually from your local machine instead of CI/CD:

- **In Visual Studio Code**: Run "Terminal > Run build task" (keyboard shortcut: `Ctrl+Shift+B` / `Cmd+Shift+B`), select
  whether you want to deploy the back-end environment or release the front-end environment, and pick the desired target
  stage.
- **In JetBrains IDEs (WebStorm / IntelliJ IDEA)**: Select the desired task from the top toolbar Run configuration
  dropdown (e.g. `Deploy Back-end Dev`, `Release Front-end Dev`, etc.) and click Run (`▶`).
- **Via Command Line (`node cli` or `ga-app` if globally linked)**:
    - Interactive menu: `node cli`
    - Back-end: `node cli deploy backend --stage [dev|prod]`
    - Quick Lambda hotswap: `node cli deploy quick --stage dev`
    - Front-end: `node cli deploy frontend --stage [dev|prod]`
    - Custom domains & ACM certs: `node cli domain`
    - Diagnostics: `node cli doctor`
    - CloudWatch logs: `node cli logs --stage [dev|prod]`

## Post-installation: Custom (Alternative) Domain

If you want your production environment to also be reachable at an additional custom domain (e.g. `assembly.esn.org`)
alongside your Route 53 domain, use the CLI's `domain` command.

If you're following this guide on behalf of another National Organization, you may want to use
[this email template](https://docs.google.com/document/d/1o9HHcC_hKjlFrVs9g53jh_VfJwZaNsg7qnL7tT-Hzug/edit#heading=h.9jlqqqv3bhun).

1. Run the custom domain wizard from the repository root (replace `node cli` with `ga-app` if linked globally):

   ```sh
   node cli domain add assembly.esn.org --stage prod
   ```

   The CLI will automatically:
    - Request (or reuse) a `us-east-1` ACM certificate covering `{DOMAIN}`, `*.{DOMAIN}`, and your custom domain,
    - Offer to create the Route 53 validation CNAME record for `{DOMAIN}` automatically,
    - Print the exact **ACM validation CNAME** and **CloudFront routing CNAME** (`zzzzzzzzz.cloudfront.net`) to add in
      your custom domain's DNS,
    - Save `frontEndCertificateARN` and `stages.<stage>.alternativeDomains` in [
      `ga-app.config.json`](/ga-app.config.json),
    - Optionally wait until the certificate becomes `ISSUED` and deploy the back-end for you.

2. Check certificate validation status or view the required CNAME records anytime:

   ```sh
   node cli domain status
   ```

3. Once the ACM certificate is `ISSUED` (if you didn't deploy during step 1), deploy the back-end so CloudFront picks
   up the certificate and alias:

   ```sh
   node cli deploy backend --stage prod
   ```

4. To remove an alternative domain later:

   ```sh
   node cli domain remove assembly.esn.it --stage prod
   ```

[Learn more in the CONTRIBUTING doc](/CONTRIBUTING.md).