# Wayfinder map

Canonical map:
[定义 Cordis 客户端基座、client/remote 插件体系与实现路线](https://github.com/isning/mygo-int/issues/1).

This map is complete. The user confirmed the project definition and implementation
route. All child tickets are closed, including the detailed product-workflow ticket
closed as out of scope. Planning did not authorize implementation. Use the confirmed
[route](../design/implementation-dependency-plan.md) when implementation is requested.

The destination is a cross-platform Cordis client architecture and dependency-based
implementation plan, starting with a near-total reuse/extraction of DSH's React client
and a compatible client/remote plugin system. Independent detailed product features
are not the focus. There is no MVP/release scope division. Wayfinding still does not
authorize implementing the application or running experiments.

The user has requested continuous progress, overriding wayfinder's usual one-human-
ticket-per-session stopping point. Continue through available decisions when their
answers are established. Real human-in-the-loop choices still require the user's
answers; do not silently resolve them to keep moving.

Read the current map before choosing work. Enumerate native child issues and select
the first open, unassigned child whose native blockers are all closed. Claim it as
`isning` before working. Do not choose a blocked ticket simply because its question
is interesting. Every human-facing reference uses the issue's title as link text.

Use the repo's [Wayfinding operations](issue-tracker.md#wayfinding-operations).
For the current map, a read-only GraphQL query is:

```graphql
query {
  repository(owner: "isning", name: "mygo-int") {
    issue(number: 1) {
      title
      url
      subIssues(first: 100) {
        pageInfo { hasNextPage endCursor }
        nodes {
          title
          url
          state
          assignees(first: 10) { totalCount }
          blockedBy(first: 100) {
            pageInfo { hasNextPage endCursor }
            nodes { title url state }
          }
        }
      }
    }
  }
}
```

Use `gh api graphql` to execute it. If a connection has another page, paginate it
before declaring a ticket unblocked. Preserve the map's child order.

Research branches are local unless explicitly published. A resolution comment must
identify the asset path, local branch and commit, and disclose the unpublished status.
Do not invent an accessible GitHub blob link. Future publishing requires separate
authorization; issue operations authorized by wayfinder are not a git-push grant.
