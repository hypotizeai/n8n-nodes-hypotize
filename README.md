# n8n-nodes-hypotize

The [Hypotize](https://hypotize.ai/?utm_source=github&utm_medium=integration) node for [n8n](https://n8n.io/).

Hypotize is the agent-native Growth OS for growth, product and marketing teams: idea backlog, experiment tracker and learning library in one place. Every experiment follows lifecycle rules: it cannot skip a stage or close without a measured result and a written learning.

With this package your workflows can add ideas from forms, Slack or support tickets, move tests through the pipeline, record outcomes from your analytics, and react when a test starts, wins or produces a learning.

[Installation](#installation) · [Operations](#operations) · [Trigger](#trigger) · [Credentials](#credentials) · [Compatibility](#compatibility) · [Usage](#usage) · [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation and install `n8n-nodes-hypotize`.

## Operations

**Experiment**

- Create Idea: add an idea to a project backlog
- Get: one experiment with its scores, variants, outcome and comments
- Get Many: the ideas and tests of a project, filtered by stage, funnel stage, tags or last update
- Update: change the hypothesis, metrics, dates and other fields
- Move to Stage: move a test to another pipeline stage, such as Running or Analyzing
- Record Outcome: record the result, what happened and the learning, and optionally close the test
- Import: import up to 50 existing experiments at any stage in one call

An idea is an experiment in the Idea stage: the ID returned by Create Idea works with every experiment operation.

**Learning**

- Get Many: the results and learnings of closed experiments, most recently updated first

**Comment**

- Create: add a dated comment to an experiment

**Project**

- Get, Get Many: the projects your API key can access, with your role

The node can also be used as a tool by the n8n AI Agent.

## Trigger

The Hypotize Trigger polls a project and starts the workflow when:

- **Experiment Moved to a Stage**: an experiment enters a stage, for example Running or Winning
- **Experiment Created or Updated**: a new idea, or any change to an experiment
- **Learning Recorded or Updated**: an outcome and learning is recorded or changed

On activation the trigger remembers the current state and emits only what changes afterwards. Items come out oldest first.

## Credentials

1. In Hypotize, open Settings, API keys, and create a key.
2. Choose **Read only** to read, or **Read and write** to also create ideas, update experiments and record outcomes.
3. In n8n, create a **Hypotize API** credential and paste the key.

Writes also need the editor or owner role in the project.

## Compatibility

Built and tested with n8n 2.46.

## Usage

**Safe updates.** Update, Move to Stage and Record Outcome send the experiment's `updated_at`. If someone changed the experiment after you read it, the call fails with `STALE_EXPERIMENT` instead of overwriting their change. Leave **Expected Updated At** empty and the node reads the current version first.

**Retries.** Set **Idempotency Key** on writes, for example from the ID of the record that started the workflow. A retry with the same key and data within 24 hours returns the first response and writes nothing new.

**Lifecycle rules.** The API enforces the same rules as the app. A test cannot skip a stage, and it cannot close without a result and a learning. The error message says which rule blocked the call.

**Limits.** 300 requests per minute and 500 writes every 5 minutes per API key.

## Resources

- [Hypotize REST API documentation](https://hypotize.ai/developers?utm_source=github&utm_medium=integration)
- [OpenAPI document](https://api.hypotize.ai/v1/openapi.json)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
