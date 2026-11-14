# How to (re)create the app environment

Hello, there! This is a guide to deploy the app on a new environment; it only takes about one hour, and it's almost
fully-automated.

**The back-end is implemented on AWS** ([Amazon Web Services](https://aws.amazon.com/)) resources. _Note: you don't need
to have particular knowledge on AWS to complete this walkthrough._

If you're following this guide to implement the tool for a National Organization, you may want to use
[this email template](https://docs.google.com/document/d/1o9HHcC_hKjlFrVs9g53jh_VfJwZaNsg7qnL7tT-Hzug/edit#heading=h.3c135plyvtua).

## Pre-requirements

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

1. Ideally, you are running these instructions from a Mac (macOS) or Linux computer; if you're using a Windows
   PC, [make sure you can run shell script files (.sh)](https://superuser.com/questions/120045/how-to-execute-sh-file-on-windows).
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

4. Install [Node.js](https://nodejs.org/en/). The app is built on TypeScript and Node.js, so it's a mandatory
   development tool.
5. Install the [AWS Cloud Development Kit (CDK)](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html); this
   Infrastructure as Code (IaC) toolkit will deploy the app environment for us.
6. Install the CLI of [Angular](https://angular.io/guide/setup-local#install-the-angular-cli)
   and [Ionic](https://ionicframework.com/docs/cli); they are our development frameworks, and we need them to compile
   our project's code.

## Deployment

The suggested IDEs are [Visual Studio Code](https://code.visualstudio.com/) or a **JetBrains IDE** (such as
[WebStorm](https://www.jetbrains.com/webstorm/) or [PhpStorm](https://www.jetbrains.com/phpstorm/)); we included
handy shortcuts and pre-configured run configurations for both.

1. Open the terminal (command prompt) and [boostrap CDK](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) in
   the account/region identified by running:

   ```sh
   cdk bootstrap aws://{AWS_ACCOUNT_ID}/{AWS_REGION} --profile {AWS_PROFILE}
   ```

2. Fork the [repository on GitHub](https://github.com/uatisdeproblem/esn-assembly) (or create a new branch from the
   `main` one) and download the project's files.
3. Open the project folder in the IDE.
4. Make sure you have installed the project's libraries and dependencies by running in the terminal, from project's
   root:
   ```sh
   cd back-end
   npm install
   cd ../front-end
   npm install
   ```
5. Identify the file `/back-end/deploy/environments.ts` and fix the configuration with your values; explanation:
    - `PROJECT`: choose a key to identify the project and its resources. **Try not to use a key too simple, to avoid
      naming-overlapping on global resources**. An optimal name would be something like: _esn-assembly-cuba_. **Please
      use only lower case letters and dashes to avoid incompatibility issues later on.**
    - `DOMAIN`: the domain name of your Route 53 Public Hosted Zone. This can be a delegated subdomain (e.g.
      _ga.esn.org_) or a purchased apex domain (e.g. _esn-ga.link_).
6. Configure the following two deploy scripts, by setting the necessary variables:
    - `/back-end/deploy.sh`:
        - `AWS_PROFILE`.
        - `PROJECT`.
    - `/front-end/release.sh`; note: this script supports out-of-the-box two environments: _dev_ and _prod_:
        - `AWS_PROFILE`.
        - `DOMAIN_PROD`: e.g. _esn-assembly-cuba.link_
        - `DOMAIN_DEV`: e.g. _dev.esn-assembly-cuba.link_

7. Create a random secure string (`{VALUE}`) that the app will use to create authentication tokens. Note: `{PROJECT}`
   must be the same one just set above.
   ```
   aws ssm put-parameter --profile {AWS_PROFILE} --type "SecureString" --name "/{PROJECT}/auth" --value "{VALUE}"
   ```
8. You can create as many environments (stages) as you like; a common (the default) configuration includes _prod_ and
   _dev_ stages. **Repeat this step for each of the desired stages**. From the terminal, make sure to be in the
   `/back-end` folder of the project, substitute the `{STAGE}` variable (based on the stage/environment you want to
   deploy) and run:
   ```sh
   cdk deploy --profile {AWS_PROFILE} --context stage={STAGE} --all --require-approval never
   ```
9. _...it will take some time!_ If prompted, confirm all the requests to create new resources.
10. Deploy and release your application stages using your IDE:
    - **Visual Studio Code**:
        1. Open "Terminal > Run build task" (or `Ctrl+Shift+B` / `Cmd+Shift+B`), select **"Deploy a back-end
           environment"**, and pick your stage (e.g. `dev` or `prod`).
        2. Open "Terminal > Run build task", select **"Release a front-end environment"**, and pick the target stage.
    - **JetBrains IDEs (WebStorm / PhpStorm)**:
        1. Open the Run/Debug configurations dropdown in the top toolbar.
        2. Select **`Deploy Back-end Dev`** (or `Deploy Back-end Prod`) and click the Run button (`▶`).
        3. Select **`Release Front-end Dev`** (or `Release Front-end Prod`) and click Run (`▶`). *(These run
           configurations are pre-defined in the `.run` folder of the repository).*
    - **Note on stages**: Since the app supports development and production back-end (API) stages, **you need to decide
      which stage to target when running or releasing the front-end**. In
      `/front-end/src/environments/environment.idea.ts` you can switch between `"dev"` and `"prod"` with the variable
      `STAGE`. The _dev_ and _prod_ environments have separate databases; if you are releasing the development
      front-end, you should target the development back-end by setting `STAGE = 'dev'`.
11. Feel free to commit the few changed files in the forked GitHub repository (or branch). _Please, if you make any
    changes to the source code, commit them to the forked repository (or branch) so that other NOs can take advantage of
    your improvements._
12. **Note well.** The first user to access a given app environment will automatically be administrator.
13. Some internal features require sending email messages (login codes, voting links, notifications). New AWS accounts
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
  git tag v1.11.3
  git push origin v1.11.3
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
- **Via Command Line**:
    - Back-end: `cd back-end && ./deploy.sh [dev|prod]`
    - Front-end: `cd front-end && ./release.sh [dev|prod]`

[Learn more in the CONTRIBUTING doc](/CONTRIBUTING.md).